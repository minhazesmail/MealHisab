'use server'

import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { redirect } from 'next/navigation'

export async function requestFlatRecovery(formData: FormData) {
  const flatId = String(formData.get('flat_id') ?? '')
  const type = String(formData.get('type') ?? 'export')
  if (!flatId || !['export', 'support_takeover'].includes(type)) throw new Error('Invalid recovery request.')

  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('flatRecovery', user.id)

  const { error } = await s.rpc('request_flat_recovery', {
    p_flat_id: flatId,
    p_type: type,
    p_note: null,
  })
  if (error) throw new Error('Could not submit the recovery request.')
  redirect('/dashboard?recovery=requested')
}
