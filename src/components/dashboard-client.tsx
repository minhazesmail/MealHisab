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

      <section className="card overflow-x-auto">
        <div className="mb-4">
          <h2 className="font-semibold">{t('dashboard.memberBalances')}</h2>
          <p className="text-sm text-slate-500">{t('dashboard.balanceHint')}</p>
        </div>
        <table className="w-full min-w-[680px] text-sm">
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
