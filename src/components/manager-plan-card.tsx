'use client'

import { useTransition } from 'react'
import { createManagerCheckoutSession } from '@/app/billing-actions'

export function ManagerPlanCard({ status, periodEnd, hasFlat }: { status: string; periodEnd: string | null; hasFlat: boolean }) {
  const [pending, start] = useTransition()
  const active = status === 'active' && !!periodEnd && new Date(periodEnd) > new Date()
  return (
    <section className="card border-brand-green/30 bg-surface-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Manager Plan</p>
          <h2 className="mt-1 text-lg font-semibold">৳99 / month</h2>
          <p className="mt-1 text-sm text-muted">Pay securely with bKash, Nagad, Visa, Mastercard and other enabled Bangladesh payment channels.</p>
          {active && periodEnd && <p className="mt-2 text-xs text-muted">Current entitlement ends {new Date(periodEnd).toLocaleDateString('en-BD')}.</p>}
          {!active && hasFlat && <p className="mt-2 text-xs text-danger">Your Manager Plan is inactive. Manager actions are locked until payment is restored.</p>}
        </div>
        <form action={createManagerCheckoutSession}>
          <button className="btn-primary whitespace-nowrap" disabled={pending}>
            {pending ? 'Opening payment…' : active ? 'Pay next ৳99 month' : 'Pay ৳99 Manager Plan'}
          </button>
        </form>
      </div>
    </section>
  )
}
