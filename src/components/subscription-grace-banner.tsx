'use client'

import Link from 'next/link'

type Props = { state: 'expiring' | 'grace' | 'locked' | 'hidden'; daysRemaining?: number; periodEnd?: string | null }

export function SubscriptionGraceBanner({ state, daysRemaining = 0, periodEnd }: Props) {
  if (state === 'hidden') return null
  if (state === 'expiring') return <div className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-3 text-amber-100"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><p className="text-sm font-medium">Your Manager Plan expires on {periodEnd ? new Date(periodEnd).toLocaleDateString('en-BD') : 'soon'}. Renew to keep your flat active.</p><Link href="/billing" className="font-bold underline underline-offset-4">Renew ৳99</Link></div></div>
  if (state === 'grace') return <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-100"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><p className="text-sm font-medium"><strong>Your Manager Plan has expired.</strong> Renew within {daysRemaining} day{daysRemaining === 1 ? '' : 's'} to keep your flat active.</p><Link href="/billing" className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-bold text-black">Renew now</Link></div></div>
  return <div className="border-b border-danger/30 bg-danger/10 px-4 py-3 text-danger"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><p className="text-sm font-medium"><strong>Your Manager Plan has expired.</strong> Renew now to keep your flat active.</p><Link href="/billing" className="rounded-lg bg-danger px-3 py-1.5 text-sm font-bold text-white">Renew now</Link></div></div>
}
