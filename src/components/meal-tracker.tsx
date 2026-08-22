'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveMeal } from '@/app/actions'
import { useI18n } from '@/components/language-provider'

type MealType = 'lunch' | 'dinner' | 'extra'

type Props = {
  flatId: string
  cycleId: string
  userId: string
  date: string
  policy: 'opt_in' | 'opt_out'
  initial: Record<string, number>
}

export default function MealTracker({ flatId, cycleId, userId, date, policy, initial }: Props) {
  const { t, num } = useI18n()
  const [, startTransition] = useTransition()
  const [counts, setCounts] = useState<Record<string, number>>(initial)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(date)

  const current = (type: MealType) =>
    counts[type] ?? (type === 'extra' ? 0 : policy === 'opt_out' ? 1 : 0)

  const formatConfirmationDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed)
  }

  const setMeal = (type: MealType, count: number, actionKey: string) => {
    const next = Math.max(0, Math.min(100, count))
    const previous = current(type)
    const requestKey = `${type}:${next}`
    setError('')
    setPendingAction(requestKey)
    setCounts((state) => ({ ...state, [type]: next }))

    startTransition(async () => {
      try {
        const result = await saveMeal({
          flatId,
          cycleId,
          userId,
          mealType: type,
          count: next,
          date: effectiveDate,
        })
        const savedDate = result?.date ?? effectiveDate
        setEffectiveDate(savedDate)
        toast.success(`${actionKey} for ${formatConfirmationDate(savedDate)}`)
      } catch (err) {
        setCounts((state) => ({ ...state, [type]: previous }))
        const message = err instanceof Error ? err.message : t('common.error')
        setError(message)
        toast.error(message)
      } finally {
        setPendingAction(null)
      }
    })
  }

  const buttonBusy = (type: MealType, count: number) =>
    pendingAction === `${type}:${count}`

  const renderLoader = (type: MealType, count: number) =>
    buttonBusy(type, count) ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Date: <span className="font-semibold text-slate-700">{effectiveDate}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="mb-3 font-semibold">{t('meals.lunch')}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={current('lunch') > 0 ? 'btn-primary' : 'btn-secondary'}
              disabled={pendingAction !== null}
              onClick={() => setMeal('lunch', 1, `Logged ${t('meals.lunch')}`)}
            >
              {renderLoader('lunch', 1)}
              {t('meals.iAte')}
            </button>
            <button
              type="button"
              className={current('lunch') === 0 ? 'btn-primary' : 'btn-secondary'}
              disabled={pendingAction !== null}
              onClick={() => setMeal('lunch', 0, `Skipped ${t('meals.lunch').toLowerCase()}`)}
            >
              {renderLoader('lunch', 0)}
              {t('meals.skip')}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {t('meals.currentCount')}: {num(current('lunch'))}
          </p>
        </div>

        <div className="card">
          <div className="mb-3 font-semibold">{t('meals.dinner')}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={current('dinner') > 0 ? 'btn-primary' : 'btn-secondary'}
              disabled={pendingAction !== null}
              onClick={() => setMeal('dinner', 1, `Logged ${t('meals.dinner')}`)}
            >
              {renderLoader('dinner', 1)}
              {t('meals.iAte')}
            </button>
            <button
              type="button"
              className={current('dinner') === 0 ? 'btn-primary' : 'btn-secondary'}
              disabled={pendingAction !== null}
              onClick={() => setMeal('dinner', 0, `Skipped ${t('meals.dinner').toLowerCase()}`)}
            >
              {renderLoader('dinner', 0)}
              {t('meals.skip')}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {t('meals.currentCount')}: {num(current('dinner'))}
          </p>
        </div>

        <div className="card sm:col-span-2">
          <div className="mb-2 font-semibold">{t('meals.extra')}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={pendingAction !== null || current('extra') === 0}
              onClick={() => setMeal('extra', current('extra') - 1, 'Updated extra meals')}
            >
              {renderLoader('extra', current('extra') - 1)}
              −
            </button>
            <span className="min-w-10 text-center text-lg font-semibold">{num(current('extra'))}</span>
            <button
              type="button"
              className="btn-primary"
              disabled={pendingAction !== null || current('extra') >= 100}
              onClick={() => setMeal('extra', current('extra') + 1, 'Updated extra meals')}
            >
              {renderLoader('extra', current('extra') + 1)}
              +
            </button>
            <span className="text-sm text-slate-500">{t('meals.guests')}</span>
          </div>
        </div>

        {error && (
          <p className="sm:col-span-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
