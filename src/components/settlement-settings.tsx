'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateSettlementPaymentSettings } from '@/app/settlement-settings-actions'

export function SettlementSettings({
  flatId,
  initialPartial,
  initialOverpayment,
}: {
  flatId: string
  initialPartial: boolean
  initialOverpayment: boolean
}) {
  const [partial, setPartial] = useState(initialPartial)
  const [overpayment, setOverpayment] = useState(initialOverpayment)
  const [pending, start] = useTransition()

  function save(nextPartial: boolean, nextOverpayment: boolean) {
    setPartial(nextPartial)
    setOverpayment(nextOverpayment)
    start(async () => {
      try {
        await updateSettlementPaymentSettings({ flatId, allowPartial: nextPartial, allowOverpayment: nextOverpayment })
        toast.success('Settlement payment settings saved')
      } catch (err) {
        setPartial(partial)
        setOverpayment(overpayment)
        toast.error(err instanceof Error ? err.message : 'Could not save settlement settings')
      }
    })
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">Settlement payments</h2>
        <p className="mt-1 text-sm text-muted">Choose how the mess handles partial payments and accidental overpayments.</p>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-4">
        <span>
          <span className="block font-medium">Allow partial payments</span>
          <span className="mt-1 block text-xs text-muted">A member can pay less than the full remaining amount and finish later.</span>
        </span>
        <input
          type="checkbox"
          checked={partial}
          disabled={pending}
          onChange={(e) => save(e.target.checked, overpayment)}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-4">
        <span>
          <span className="block font-medium">Allow overpayments</span>
          <span className="mt-1 block text-xs text-muted">Payments above the remaining settlement become a carry-forward credit for the member.</span>
        </span>
        <input
          type="checkbox"
          checked={overpayment}
          disabled={pending}
          onChange={(e) => save(partial, e.target.checked)}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>
    </section>
  )
}
