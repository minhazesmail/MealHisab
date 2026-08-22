'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { extractDbError } from '@/lib/db-errors'

export async function updateSettlementPaymentSettings(input: unknown) {
  const data = z.object({
    flatId: z.string().uuid(),
    allowPartial: z.boolean(),
    allowOverpayment: z.boolean(),
  }).parse(input)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { error } = await supabase.rpc('update_settlement_payment_settings', {
    p_flat_id: data.flatId,
    p_allow_partial: data.allowPartial,
    p_allow_overpayment: data.allowOverpayment,
  })
  if (error) throw extractDbError(error, 'updateSettlementPaymentSettings')
  revalidatePath('/settings')
  revalidatePath('/settlements')
}
