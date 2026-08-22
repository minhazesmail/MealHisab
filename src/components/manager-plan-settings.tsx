import { createManagerCheckoutSession } from '@/app/billing-actions'

type Props = {
  status: 'inactive' | 'pending' | 'active' | 'expired' | 'failed'
  currentPeriodEnd: string | null
  lastPaymentAt?: string | null
}

export function ManagerPlanSettings({ status, currentPeriodEnd, lastPaymentAt }: Props) {
  const active = status === 'active' && !!currentPeriodEnd && new Date(currentPeriodEnd) > new Date()
  const pending = status === 'pending'
  const label = active ? `Active until ${new Date(currentPeriodEnd!).toLocaleDateString('en-BD')}` : pending ? 'Payment pending' : 'Plan inactive'

  return (
    <section className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Manager Plan</p>
          <h2 className="mt-1 text-lg font-bold">৳99 / month</h2>
          <p className="mt-1 text-sm text-muted">Pay securely with bKash, Nagad, Visa, Mastercard and other enabled Bangladesh payment channels.</p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-brand-green/30 bg-brand-green/10 text-brand-green' : 'border-line bg-surface-2 text-muted'}`}>{label}</span>
      </div>

      <form action={createManagerCheckoutSession}>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? 'Payment processing…' : active ? 'Renew / Pay next month' : 'Pay ৳99 Manager Plan'}</button>
      </form>

      {lastPaymentAt && <p className="text-xs text-muted">Last successful payment: {new Date(lastPaymentAt).toLocaleString('en-BD')}</p>}
    </section>
  )
}
