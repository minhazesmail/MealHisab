'use client'

import { useState, useTransition } from 'react'
import { submitManualManagerPayment } from '@/app/billing-actions'

type Props = { active: boolean; periodEnd: string | null; paymentStatus?: string | null; bkashNumber: string; nagadNumber: string; rocketNumber: string }

export function ManualPaymentCard({ active, periodEnd, paymentStatus, bkashNumber, nagadNumber, rocketNumber }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function submit(formData: FormData) {
    setError('')
    startTransition(async () => {
      try { await submitManualManagerPayment(formData) }
      catch (err) { setError(err instanceof Error ? err.message : 'Could not submit payment proof.') }
    })
  }

  if (active) return <section className="card border-brand-green/30 bg-surface-2">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Manager Plan</p>
    <h2 className="mt-1 text-lg font-semibold">৳99 / month</h2>
    <p className="mt-1 text-sm text-muted">Your Manager Plan is active{periodEnd ? ` until ${new Date(periodEnd).toLocaleDateString('en-BD')}` : ''}.</p>
    <p className="mt-3 text-xs text-muted">Submit the next ৳99 payment after your current period ends.</p>
  </section>

  return <section className="card border-brand-green/30 bg-surface-2">
    <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Manager Plan</p><h2 className="mt-1 text-lg font-semibold">Pay ৳99 / month</h2><p className="mt-1 text-sm leading-6 text-muted">Send exactly ৳99 to one of the payment numbers below, then submit your transaction details for manual verification.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[['bKash', bkashNumber], ['Nagad', nagadNumber], ['Rocket', rocketNumber]].map(([name, number]) => <div key={name} className="rounded-2xl border border-line bg-surface-3 p-3"><div className="text-xs font-bold text-main">{name}</div><div className="mt-1 font-mono text-sm text-brand-green">{number || 'Not configured'}</div></div>)}</div>
    <form action={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-main">Payment method<select name="payment_method" className="input mt-1.5" required defaultValue="bkash"><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option></select></label><label className="block text-sm font-semibold text-main">Sender number<input name="sender_number" className="input mt-1.5" inputMode="tel" placeholder="01XXXXXXXXX" required/></label></div>
      <label className="block text-sm font-semibold text-main">Transaction ID<input name="transaction_id" className="input mt-1.5" placeholder="e.g. 9F8A7B6C" required/></label>
      <label className="block text-sm font-semibold text-main">Note <span className="font-normal text-muted">(optional)</span><textarea name="note" className="input mt-1.5 min-h-20 resize-y" placeholder="Anything the admin should know?"/></label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted">Approval is manual. Keep your payment receipt until the request is approved.</p><button className="btn-primary" disabled={pending}>{pending ? 'Submitting…' : 'Submit payment proof'}</button></div>
      {paymentStatus === 'submitted' && <p className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3 text-sm text-brand-green" role="status">Payment proof submitted. An admin will review it shortly.</p>}
      {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
    </form>
  </section>
}
