'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveExpense, saveContribution, closeCycle, leaveFlat, setCycleClosedDay, removeCycleClosedDay, recordSettlementPayment } from '@/app/actions'

function ActionError({ message }: { message: string }) {
  return message ? <p className="text-sm text-red-600" role="alert">{message}</p> : null
}

export function ExpenseForm({ flatId, cycleId }: { flatId: string; cycleId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <form className="card space-y-3" onSubmit={(event) => {
    event.preventDefault(); setError(''); const formElement = event.currentTarget; const form = new FormData(formElement)
    const data = { flatId, cycleId, amount: Number(form.get('amount')), category: String(form.get('category')), note: String(form.get('note') || '') }
    start(async () => { try { await saveExpense(data); formElement.reset(); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not save expense') } })
  }}>
    <h2 className="font-semibold">Add expense</h2>
    <input name="amount" type="number" min="0.01" step="0.01" className="input" placeholder="Amount in BDT" required />
    <select name="category" className="input" defaultValue="grocery"><option value="grocery">Grocery</option><option value="cook_salary">Cook salary</option><option value="gas">Gas</option><option value="other">Other</option></select>
    <input name="note" className="input" placeholder="Note (optional)" maxLength={500} />
    <ActionError message={error} />
    <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? 'Saving…' : 'Save expense'}</button>
  </form>
}

export function ContributionForm({ flatId, cycleId, userId }: { flatId: string; cycleId: string; userId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <form className="card space-y-3" onSubmit={(event) => {
    event.preventDefault(); setError(''); const formElement = event.currentTarget; const form = new FormData(formElement)
    const data = { flatId, cycleId, userId, amount: Number(form.get('amount')), note: String(form.get('note') || '') }
    start(async () => { try { await saveContribution(data); formElement.reset(); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not save contribution') } })
  }}>
    <h2 className="font-semibold">Add contribution</h2>
    <input name="amount" type="number" min="0.01" step="0.01" className="input" placeholder="Amount in BDT" required />
    <input name="note" className="input" placeholder="Note (optional)" maxLength={500} />
    <ActionError message={error} />
    <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? 'Saving…' : 'Save contribution'}</button>
  </form>
}

export function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <div className="space-y-2">
    <button type="button" className="btn-primary" disabled={pending} onClick={() => {
      if (!window.confirm('Close this cycle and create the next one?')) return
      setError(''); start(async () => { try { await closeCycle(cycleId); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not close cycle') } })
    }}>{pending ? 'Closing…' : 'Close month'}</button>
    <ActionError message={error} />
  </div>
}

export function LeaveFlatButton({ flatId }: { flatId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <div className="space-y-2">
    <button type="button" className="btn-secondary" disabled={pending} onClick={() => {
      if (!window.confirm('Leave this flat today? Your open-cycle meals will stop after today and your final balance will remain available in Settlements.')) return
      setError(''); start(async () => { try { await leaveFlat(flatId); router.push('/onboarding'); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not leave the flat') } })
    }}>{pending ? 'Leaving…' : 'Leave flat'}</button>
    <ActionError message={error} />
  </div>
}

export function MessClosedForm({ cycleId }: { cycleId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <form className="space-y-3" onSubmit={(event) => {
    event.preventDefault(); setError(''); const formElement = event.currentTarget; const form = new FormData(formElement)
    start(async () => { try { await setCycleClosedDay({ cycleId, date: String(form.get('date')), reason: String(form.get('reason') || 'Mess closed') }); formElement.reset(); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not mark the day closed') } })
  }}>
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input name="date" type="date" className="input" required /><input name="reason" className="input" maxLength={200} placeholder="Reason, e.g. Eid holiday" /><button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Mark closed'}</button></div>
    <ActionError message={error} />
  </form>
}

export function RemoveClosedDayButton({ cycleId, date }: { cycleId: string; date: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <div className="space-y-1 text-right"><button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-950" disabled={pending} onClick={() => start(async () => { try { await removeCycleClosedDay({ cycleId, date }); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not reopen day') } })}>{pending ? 'Removing…' : 'Reopen'}</button><ActionError message={error} /></div>
}

export function SettlementPaymentForm({ settlementId, maxAmount, direction }: { settlementId: string; maxAmount: number; direction: 'payout' | 'collection' }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <form className="mt-3 space-y-2" onSubmit={(event) => {
    event.preventDefault(); setError(''); const formElement = event.currentTarget; const form = new FormData(formElement); const amount = Number(form.get('amount')); const note = String(form.get('note') || '')
    start(async () => { try { await recordSettlementPayment({ settlementId, amount, note }); formElement.reset(); router.refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Could not record payment') } })
  }}>
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input name="amount" type="number" min="0.01" max={maxAmount.toFixed(2)} step="0.01" className="input" placeholder={`Amount to ${direction === 'payout' ? 'pay out' : 'collect'}`} required /><input name="note" className="input" maxLength={500} placeholder="Payment note (optional)" /><button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : direction === 'payout' ? 'Record payout' : 'Record collection'}</button></div>
    <ActionError message={error} />
  </form>
}
