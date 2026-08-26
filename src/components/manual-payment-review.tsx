'use client'

import { useTransition } from 'react'
import { reviewPayment } from '@/app/admin-actions'

export function ManualPaymentReview({ rows }: { rows: Array<{ id: string; userId: string; amount: number; method: string; senderNumber: string; transactionId: string; note: string | null; createdAt: string }> }) {
  const [pending, start] = useTransition()
  return <section className="space-y-4">
    {rows.length === 0 ? <div className="card text-sm text-muted">No pending Manager Plan payment requests.</div> : rows.map((row) => <article key={row.id} className="card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">Manager Plan</p><h2 className="mt-1 font-semibold">৳{row.amount.toFixed(2)} · {row.method}</h2><p className="mt-1 text-sm text-muted">User: <span className="font-mono">{row.userId}</span></p></div><span className="text-xs text-muted">{new Date(row.createdAt).toLocaleString('en-BD')}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2 p-3"><div className="text-xs text-muted">Sender number</div><div className="mt-1 font-mono text-sm text-main">{row.senderNumber}</div></div>
        <div className="rounded-xl border border-line bg-surface-2 p-3"><div className="text-xs text-muted">Transaction ID</div><div className="mt-1 font-mono text-sm text-brand-green">{row.transactionId || '—'}</div></div>
      </div>
      {row.note && <p className="rounded-xl border border-line bg-surface-2 p-3 text-sm text-muted">{row.note}</p>}
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
        <form action={(formData) => start(() => reviewPayment(formData))} className="flex gap-2">
          <input type="hidden" name="payment_id" value={row.id}/><input type="hidden" name="decision" value="approved"/>
          <button className="btn-primary" disabled={pending}>Approve</button>
        </form>
        <form action={(formData) => start(() => reviewPayment(formData))} className="flex flex-1 gap-2 sm:justify-end">
          <input type="hidden" name="payment_id" value={row.id}/><input type="hidden" name="decision" value="rejected"/>
          <input name="reject_reason" className="input max-w-sm" placeholder="Reason for rejection" required/>
          <button className="btn-secondary text-danger" disabled={pending}>Reject</button>
        </form>
      </div>
    </article>)}
  </section>
}
