'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveExpense, saveContribution, closeCycle } from '@/app/actions'

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
