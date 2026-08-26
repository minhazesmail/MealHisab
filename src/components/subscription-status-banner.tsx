'use client'

import Link from 'next/link'

export function SubscriptionStatusBanner({ state, periodEnd, daysRemaining }: { state: 'active'|'grace'|'expired'; periodEnd: string | null; daysRemaining?: number | null }) {
  if (state === 'active') {
    if (!periodEnd) return null
    const daysUntil = daysRemaining ?? Math.ceil((new Date(periodEnd).getTime() - new Date().getTime()) / 86400000)
    if (daysUntil > 7) return null
    return <div className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><span>Your Manager Plan expires on {new Date(periodEnd).toLocaleDateString('en-BD')}. Renew to keep your flat active.</span><Link href="/settings" className="font-bold underline underline-offset-2">Renew</Link></div></div>
  }

  if (state === 'grace') {
    return <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><span><strong>Your subscription has expired.</strong> Renew within {daysRemaining ?? 7} day{(daysRemaining ?? 7) === 1 ? '' : 's'} to avoid locking this flat.</span><Link href="/settings" className="rounded-lg bg-brand-green px-3 py-1.5 font-bold text-black">Renew ৳99</Link></div></div>
  }

  return <div className="border-b border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><span><strong>This flat is locked because the manager subscription expired.</strong> Members can view existing data, but changes are disabled until the Manager Plan is renewed.</span><Link href="/settings" className="rounded-lg bg-danger px-3 py-1.5 font-bold text-white">Renew Manager Plan</Link></div></div>
}
