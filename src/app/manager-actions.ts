'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit, enforceIpRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'
import { createFlat as createFlatAction } from '@/app/actions'
import { flatIdSchema, inviteCodeSchema, paymentRequestSchema } from '@/lib/validation'

export async function submitPaymentRequest(formData: FormData) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('submitManagerPaymentRequest', user.id)

  const parsed = paymentRequestSchema.parse({
    paymentMethod: String(formData.get('payment_method') ?? ''),
    senderNumber: String(formData.get('sender_number') ?? ''),
    transactionId: String(formData.get('transaction_id') ?? ''),
    note: String(formData.get('note') ?? '') || undefined,
  })
  const { error } = await s.rpc('create_manual_manager_payment', {
    p_payment_method: parsed.paymentMethod,
    p_sender_number: parsed.senderNumber,
    p_transaction_id: parsed.transactionId,
    p_note: parsed.note ?? null,
  })
  if (error) throw extractDbError(error, 'submitPaymentRequest')
  revalidatePath('/billing'); revalidatePath('/manager/subscribe')
  redirect('/billing?payment=submitted')
}

export async function renewSubscription() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('renewSubscription', user.id)
  revalidatePath('/manager/subscribe')
  redirect('/manager/subscribe?renew=1')
}

export async function cancelSubscription() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('cancelSubscription', user.id)
  const { error } = await s.rpc('cancel_manager_subscription')
  if (error) throw extractDbError(error, 'cancelSubscription')
  revalidatePath('/billing'); revalidatePath('/settings')
}

export async function createFlat(input: { name: string; address?: string; monthStartDay: number; mealPolicy: 'opt_in' | 'opt_out' }) {
  return createFlatAction(input)
}

export async function archiveFlat(flatId: string) {
  const id = flatIdSchema.parse(flatId)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('archiveFlat', user.id)
  const { error } = await s.rpc('archive_flat', { p_flat_id: id })
  if (error) throw extractDbError(error, 'archiveFlat')
  revalidatePath('/dashboard'); revalidatePath('/settings'); revalidatePath('/billing')
}

export async function generateInviteCode(flatId: string) {
  const id = flatIdSchema.parse(flatId)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('generateInviteCode', user.id)
  const { data, error } = await s.rpc('generate_invite_code', { p_flat_id: id, p_ttl_days: 7 })
  if (error) throw extractDbError(error, 'generateInviteCode')
  revalidatePath('/invites'); revalidatePath('/settings')
  return String(data)
}

export async function revokeInviteCode(codeId: string) {
  const id = flatIdSchema.parse(codeId)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('revokeInviteCode', user.id)
  const { error } = await s.rpc('revoke_invite_code', { p_code_id: id })
  if (error) throw extractDbError(error, 'revokeInviteCode')
  revalidatePath('/invites'); revalidatePath('/settings')
}

export async function joinFlatWithCode(code: string) {
  const value = inviteCodeSchema.parse({ code }).code
  await enforceIpRateLimit('joinFlatWithCode')
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('joinFlatWithCode', user.id)
  const { data, error } = await s.rpc('join_flat_with_code', { p_code: value })
  if (error) throw extractDbError(error, 'joinFlatWithCode')
  revalidatePath('/join'); revalidatePath('/dashboard'); revalidatePath('/onboarding')
  return String(data)
}
