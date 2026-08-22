'use client'

import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

export type DashboardRow = {
  id: string
  name: string
  meals: number
  mealCost: number
  contribution: number
  balance: number
}

export function DashboardClient({
  flatName,
  inviteCode,
  mealPolicy,
  cycleStart,
  cycleEnd,
  totalMeals,
  foodCost,
  rate,
  totalShared,
  rows,
}: {
  flatName: string
  inviteCode: string
  mealPolicy: string
  cycleStart: string
  cycleEnd: string
  totalMeals: number
  foodCost: number
  rate: number
  totalShared: number
  rows: DashboardRow[]
}) {
  const { t, money, num } = useI18n()

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">
            {cycleStart} → {cycleEnd}
          </p>
          <h1 className="text-2xl font-bold">{flatName}</h1>
        </div>
        <InviteSharePanel inviteCode={inviteCode} flatName={flatName} compact />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">{t('dashboard.totalMeals')}</p>
          <p className="mt-1 text-2xl font-bold">{num(totalMeals)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t('dashboard.foodCost')}</p>
          <p className="mt-1 text-2xl font-bold">{money(foodCost)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t('dashboard.costPerMeal')}</p>
          <p className="mt-1 text-2xl font-bold">{money(rate)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t('dashboard.allShared')}</p>
          <p className="mt-1 text-2xl font-bold">{money(totalShared)}</p>
        </div>
      </div>

      <section className="card">
        <div className="mb-4">
          <h2 className="font-semibold">{t('dashboard.memberBalances')}</h2>
          <p className="text-sm text-slate-500">{t('dashboard.balanceHint')}</p>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-3">{t('dashboard.member')}</th>
                <th>{t('dashboard.meals')}</th>
                <th>{t('dashboard.mealCost')}</th>
                <th>{t('dashboard.contributed')}</th>
                <th>{t('dashboard.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{r.name}</td>
                  <td>{num(r.meals)}</td>
                  <td>{money(r.mealCost)}</td>
                  <td>{money(r.contribution)}</td>
                  <td
                    className={
                      r.balance < 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'
                    }
                  >
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {rows.map((r) => {
            const isNegative = r.balance < 0
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-line bg-surface-2 p-4 transition hover:border-line-strong"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-main">{r.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {t('dashboard.meals')}: {num(r.meals)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-xs">
                      <span className="text-muted">
                        {t('dashboard.mealCost')}: <span className="text-main">{money(r.mealCost)}</span>
                      </span>
                      <span className="text-muted">
                        {t('dashboard.contributed')}: <span className="text-main">{money(r.contribution)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {t('dashboard.balance')}
                    </p>
                    <p
                      className={`mt-1 text-xl font-black tracking-tight ${
                        isNegative ? 'text-red-400' : 'text-brand-green'
                      }`}
                    >
                      {money(r.balance)}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">{t('dashboard.mealPolicy')}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {mealPolicy === 'opt_out' ? t('dashboard.optOutExplain') : t('dashboard.optInExplain')}{' '}
          {t('dashboard.extraExplain')}
        </p>
      </section>
    </div>
  )
}
