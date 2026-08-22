import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManualPaymentCard } from '@/components/manual-payment-card'
import { cancelSubscription, renewSubscription } from '@/app/manager-actions'

export default async function BillingPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: sub } = await s.from('subscriptions')
    .select('status,current_period_start,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .eq('plan', 'manager_monthly')
    .maybeSingle()

  const { data: payments } = await s.from('payment_requests')
    .select('id,amount,currency,payment_method,sender_number,transaction_id,status,reject_reason,created_at,reviewed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const active = !!sub && ['active', 'trialing'].includes(sub.status) && !!sub.current_period_end && new Date(sub.current_period_end) > new Date()
  const paidUntil = sub?.current_period_end ? new Date(sub.current_period_end) : null
  const now = new Date()
  const inGrace = !!paidUntil && paidUntil <= now && paidUntil > new Date(now.getTime() - 7 * 86400000) && ['active', 'trialing', 'past_due'].includes(sub?.status ?? '')
  const cancelScheduled = Boolean(sub?.cancel_at_period_end)

  return <div className="space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Billing</p>
      <h1 className="mt-2 text-3xl font-black">Manager Plan</h1>
      <p className="mt-2 text-sm text-muted">৳99/month • one flat • up to 10 invite codes per month • members join free.</p>
    </div>

    {cancelScheduled && paidUntil && active && <section className="card border-amber-400/30 bg-amber-400/10">
      <p className="text-sm font-semibold text-amber-200">Cancellation scheduled</p>
      <p className="mt-1 text-sm text-muted">Your plan will remain active until {paidUntil.toLocaleDateString('en-BD')}. You can renew before then to extend your subscription.</p>
    </section>}

    {inGrace && <section className="card border-amber-400/30 bg-amber-400/10">
      <p className="text-sm font-semibold text-amber-200">Your Manager Plan has expired.</p>
      <p className="mt-1 text-sm text-muted">Renew now to keep your flat active during the 7-day grace period.</p>
    </section>}

    <ManualPaymentCard
      active={active}
      periodEnd={sub?.current_period_end ?? null}
      paymentStatus={null}
      bkashNumber={process.env.MEALHISAB_BKASH_NUMBER ?? ''}
      nagadNumber={process.env.MEALHISAB_NAGAD_NUMBER ?? ''}
      rocketNumber={process.env.MEALHISAB_ROCKET_NUMBER ?? ''}
    />

    <section className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Current plan</h2>
          <p className="mt-1 text-sm text-muted">Manager Plan • manual monthly payment</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold capitalize">{cancelScheduled && active ? 'canceling' : sub?.status ?? 'inactive'}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><p className="text-xs text-muted">Plan</p><p className="mt-1 font-semibold">Manager Plan</p></div>
        <div><p className="text-xs text-muted">Status</p><p className="mt-1 font-semibold capitalize">{sub?.status ?? 'inactive'}</p></div>
        <div><p className="text-xs text-muted">Paid through</p><p className="mt-1 font-semibold">{paidUntil ? paidUntil.toLocaleDateString('en-BD') : '—'}</p></div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <form action={renewSubscription}><button type="submit" className="btn-primary">Renew / extend ৳99</button></form>
        {active && !cancelScheduled && <form action={cancelSubscription}><button type="submit" className="btn-secondary">Cancel at period end</button></form>}
      </div>
    </section>

    <section className="card">
      <h2 className="font-semibold">Payment history</h2>
      <div className="mt-4 space-y-2">
        {(payments ?? []).map((p: any) => <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div><div className="font-semibold">৳{Number(p.amount).toFixed(2)} • {p.payment_method}</div><div className="mt-1 text-xs text-muted">{new Date(p.created_at).toLocaleString('en-BD')} {p.transaction_id ? `• TXN ${p.transaction_id}` : ''}</div></div>
          <div className="text-xs font-semibold capitalize">{p.status}{p.reject_reason ? ` — ${p.reject_reason}` : ''}</div>
        </div>)}
        {!(payments ?? []).length && <p className="text-sm text-muted">No payment requests yet.</p>}
      </div>
    </section>
  </div>
}
