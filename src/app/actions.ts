'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { autoAssignCycleDate, todayInDhaka } from '@/lib/dates'
import { enforceIpRateLimit, enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
const mealSchema = z.object({ flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), date: dateSchema.optional(), mealType: z.enum(['lunch', 'dinner', 'extra']), count: z.number().int().min(0).max(100) })
const expenseSchema = z.object({ flatId: z.string().uuid(), cycleId: z.string().uuid(), amount: z.number().positive(), category: z.enum(['grocery', 'cook_salary', 'gas', 'other']), note: z.string().max(500).optional(), date: dateSchema.optional() })
const contributionSchema = z.object({ flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), amount: z.number().positive(), note: z.string().max(500).optional(), date: dateSchema.optional() })

type CycleCloseWarning = { warning: boolean; meal_policy: 'opt_in' | 'opt_out'; total_meals: number; grocery_total: number; sample_days: Array<{ date: string; meals: number }> }

async function currentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

async function assertOpenCycle(supabase: Awaited<ReturnType<typeof createClient>>, flatId: string, cycleId: string) {
  const { data: cycle, error } = await supabase.from('cycles').select('id,flat_id,start_date,end_date,status').eq('id', cycleId).eq('flat_id', flatId).maybeSingle()
  if (error) throw extractDbError(error, 'assertOpenCycle')
  if (!cycle) throw new Error('Cycle not found')
  if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  return cycle
}

export async function createFlat(input: { name: string; address?: string; monthStartDay: number; mealPolicy: 'opt_in' | 'opt_out' }) {
  const data = z.object({ name: z.string().trim().min(2).max(100), address: z.string().trim().max(200).optional(), monthStartDay: z.number().int().min(1).max(28), mealPolicy: z.enum(['opt_in', 'opt_out']) }).parse(input)
  const { supabase, user } = await currentUser(); await enforceRateLimit('createFlat', user.id)
  const { error } = await supabase.rpc('create_flat', { p_name: data.name, p_address: data.address || null, p_month_start_day: data.monthStartDay, p_meal_policy: data.mealPolicy })
  if (error) throw extractDbError(error, 'createFlat')
  revalidatePath('/onboarding'); revalidatePath('/dashboard')
}

export async function joinFlat(inviteCode: string) {
  const code = z.string().trim().min(6).max(16).parse(inviteCode); await enforceIpRateLimit('joinFlat')
  const { supabase } = await currentUser(); const { error } = await supabase.rpc('join_flat', { p_invite_code: code })
  if (error) throw extractDbError(error, 'joinFlat')
  revalidatePath('/onboarding'); revalidatePath('/dashboard')
}

export async function saveMeal(input: unknown) {
  const data = mealSchema.parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('saveMeal', user.id)
  const cycle = await assertOpenCycle(supabase, data.flatId, data.cycleId)
  if (data.userId !== user.id) {
    const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('You can only edit your own meals')
  }
  const date = autoAssignCycleDate(cycle.start_date, cycle.end_date, data.date)
  const { error } = await supabase.from('meal_logs').upsert({ flat_id: data.flatId, cycle_id: data.cycleId, user_id: data.userId, date, meal_type: data.mealType, count: data.count, created_by: user.id }, { onConflict: 'flat_id,user_id,date,meal_type' })
  if (error) throw extractDbError(error, 'saveMeal')
  revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/reports'); revalidatePath('/calendar')
  return { date }
}

export async function saveExpense(input: unknown) {
  const data = expenseSchema.parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('saveExpense', user.id); await assertOpenCycle(supabase, data.flatId, data.cycleId)
  const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can record expenses')
  const { error } = await supabase.from('expenses').insert({ flat_id: data.flatId, cycle_id: data.cycleId, amount: data.amount, category: data.category, note: data.note?.trim() || null, created_by: user.id })
  if (error) throw extractDbError(error, 'saveExpense')
  revalidatePath('/expenses'); revalidatePath('/dashboard'); revalidatePath('/reports')
}

export async function saveContribution(input: unknown) {
  const data = contributionSchema.parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('saveContribution', user.id); const cycle = await assertOpenCycle(supabase, data.flatId, data.cycleId)
  if (data.userId !== user.id) {
    const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', data.flatId).eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can record a contribution for another member')
  }
  const date = autoAssignCycleDate(cycle.start_date, cycle.end_date, data.date)
  const { error } = await supabase.from('contributions').insert({ flat_id: data.flatId, cycle_id: data.cycleId, user_id: data.userId, amount: data.amount, date, created_by: user.id, note: data.note?.trim() || null })
  if (error) throw extractDbError(error, 'saveContribution')
  revalidatePath('/contributions'); revalidatePath('/dashboard'); revalidatePath('/reports'); return { date }
}

export async function getCycleCloseWarnings(cycleId: string): Promise<CycleCloseWarning> {
  const id = z.string().uuid().parse(cycleId); const { supabase, user } = await currentUser(); await enforceRateLimit('closeCycle', user.id)
  const { data: cycle } = await supabase.from('cycles').select('flat_id,status').eq('id', id).maybeSingle(); if (!cycle) throw new Error('Cycle not found')
  const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', cycle.flat_id).eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can close a cycle'); if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  const { data, error } = await supabase.rpc('get_cycle_close_warnings', { p_cycle_id: id }); if (error) throw extractDbError(error, 'getCycleCloseWarnings')
  return { warning: Boolean(data?.warning), meal_policy: data?.meal_policy === 'opt_in' ? 'opt_in' : 'opt_out', total_meals: Number(data?.total_meals ?? 0), grocery_total: Number(data?.grocery_total ?? 0), sample_days: Array.isArray(data?.sample_days) ? data.sample_days.map((day: { date?: string; meals?: number }) => ({ date: String(day.date ?? ''), meals: Number(day.meals ?? 0) })) : [] }
}

export async function closeCycle(cycleId: string) {
  const id = z.string().uuid().parse(cycleId); const { supabase, user } = await currentUser(); await enforceRateLimit('closeCycle', user.id)
  const { data: cycle } = await supabase.from('cycles').select('flat_id,status').eq('id', id).maybeSingle(); if (!cycle) throw new Error('Cycle not found')
  const { data: membership } = await supabase.from('flat_members').select('role').eq('flat_id', cycle.flat_id).eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!membership || !['admin', 'manager'].includes(membership.role)) throw new Error('Only managers can close a cycle'); if (cycle.status !== 'open') throw new Error('This cycle is already closed')
  const { error } = await supabase.rpc('close_cycle', { p_cycle_id: id }); if (error) throw extractDbError(error, 'closeCycle')
  revalidatePath('/dashboard'); revalidatePath('/reports'); revalidatePath('/meals'); revalidatePath('/expenses'); revalidatePath('/contributions'); revalidatePath('/settings'); revalidatePath('/settlements'); revalidatePath('/calendar')
}

export async function leaveFlat(flatId: string) {
  const id = z.string().uuid().parse(flatId); const { supabase, user } = await currentUser(); await enforceRateLimit('leaveFlat', user.id)
  const { error } = await supabase.rpc('leave_flat', { p_flat_id: id }); if (error) throw extractDbError(error, 'leaveFlat')
  revalidatePath('/settings'); revalidatePath('/dashboard'); revalidatePath('/settlements')
}

export async function setCycleClosedDay(input: { cycleId: string; date: string; reason?: string }) {
  const data = z.object({ cycleId: z.string().uuid(), date: dateSchema, reason: z.string().trim().max(200).optional() }).parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('setCycleClosedDay', user.id)
  const { error } = await supabase.rpc('set_cycle_closed_day', { p_cycle_id: data.cycleId, p_date: data.date, p_reason: data.reason || 'Mess closed' }); if (error) throw extractDbError(error, 'setCycleClosedDay')
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/calendar')
}

export async function removeCycleClosedDay(input: { cycleId: string; date: string }) {
  const data = z.object({ cycleId: z.string().uuid(), date: dateSchema }).parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('removeCycleClosedDay', user.id)
  const { error } = await supabase.rpc('remove_cycle_closed_day', { p_cycle_id: data.cycleId, p_date: data.date }); if (error) throw extractDbError(error, 'removeCycleClosedDay')
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/calendar')
}

export async function recordSettlementPayment(input: { settlementId: string; amount: number; note?: string }) {
  const data = z.object({ settlementId: z.string().uuid(), amount: z.number().positive().max(10000000), note: z.string().trim().max(500).optional() }).parse(input); const { supabase, user } = await currentUser(); await enforceRateLimit('recordSettlementPayment', user.id)
  const { error } = await supabase.rpc('record_settlement_payment', { p_settlement_id: data.settlementId, p_amount: Math.round(data.amount * 100) / 100, p_note: data.note || null }); if (error) throw extractDbError(error, 'recordSettlementPayment')
  revalidatePath('/settlements'); revalidatePath('/reports'); revalidatePath('/dashboard')
}

export async function markNotificationRead(id: string) {
  const { supabase, user } = await currentUser(); await enforceRateLimit('markNotificationRead', user.id); const parsedId = z.string().uuid().parse(id)
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', parsedId); if (error) throw extractDbError(error, 'markNotificationRead'); revalidatePath('/dashboard')
}

export async function getTodayDate() { return todayInDhaka() }

export async function requestVacation(input: { cycleId: string; startDate: string; endDate: string; reason?: string }) {
  const data = z.object({ cycleId: z.string().uuid(), startDate: dateSchema, endDate: dateSchema, reason: z.string().trim().max(200).optional() }).parse(input)
  const { supabase, user } = await currentUser(); await enforceRateLimit('requestVacation', user.id)
  const { error } = await supabase.rpc('request_member_leave', { p_cycle_id: data.cycleId, p_start_date: data.startDate, p_end_date: data.endDate, p_reason: data.reason || 'Vacation' })
  if (error) throw extractDbError(error, 'requestVacation')
  revalidatePath('/settings'); revalidatePath('/calendar'); revalidatePath('/dashboard'); revalidatePath('/meals')
}

export async function managerSetVacation(input: { cycleId: string; userId: string; startDate: string; endDate: string; reason?: string }) {
  const data = z.object({ cycleId: z.string().uuid(), userId: z.string().uuid(), startDate: dateSchema, endDate: dateSchema, reason: z.string().trim().max(200).optional() }).parse(input)
  const { supabase, user } = await currentUser(); await enforceRateLimit('managerSetVacation', user.id)
  const { error } = await supabase.rpc('manager_set_member_leave', { p_cycle_id: data.cycleId, p_user_id: data.userId, p_start_date: data.startDate, p_end_date: data.endDate, p_reason: data.reason || 'Vacation' })
  if (error) throw extractDbError(error, 'managerSetVacation')
  revalidatePath('/settings'); revalidatePath('/calendar'); revalidatePath('/dashboard'); revalidatePath('/meals')
}

export async function approveVacation(id: string) {
  const parsed = z.string().uuid().parse(id); const { supabase, user } = await currentUser(); await enforceRateLimit('approveVacation', user.id)
  const { error } = await supabase.rpc('approve_member_leave', { p_leave_id: parsed }); if (error) throw extractDbError(error, 'approveVacation')
  revalidatePath('/settings'); revalidatePath('/calendar'); revalidatePath('/dashboard'); revalidatePath('/meals')
}

export async function cancelVacation(id: string) {
  const parsed = z.string().uuid().parse(id); const { supabase, user } = await currentUser(); await enforceRateLimit('cancelVacation', user.id)
  const { error } = await supabase.rpc('cancel_member_leave', { p_leave_id: parsed }); if (error) throw extractDbError(error, 'cancelVacation')
  revalidatePath('/settings'); revalidatePath('/calendar'); revalidatePath('/dashboard'); revalidatePath('/meals')
}
