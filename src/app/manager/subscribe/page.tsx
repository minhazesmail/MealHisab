import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManualPaymentCard } from '@/components/manual-payment-card'
import Link from 'next/link'

export default async function ManagerSubscribePage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')
  const { data: sub } = await s.from('subscriptions').select('status,current_period_end').eq('user_id', user.id).eq('plan', 'manager_monthly').maybeSingle()
  const { data: payment } = await s.from('payment_requests').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const active = !!sub && ['active','trialing'].includes(sub.status) && !!sub.current_period_end && new Date(sub.current_period_end) > new Date()
  const bkashNumber = process.env.MEALHISAB_BKASH_NUMBER ?? ''
  const nagadNumber = process.env.MEALHISAB_NAGAD_NUMBER ?? ''
  const rocketNumber = process.env.MEALHISAB_ROCKET_NUMBER ?? ''
  return <main className="min-h-screen bg-canvas px-4 py-10 text-main"><div className="mx-auto max-w-2xl"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Manager Plan</p><h1 className="mt-2 text-3xl font-black">৳99/month</h1><p className="mt-2 text-sm leading-6 text-muted">One flat, up to 10 member invite codes per month, meal accounting, settlement reports, and member management.</p></div><ManualPaymentCard active={active} periodEnd={sub?.current_period_end ?? null} paymentStatus={payment?.status === 'pending' ? 'submitted' : null} bkashNumber={bkashNumber} nagadNumber={nagadNumber} rocketNumber={rocketNumber}/>{active && <Link href="/onboarding/create-flat" className="btn-primary mt-5 flex w-full justify-center">Continue to create your flat</Link>}</div></main>
}
