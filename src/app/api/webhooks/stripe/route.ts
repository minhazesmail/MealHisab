import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { requireStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const stripe = requireStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 500 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = createServiceClient()
  const supported = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ])
  if (!supported.has(event.type)) return NextResponse.json({ received: true })

  let subscription: Stripe.Subscription | null = null
  let userId: string | null = null
  let customerId: string | null = null

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    userId = session.client_reference_id ?? session.metadata?.user_id ?? null
    customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId)
  } else {
    subscription = event.data.object as Stripe.Subscription
    customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    userId = subscription.metadata?.user_id ?? null
  }

  if (!userId && customerId) {
    const { data: existing } = await service.from('manager_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = existing?.user_id ?? null
  }

  if (!subscription || !userId) return NextResponse.json({ received: true })

  const periodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null
  const { error } = await service.from('manager_subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_code: 'manager_99_bdt',
    status: subscription.status,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) {
    console.error('[stripe-webhook] subscription persistence failed', error)
    return NextResponse.json({ error: 'Could not persist subscription state' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
