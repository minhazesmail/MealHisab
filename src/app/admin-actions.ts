'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

const uuidSchema = z.string().uuid()

async function adminClient() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.app_metadata?.role !== 'platform_admin') throw new Error('Platform admin access required.')
  await enforceRateLimit('adminAction', user.id)
  return { s, user }
}

export async function reviewPayment(formData: FormData) {
  const { s } = await adminClient()
  const paymentId = uuidSchema.parse(String(formData.get('payment_id') ?? ''))
  const decision = z.enum(['approved', 'rejected']).parse(String(formData.get('decision') ?? ''))
  const reason = z.string().trim().max(500).optional().parse(String(formData.get('reject_reason') ?? '') || undefined)
  const { error } = await s.rpc('review_manager_payment_request', { p_payment_request_id: paymentId, p_decision: decision, p_reject_reason: reason ?? null })
  if (error) throw extractDbError(error, 'reviewPayment')
  revalidatePath('/admin'); revalidatePath('/billing')
}

export async function extendSubscription(formData: FormData) {
  const { s } = await adminClient()
  const userId = uuidSchema.parse(String(formData.get('user_id') ?? ''))
  const days = z.coerce.number().int().min(1).max(365).parse(formData.get('days') ?? 30)
  const { error } = await s.rpc('admin_extend_subscription', { p_user_id: userId, p_days: days })
  if (error) throw extractDbError(error, 'extendSubscription')
  revalidatePath('/admin')
}

export async function cancelSubscription(formData: FormData) {
  const { s } = await adminClient()
  const userId = uuidSchema.parse(String(formData.get('user_id') ?? ''))
  const { error } = await s.rpc('admin_cancel_subscription', { p_user_id: userId })
  if (error) throw extractDbError(error, 'cancelSubscription')
  revalidatePath('/admin')
}

export async function unlockFlat(formData: FormData) {
  const { s } = await adminClient()
  const flatId = uuidSchema.parse(String(formData.get('flat_id') ?? ''))
  const days = z.coerce.number().int().min(1).max(30).parse(formData.get('days') ?? 7)
  const { error } = await s.rpc('admin_unlock_flat', { p_flat_id: flatId, p_days: days })
  if (error) throw extractDbError(error, 'unlockFlat')
  revalidatePath('/admin')
}

export async function overrideInviteLimit(formData: FormData) {
  const { s } = await adminClient()
  const flatId = uuidSchema.parse(String(formData.get('flat_id') ?? ''))
  const days = z.coerce.number().int().min(1).max(90).parse(formData.get('days') ?? 31)
  const { error } = await s.rpc('admin_override_invite_limit', { p_flat_id: flatId, p_days: days })
  if (error) throw extractDbError(error, 'overrideInviteLimit')
  revalidatePath('/admin')
}
