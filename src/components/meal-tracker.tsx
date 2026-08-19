'use client'

import { useState, useTransition } from 'react'
import { saveMeal } from '@/app/actions'
import { useI18n } from '@/components/language-provider'

type MealType = 'lunch' | 'dinner' | 'extra'

type Props = {
  flatId: string
  cycleId: string
  userId: string
  /** Pre-assigned cycle date (server computed Dhaka today, clamped to cycle). */
  date: string
  policy: 'opt_in' | 'opt_out'
  initial: Record<string, number>
}

export default function MealTracker({ flatId, cycleId, userId, date, policy, initial }: Props) {
  const { t, num } = useI18n()
  const [pending, startTransition] = useTransition()
  const [counts, setCounts] = useState<Record<string, number>>(initial)
  const [error, setError] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(date)

  const current = (type: MealType) =>
    counts[type] ?? (type === 'extra' ? 0 : policy === 'opt_out' ? 1 : 0)

  const setMeal = (type: MealType, count: number) => {
    const next = Math.max(0, Math.min(100, count))
    const previous = current(type)
    setError('')
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
        if (result?.date) setEffectiveDate(result.date)
      } catch (err) {
        setCounts((state) => ({ ...state, [type]: previous }))
        setError(err instanceof Error ? err.message : t('common.error'))
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {t('meals.autoDate')}: <span className="font-semibold text-slate-700">{effectiveDate}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="mb-3 font-semibold">{t('meals.lunch')}</div>
          <div className="flex gap-2">
            <button type="button" className={current('lunch') > 0 ? 'btn-primary' : 'btn-secondary'} disabled={pending} onClick={() => setMeal('lunch', 1)}>
              {t('meals.iAte')}
            </button>
            <button type="button" className={current('lunch') === 0 ? 'btn-primary' : 'btn-secondary'} disabled={pending} onClick={() => setMeal('lunch', 0)}>
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
            <button type="button" className={current('dinner') > 0 ? 'btn-primary' : 'btn-secondary'} disabled={pending} onClick={() => setMeal('dinner', 1)}>
              {t('meals.iAte')}
            </button>
            <button type="button" className={current('dinner') === 0 ? 'btn-primary' : 'btn-secondary'} disabled={pending} onClick={() => setMeal('dinner', 0)}>
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
            <button type="button" className="btn-secondary" disabled={pending || current('extra') === 0} onClick={() => setMeal('extra', current('extra') - 1)}>
              −
            </button>
            <span className="min-w-10 text-center text-lg font-semibold">{num(current('extra'))}</span>
            <button type="button" className="btn-primary" disabled={pending || current('extra') >= 100} onClick={() => setMeal('extra', current('extra') + 1)}>
              +
            </button>
            <span className="text-sm text-slate-500">{t('meals.guests')}</span>
          </div>
        </div>
        {error && (
          <p className="sm:col-span-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
