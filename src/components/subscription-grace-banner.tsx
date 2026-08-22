'use client'

import Link from 'next/link'

export function SubscriptionGraceBanner({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining <= 0) return null
  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Your Manager Plan payment is overdue. You have {daysRemaining} day{daysRemaining === 1 ? '' : 's'} of grace remaining before manager access is locked.
        </p>
        <Link href="/settings" className="text-sm font-bold underline underline-offset-4">Renew ৳99</Link>
      </div>
    </div>
  )
}
