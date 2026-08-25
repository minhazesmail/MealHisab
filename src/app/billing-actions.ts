'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { paymentRequestSchema } from '@/lib/validation'

export async function submitManualManagerPayment(formData: FormData) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('submitManualManagerPayment', user.id)

  const parsed = paymentRequestSchema.safeParse({
    paymentMethod: String(formData.get('payment_method') ?? ''),
    senderNumber: String(formData.get('sender_number') ?? ''),
    transactionId: String(formData.get('transaction_id') ?? ''),
    note: String(formData.get('note') ?? '') || undefined,
  })
  if (!parsed.success) throw new Error('Please check your payment method, sender number, and transaction ID.')

  const { error } = await s.rpc('create_manual_manager_payment', {
    p_payment_method: parsed.data.paymentMethod,
    p_sender_number: parsed.data.senderNumber,
    p_transaction_id: parsed.data.transactionId,
    p_note: parsed.data.note || null,
  })

  if (error) {
    const friendly = error.message.includes('subscription_still_active')
      ? 'Your Manager Plan is still active.'
      : error.message.includes('payment_transaction_already_submitted')
        ? 'That transaction ID has already been submitted.'
        : 'Could not submit the payment proof. Please check the details and try again.'
    throw new Error(friendly)
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  redirect('/billing?payment=submitted')
}
