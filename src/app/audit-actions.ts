'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractDbError } from '@/lib/db-errors'

export async function updateAuditVisibility(input: { flatId: string; visibility: 'members' | 'managers' }) {
  const data = z.object({ flatId: z.string().uuid(), visibility: z.enum(['members', 'managers']) }).parse(input)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  await enforceRateLimit('updateAuditVisibility', user.id)
  const { error } = await supabase.rpc('update_audit_visibility', { p_flat_id: data.flatId, p_visibility: data.visibility })
  if (error) throw extractDbError(error, 'updateAuditVisibility')
  revalidatePath('/activity')
  revalidatePath('/settings')
}
