'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createSslcommerzPayment } from '@/lib/sslcommerz'

const PLAN_CODE = 'manager_99_bdt'
const MONTHLY_AMOUNT = 99

export async function createManagerCheckoutSession() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('createManagerCheckout', user.id)

  const { data: existing } = await s.from('manager_subscriptions')
    .select('status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if ((existing?.status === 'active' || existing?.status === 'trialing') && existing.current_period_end && new Date(existing.current_period_end) > new Date()) {
    redirect('/onboarding?billing=active')
  }

  const { data: transactionId, error } = await s.rpc('create_manager_payment', {
    p_plan_code: PLAN_CODE,
    p_amount: MONTHLY_AMOUNT,
  })
  if (error || !transactionId) throw new Error('Could not create the Manager Plan payment. Please try again.')

  const session = await createSslcommerzPayment({
    userId: user.id,
    paymentId: String(transactionId),
    amount: MONTHLY_AMOUNT,
    customerName: user.user_metadata?.full_name || 'MealHisab Manager',
    customerEmail: user.email || undefined,
    customerPhone: user.phone || undefined,
  })

  redirect(session.redirectGatewayURL!)
}

export async function openManagerBillingPortal() {
  await createManagerCheckoutSession()
}
