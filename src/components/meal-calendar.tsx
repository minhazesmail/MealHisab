'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { setCycleClosedDay, removeCycleClosedDay } from '@/app/actions'
import { useI18n } from '@/components/language-provider'
import { toBanglaDigits } from '@/lib/i18n'

type ClosedDay = { date: string; reason: string }
type MealLog = { date: string; meal_type: string; count: number }

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
]

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseYmd(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function MealCalendar({
  cycleId,
  cycleStart,
  cycleEnd,
  closedDays,
  mealLogs,
  canManage,
}: {
  cycleId: string
  cycleStart: string
  cycleEnd: string
  closedDays: ClosedDay[]
  mealLogs: MealLog[]
  canManage: boolean
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const startDate = parseYmd(cycleStart)
  const endDate = parseYmd(cycleEnd)
  const [view, setView] = useState(() => new Date(startDate.getFullYear(), startDate.getMonth(), 1))

  const closedMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of closedDays) m.set(d.date, d.reason)
    return m
  }, [closedDays])

  const mealByDate = useMemo(() => {
    const m = new Map<string, { lunch: number; dinner: number; extra: number }>()
    for (const log of mealLogs) {
      const cur = m.get(log.date) ?? { lunch: 0, dinner: 0, extra: 0 }
      if (log.meal_type === 'lunch') cur.lunch = log.count
      else if (log.meal_type === 'dinner') cur.dinner = log.count
      else if (log.meal_type === 'extra') cur.extra = log.count
      m.set(log.date, cur)
    }
    return m
  }, [mealLogs])

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const weekdays = locale === 'bn' ? WEEKDAYS_BN : WEEKDAYS_EN
  const monthName = locale === 'bn' ? MONTHS_BN[month] : MONTHS_EN[month]
  const titleYear = locale === 'bn' ? toBanglaDigits(year) : String(year)

  function inCycle(d: Date) {
    const t0 = d.getTime()
    return t0 >= startDate.getTime() && t0 <= endDate.getTime()
  }

  function markClosed() {
    if (!selected || !canManage) return
    setError('')
    start(async () => {
      try {
        await setCycleClosedDay({
          cycleId,
          date: selected,
          reason: reason.trim() || t('calendar.defaultReason'),
        })
        setReason('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      }
    })
  }

  function reopen() {
    if (!selected || !canManage) return
    setError('')
    start(async () => {
      try {
        await removeCycleClosedDay({ cycleId, date: selected })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      }
    })
  }

  const selectedClosed = selected ? closedMap.get(selected) : undefined
  const selectedMeals = selected ? mealByDate.get(selected) : undefined

  function DayDetail({ mobile = false }: { mobile?: boolean }) {
    return (
      <div className={`card space-y-4 ${mobile ? 'rounded-b-none border-x-0 border-b-0 pb-[calc(1rem+env(safe-area-inset-bottom))]' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t('calendar.dayDetail')}</h2>
          {mobile && (
            <button
              type="button"
              className="btn-secondary rounded-full p-2"
              onClick={() => setSelected(null)}
              aria-label={t('common.cancel')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {!selected && <p className="text-sm text-muted">{t('calendar.pickDay')}</p>}
        {selected && (
          <>
            <div>
              <div className="text-xs text-muted">{t('calendar.date')}</div>
              <div className="font-semibold">{locale === 'bn' ? toBanglaDigits(selected) : selected}</div>
            </div>
            {selectedClosed ? (
              <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-semibold">{t('calendar.closed')}</div>
                <div className="mt-1">{selectedClosed}</div>
                {canManage && (
                  <button type="button" className="btn-secondary mt-3 text-xs" disabled={pending} onClick={reopen}>
                    {pending ? t('common.saving') : t('calendar.reopen')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>{t('meals.lunch')}: <strong>{selectedMeals?.lunch ?? '—'}</strong></div>
                <div>{t('meals.dinner')}: <strong>{selectedMeals?.dinner ?? '—'}</strong></div>
                <div>{t('meals.extra')}: <strong>{selectedMeals?.extra ?? 0}</strong></div>
                {canManage && (
                  <div className="space-y-2 border-t border-line pt-3">
                    <p className="text-xs text-muted">{t('calendar.markHelp')}</p>
                    <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('calendar.reasonPlaceholder')} maxLength={200} />
                    <button type="button" className="btn-primary w-full" disabled={pending} onClick={markClosed}>
                      {pending ? t('common.saving') : t('calendar.markClosed')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
        <p className="text-sm text-muted">{t('calendar.sub')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_.9fr]">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" className="btn-secondary min-h-11 min-w-11 p-2" onClick={() => setView(new Date(year, month - 1, 1))} aria-label={t('calendar.prev')}>
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-semibold">{monthName} {titleYear}</h2>
            <button type="button" className="btn-secondary min-h-11 min-w-11 p-2" onClick={() => setView(new Date(year, month + 1, 1))} aria-label={t('calendar.next')}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />
              const ymd = toYmd(d)
              const closed = closedMap.has(ymd)
              const meals = mealByDate.get(ymd)
              const active = inCycle(d)
              const isSelected = selected === ymd
              const isToday = ymd === toYmd(new Date())
              const dayLabel = locale === 'bn' ? toBanglaDigits(d.getDate()) : String(d.getDate())
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={!active}
                  onClick={() => setSelected(ymd)}
                  aria-label={`${dayLabel} ${monthName} ${year}`}
                  className={`min-h-[64px] rounded-xl border p-2.5 text-left transition sm:p-1.5 ${
                    !active
                      ? 'border-transparent bg-slate-50 text-slate-300'
                      : isSelected
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : closed
                          ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                          : 'border-slate-100 bg-white hover:border-slate-300'
                  } ${isToday && active ? 'font-bold' : ''}`}
                >
                  <div className="text-xs">{dayLabel}</div>
                  {active && closed && <div className="mt-1 truncate text-[10px] font-medium text-amber-700">{t('calendar.closed')}</div>}
                  {active && !closed && meals && (meals.lunch > 0 || meals.dinner > 0 || meals.extra > 0) && (
                    <div className="mt-1 flex flex-wrap gap-0.5" aria-hidden="true">
                      {meals.lunch > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {meals.dinner > 0 && <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
                      {meals.extra > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('meals.lunch')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-600" /> {t('meals.dinner')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> {t('meals.extra')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400" /> {t('calendar.closed')}</span>
          </div>
        </section>

        <div className="hidden lg:block">
          <DayDetail />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('calendar.dayDetail')}>
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setSelected(null)} aria-label={t('common.cancel')} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto animate-[slideUp_.22s_ease-out]">
            <DayDetail mobile />
          </div>
        </div>
      )}
    </div>
  )
}
