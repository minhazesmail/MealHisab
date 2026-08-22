'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireManagerPriceId, requireStripe } from '@/lib/stripe'

export async function createManagerCheckoutSession() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('createManagerCheckout', user.id)

  const stripe = requireStripe()
  const priceId = requireManagerPriceId()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('Application URL is not configured.')

  const { data: existing } = await s.from('manager_subscriptions')
    .select('stripe_customer_id,status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'active' || existing?.status === 'trialing') redirect('/onboarding?billing=active')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer: existing?.stripe_customer_id ?? undefined,
    customer_email: existing?.stripe_customer_id ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_code: 'manager_99_bdt' },
    subscription_data: { metadata: { user_id: user.id, plan_code: 'manager_99_bdt' } },
    success_url: `${appUrl}/onboarding?billing=success`,
    cancel_url: `${appUrl}/onboarding?billing=cancelled`,
    allow_promotion_codes: true,
  })

  redirect(session.url!)
}

export async function openManagerBillingPortal() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await enforceRateLimit('managerBillingPortal', user.id)

  const { data: subscription } = await s.from('manager_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!subscription?.stripe_customer_id) throw new Error('No Manager Plan subscription found.')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('Application URL is not configured.')

  const stripe = requireStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  })
  redirect(session.url)
}
