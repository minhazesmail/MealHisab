'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { saveMeal } from '@/app/actions'
import { useI18n } from '@/components/language-provider'

type MealType = 'lunch' | 'dinner' | 'extra'
type Props = { flatId: string; cycleId: string; userId: string; date: string; policy: 'opt_in' | 'opt_out'; initial: Record<string, number> }

export default function MealTracker({ flatId, cycleId, userId, date, policy, initial }: Props) {
  const { t, num } = useI18n(); const [, startTransition] = useTransition()
  const [counts, setCounts] = useState<Record<string, number>>(initial); const [pendingActions, setPendingActions] = useState<Set<string>>(new Set()); const [error, setError] = useState(''); const [effectiveDate, setEffectiveDate] = useState(date)
  const current = (type: MealType) => counts[type] ?? (type === 'extra' ? 0 : policy === 'opt_out' ? 1 : 0)
  const busy = (type: MealType, count: number) => pendingActions.has(`${type}:${count}`)
  const confirmDate = (value: string) => { const parsed = new Date(`${value}T00:00:00`); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed) }

  const setMeal = (type: MealType, count: number, action: string) => {
    const next = Math.max(0, Math.min(100, count)); const previous = current(type); const key = `${type}:${next}`
    setError(''); setPendingActions(p => new Set(p).add(key)); setCounts(s => ({ ...s, [type]: next }))
    startTransition(async () => {
      try { const result = await saveMeal({ flatId, cycleId, userId, mealType: type, count: next, date: effectiveDate }); const savedDate = result?.date ?? effectiveDate; setEffectiveDate(savedDate); toast.success(`${action} · ${confirmDate(savedDate)}`) }
      catch (err) { setCounts(s => ({ ...s, [type]: previous })); const message = err instanceof Error ? err.message : t('common.error'); setError(message); toast.error(message) }
      finally { setPendingActions(p => { const nextPending = new Set(p); nextPending.delete(key); return nextPending }) }
    })
  }

  const mealCard = (type: 'lunch' | 'dinner') => {
    const count = current(type); const selected = count > 0; const label = t(type === 'lunch' ? 'meals.lunch' : 'meals.dinner')
    return <div className={`card p-5 transition ${selected ? 'border-brand-green/30 bg-brand-green/[0.04]' : ''}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Meal</p><h2 className="mt-1 text-xl font-black text-main">{label}</h2></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${selected ? 'bg-brand-green/15 text-brand-green' : 'bg-surface-3 text-muted'}`}>{selected ? <span className="inline-flex items-center gap-1"><Check size={12}/> Counted</span> : 'Skipped'}</span></div>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" className={selected ? 'btn-primary min-h-12' : 'btn-secondary min-h-12'} disabled={busy(type, 1)} aria-pressed={selected} onClick={() => setMeal(type, 1, `Logged ${label}`)}>{busy(type, 1) ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} {t('meals.iAte')}</button><button type="button" className={!selected ? 'btn-primary min-h-12' : 'btn-secondary min-h-12'} disabled={busy(type, 0)} aria-pressed={!selected} onClick={() => setMeal(type, 0, `Skipped ${label.toLowerCase()}`)}>{busy(type, 0) ? <Loader2 size={16} className="animate-spin"/> : null}{t('meals.skip')}</button></div>
      <p className="mt-3 text-xs text-muted">Current count: <span className="font-semibold text-main">{num(count)}</span></p>
    </div>
  }

  return <div className="space-y-4">
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Today</p><p className="mt-1 font-semibold text-main">{effectiveDate}</p></div><p className="text-xs text-muted">{policy === 'opt_out' ? 'Meals are counted by default; tap Skip only when you are not eating.' : 'Meals are not counted until you tap I ate.'}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{mealCard('lunch')}{mealCard('dinner')}</div>
    <div className="card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Extra</p><h2 className="mt-1 text-lg font-bold text-main">{t('meals.extra')}</h2><p className="mt-1 text-xs text-muted">Guest or additional meals for today.</p></div><div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-1"><button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-3 hover:text-main disabled:opacity-40" disabled={busy('extra', current('extra') - 1) || current('extra') === 0} aria-label="Remove extra meal" onClick={() => setMeal('extra', current('extra') - 1, 'Updated extra meals')}>{busy('extra', current('extra') - 1) ? <Loader2 size={16} className="animate-spin"/> : <Minus size={16}/>}</button><span className="min-w-8 text-center text-lg font-black text-main">{num(current('extra'))}</span><button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green text-black shadow-glow hover:bg-brand-green-2 disabled:opacity-40" disabled={busy('extra', current('extra') + 1) || current('extra') >= 100} aria-label="Add extra meal" onClick={() => setMeal('extra', current('extra') + 1, 'Updated extra meals')}>{busy('extra', current('extra') + 1) ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}</button></div></div></div>
    {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}
  </div>
}
