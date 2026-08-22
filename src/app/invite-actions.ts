'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

export async function generateInviteCode(flatId: string) {
  const id = z.string().uuid().parse(flatId)
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('generateInviteCode', user.id)
  const { data, error } = await s.rpc('generate_invite_code', { p_flat_id: id })
  if (error) throw extractDbError(error, 'generateInviteCode')
  revalidatePath('/settings')
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
}
