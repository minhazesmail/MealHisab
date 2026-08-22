'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { recordSettlementPayment } from '@/app/actions'

export function SettlementPaymentForm({
  settlementId,
  remaining,
  direction,
  allowPartial,
  allowOverpayment,
}: {
  settlementId: string
  remaining: number
  direction: 'payout' | 'collection'
  allowPartial: boolean
  allowOverpayment: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [amount, setAmount] = useState(allowPartial ? '' : remaining.toFixed(2))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const canOverpay = direction === 'collection' && allowOverpayment
  const max = canOverpay ? undefined : remaining

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        start(async () => {
          try {
            await recordSettlementPayment({ settlementId, amount: Number(amount), note })
            setAmount(allowPartial ? '' : remaining.toFixed(2))
            setNote('')
            toast.success('Settlement payment recorded')
            router.refresh()
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not record payment'
            setError(message)
            toast.error(message)
          }
        })
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="amount"
          type="number"
          min="0.01"
          max={max}
          step="0.01"
          className="input"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Payment amount"
          required
        />
        <input
          name="note"
          className="input"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional)"
        />
        <button className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Record Payment'}
        </button>
      </div>
      <p className="text-xs text-muted">
        {canOverpay ? 'Overpayments are allowed and become carry-forward credit.' : allowPartial ? `Up to ৳${remaining.toFixed(2)} can be paid now.` : `Full remaining amount: ৳${remaining.toFixed(2)}.`}
      </p>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </form>
  )
}
