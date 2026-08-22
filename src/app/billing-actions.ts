'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function submitManualManagerPayment(formData: FormData) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('submitManualManagerPayment', user.id)

  const paymentMethod = String(formData.get('payment_method') ?? '')
  const senderNumber = String(formData.get('sender_number') ?? '')
  const transactionId = String(formData.get('transaction_id') ?? '')
  const note = String(formData.get('note') ?? '')

  const { error } = await s.rpc('create_manual_manager_payment', {
    p_payment_method: paymentMethod,
    p_sender_number: senderNumber,
    p_transaction_id: transactionId,
    p_note: note || null,
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
  redirect('/settings?payment=submitted')
}

export async function reviewManualManagerPayment(formData: FormData) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const paymentId = String(formData.get('payment_id') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const rejectReason = String(formData.get('reject_reason') ?? '')

  const { error } = await s.rpc('review_manager_payment_request', {
    p_payment_request_id: paymentId,
    p_decision: decision,
    p_reject_reason: rejectReason || null,
  })
  if (error) {
    throw new Error(error.message.includes('platform_admin_required') ? 'Platform admin access required.' : 'Could not review this payment request.')
  }
  revalidatePath('/admin/payments')
}
