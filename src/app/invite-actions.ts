'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'
import { flatIdSchema, inviteCodeSchema } from '@/lib/validation'

export async function generateInviteCode(flatId: string, ttlDays = 7) {
  const id = flatIdSchema.parse(flatId)
  const ttl = z.number().int().min(1).max(30).parse(ttlDays)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('generateInviteCode', user.id)
  const { data, error } = await s.rpc('generate_invite_code', { p_flat_id: id, p_ttl_days: ttl })
  if (error) throw extractDbError(error, 'generateInviteCode')
  revalidatePath('/settings')
  revalidatePath('/invites')
  return String(data)
}

export async function revokeInviteCode(codeId: string) {
  const id = z.string().uuid().parse(codeId)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('revokeInviteCode', user.id)
  const { error } = await s.rpc('revoke_invite_code', { p_code_id: id })
  if (error) throw extractDbError(error, 'revokeInviteCode')
  revalidatePath('/settings')
  revalidatePath('/invites')
}

export async function validateInviteCodeInput(code: string) {
  return inviteCodeSchema.parse({ code }).code
}
