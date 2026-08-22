'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

async function currentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function recordGuestMeal(input: { cycleId: string; mealDate: string; mealType: 'lunch' | 'dinner'; guestCount: number; note?: string }) {
  const data = z.object({ cycleId: z.string().uuid(), mealDate: dateSchema, mealType: z.enum(['lunch','dinner']), guestCount: z.number().int().min(1).max(100), note: z.string().trim().max(500).optional() }).parse(input)
  const { supabase, user } = await currentUser()
  await enforceRateLimit('recordGuestMeal', user.id)
  const { error } = await supabase.rpc('record_guest_meal', { p_cycle_id: data.cycleId, p_meal_date: data.mealDate, p_meal_type: data.mealType, p_guest_count: data.guestCount, p_note: data.note || null })
  if (error) throw extractDbError(error, 'recordGuestMeal')
  revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/calendar'); revalidatePath('/reports'); revalidatePath('/settlements')
}

export async function approveGuestMeal(id: string) {
  const parsed = z.string().uuid().parse(id)
  const { supabase, user } = await currentUser(); await enforceRateLimit('approveGuestMeal', user.id)
  const { error } = await supabase.rpc('approve_guest_meal', { p_guest_meal_id: parsed })
  if (error) throw extractDbError(error, 'approveGuestMeal')
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/calendar'); revalidatePath('/reports'); revalidatePath('/settlements')
}

export async function cancelGuestMeal(id: string) {
  const parsed = z.string().uuid().parse(id)
  const { supabase, user } = await currentUser(); await enforceRateLimit('cancelGuestMeal', user.id)
  const { error } = await supabase.rpc('cancel_guest_meal', { p_guest_meal_id: parsed })
  if (error) throw extractDbError(error, 'cancelGuestMeal')
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/calendar'); revalidatePath('/reports'); revalidatePath('/settlements')
}

export async function updateGuestMealPolicy(input: { flatId: string; policy: 'host_pays' | 'shared_equal' | 'shared_by_meals' | 'free_limit'; freeLimit: number; approvalRequired: boolean }) {
  const data = z.object({ flatId: z.string().uuid(), policy: z.enum(['host_pays','shared_equal','shared_by_meals','free_limit']), freeLimit: z.number().int().min(0).max(1000), approvalRequired: z.boolean() }).parse(input)
  const { supabase, user } = await currentUser(); await enforceRateLimit('updateGuestMealPolicy', user.id)
  const { error } = await supabase.rpc('update_guest_meal_policy', { p_flat_id: data.flatId, p_policy: data.policy, p_free_limit: data.freeLimit, p_approval_required: data.approvalRequired })
  if (error) throw extractDbError(error, 'updateGuestMealPolicy')
  revalidatePath('/settings'); revalidatePath('/meals'); revalidatePath('/dashboard'); revalidatePath('/reports'); revalidatePath('/settlements')
}
