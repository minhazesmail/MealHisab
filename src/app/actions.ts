'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
const mealSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), date: dateSchema,
  mealType: z.enum(['lunch', 'dinner', 'extra']), count: z.number().int().min(0).max(100),
})
const expenseSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), amount: z.number().positive(),
  category: z.enum(['grocery', 'cook_salary', 'gas', 'other']), note: z.string().max(500).optional(),
})
const contributionSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), amount: z.number().positive(),
  note: z.string().max(500).optional(),
})

async function currentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

async function assertOpenCycle(supabase: Awaited<ReturnType<typeof createClient>>, flatId: string, cycleId: string) {
  const { data: cycle, error } = await supabase.from('cycles').select('id,flat_id,start_date,end_date,status').eq('id', cycleId).eq('flat_id', flatId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!cycle) throw new Error('Cycle not found')
  if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  return cycle
}

export async function createFlat(input: { name: string; address?: string; monthStartDay: number; mealPolicy: 'opt_in' | 'opt_out' }) {
  const data = z.object({ name: z.string().trim().min(2).max(100), address: z.string().trim().max(200).optional(), monthStartDay: z.number().int().min(1).max(28), mealPolicy: z.enum(['opt_in', 'opt_out']) }).parse(input)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('create_flat', { p_name: data.name, p_address: data.address || null, p_month_start_day: data.monthStartDay, p_meal_policy: data.mealPolicy })
  if (error) throw new Error(error.message)
  revalidatePath('/onboarding'); revalidatePath('/dashboard')
}

export async function joinFlat(inviteCode: string) {
  const code = z.string().trim().min(6).max(16).parse(inviteCode)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('join_flat', { p_invite_code: code })
  if (error) throw new Error(error.message)
  revalidatePath('/onboarding'); revalidatePath('/dashboard')
}

export async function saveMeal(input: unknown) {
  const data = mealSchema.parse(input)
  const { supabase, user } = await currentUser()
  const cycle = await assertOpenCycle(supabase, data.flatId, data.cycleId)
  if (data.userId !== user.id) {
    const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('You can only edit your own meals')
  }
  if (data.date < cycle.start_date || data.date > cycle.end_date) throw new Error('Meal date is outside the current cycle')
  const { error } = await supabase.from('meal_logs').upsert({ ...data, created_by: user.id }, { onConflict: 'flat_id,user_id,date,meal_type' })
  if (error) throw new Error(error.message)
  revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/reports')
}

export async function saveExpense(input: unknown) {
  const data = expenseSchema.parse(input)
  const { supabase, user } = await currentUser()
  const cycle = await assertOpenCycle(supabase, data.flatId, data.cycleId)
  const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can add expenses')
  if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  const { error } = await supabase.from('expenses').insert({ ...data, created_by: user.id, note: data.note?.trim() || null })
  if (error) throw new Error(error.message)
  revalidatePath('/expenses'); revalidatePath('/dashboard'); revalidatePath('/reports')
}

export async function saveContribution(input: unknown) {
  const data = contributionSchema.parse(input)
  const { supabase, user } = await currentUser()
  await assertOpenCycle(supabase, data.flatId, data.cycleId)
  if (data.userId !== user.id) {
    const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can record a contribution for another member')
  }
  const { error } = await supabase.from('contributions').insert({ ...data, created_by: user.id, note: data.note?.trim() || null })
  if (error) throw new Error(error.message)
  revalidatePath('/contributions'); revalidatePath('/dashboard'); revalidatePath('/reports')
}

export async function closeCycle(cycleId: string) {
  const id = z.string().uuid().parse(cycleId)
  const { supabase, user } = await currentUser()
  const { data: cycle } = await supabase.from('cycles').select('flat_id,status').eq('id', id).maybeSingle()
  if (!cycle) throw new Error('Cycle not found')
  const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', cycle.flat_id).eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can close a cycle')
  if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  const { error } = await supabase.rpc('close_cycle', { p_cycle_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard'); revalidatePath('/reports'); revalidatePath('/meals'); revalidatePath('/expenses'); revalidatePath('/contributions'); revalidatePath('/settings'); revalidatePath('/settlements')
}

export async function leaveFlat(flatId: string) {
  const id = z.string().uuid().parse(flatId)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('leave_flat', { p_flat_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/settings'); revalidatePath('/dashboard'); revalidatePath('/settlements')
}

export async function setCycleClosedDay(input: { cycleId: string; date: string; reason?: string }) {
  const data = z.object({ cycleId: z.string().uuid(), date: dateSchema, reason: z.string().trim().max(200).optional() }).parse(input)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('set_cycle_closed_day', { p_cycle_id: data.cycleId, p_date: data.date, p_reason: data.reason || 'Mess closed' })
  if (error) throw new Error(error.message)
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard')
}

export async function removeCycleClosedDay(input: { cycleId: string; date: string }) {
  const data = z.object({ cycleId: z.string().uuid(), date: dateSchema }).parse(input)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('remove_cycle_closed_day', { p_cycle_id: data.cycleId, p_date: data.date })
  if (error) throw new Error(error.message)
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard')
}

export async function recordSettlementPayment(input: { settlementId: string; amount: number; note?: string }) {
  const data = z.object({ settlementId: z.string().uuid(), amount: z.number().positive().max(10000000), note: z.string().trim().max(500).optional() }).parse(input)
  const { supabase } = await currentUser()
  const { error } = await supabase.rpc('record_settlement_payment', { p_settlement_id: data.settlementId, p_amount: Math.round(data.amount * 100) / 100, p_note: data.note || null })
  if (error) throw new Error(error.message)
  revalidatePath('/settlements'); revalidatePath('/reports'); revalidatePath('/dashboard')
}

export async function markNotificationRead(id: string) {
  const { supabase } = await currentUser()
  const parsedId = z.string().uuid().parse(id)
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', parsedId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
