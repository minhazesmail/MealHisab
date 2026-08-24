'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CircleDollarSign, Utensils, WalletCards } from 'lucide-react'
import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

export type DashboardRow = { id: string; name: string; meals: number; mealCost: number; contribution: number; balance: number }

export function DashboardClient({ flatName, inviteCode, mealPolicy, cycleStart, cycleEnd, totalMeals, foodCost, rate, totalShared, rows }: {
  flatName: string; inviteCode: string; mealPolicy: string; cycleStart: string; cycleEnd: string; totalMeals: number; foodCost: number; rate: number; totalShared: number; rows: DashboardRow[]
}) {
  const { t, money, num } = useI18n()

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/10 via-surface to-surface p-6 shadow-soft sm:p-7">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-green/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted"><span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-2.5 py-1 text-brand-green">Open cycle</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{cycleStart} → {cycleEnd}</span></div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-main sm:text-4xl">{flatName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Everything for this month’s mess in one place. Log meals first; the rest follows from the same ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/meals" className="btn-primary"><Utensils size={16}/> Log today’s meals <ArrowRight size={15}/></Link>
          <InviteSharePanel inviteCode={inviteCode} flatName={flatName} compact />
        </div>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[['Meals', num(totalMeals), 'people counted this cycle', 'text-brand-green', Utensils], ['Grocery', money(foodCost), 'food spending', 'text-main', CircleDollarSign], ['Meal rate', money(rate), 'cost allocated per meal', 'text-brand-green', WalletCards], ['Shared costs', money(totalShared), 'all cycle expenses', 'text-main', CircleDollarSign]].map(([label, value, meta, tone, Icon]) => {
        const IconComp = Icon as typeof Utensils
        return <div key={String(label)} className="card p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label as string}</p><p className={`mt-2 text-2xl font-black tracking-tight ${tone as string}`}>{value as string}</p><p className="mt-1 text-xs text-muted">{meta as string}</p></div><span className="rounded-xl bg-surface-3 p-2 text-muted"><IconComp size={16}/></span></div></div>
      })}
    </div>

    <section className="card p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><h2 className="text-lg font-bold text-main">Member balances</h2><p className="mt-1 text-sm text-muted">Who has paid enough, and who still owes.</p></div>
        <Link href="/settlements" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-main">View settlements <ArrowRight size={15}/></Link>
      </div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b border-line bg-surface-2/50 text-left text-xs uppercase tracking-[0.12em] text-muted"><th className="px-6 py-3">Member</th><th>Meals</th><th>Meal cost</th><th>Contributed</th><th className="px-6 text-right">Balance</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2/60"><td className="px-6 py-4 font-semibold text-main">{r.name}</td><td>{num(r.meals)}</td><td>{money(r.mealCost)}</td><td>{money(r.contribution)}</td><td className={`px-6 text-right font-bold ${r.balance < 0 ? 'text-danger' : 'text-brand-green'}`}>{money(r.balance)}</td></tr>)}</tbody></table></div>
      <div className="space-y-3 p-4 md:hidden">{rows.map(r => <article key={r.id} className="rounded-2xl border border-line bg-surface-2 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-semibold text-main">{r.name}</h3><p className="mt-1 text-xs text-muted">{t('dashboard.meals')}: {num(r.meals)}</p></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t('dashboard.balance')}</p><p className={`mt-1 text-xl font-black ${r.balance < 0 ? 'text-danger' : 'text-brand-green'}`}>{money(r.balance)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-line p-2.5"><span className="text-muted">{t('dashboard.mealCost')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.mealCost)}</span></div><div className="rounded-xl border border-line p-2.5"><span className="text-muted">{t('dashboard.contributed')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.contribution)}</span></div></div></article>)}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3">
      <Link href="/meals" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><Utensils size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">Log meals</p><p className="mt-1 text-xs leading-5 text-muted">Quick lunch, dinner and extra meals.</p></Link>
      <Link href="/contributions" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><WalletCards size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">Add contribution</p><p className="mt-1 text-xs leading-5 text-muted">Record a deposit and keep balances current.</p></Link>
      <Link href="/reports" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><CalendarDays size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">Review history</p><p className="mt-1 text-xs leading-5 text-muted">See closed cycles and printable statements.</p></Link>
    </section>

    <section className="card bg-surface-2/70"><div className="flex items-start gap-3"><span className="rounded-xl bg-surface-3 p-2 text-brand-green"><Utensils size={16}/></span><div><h2 className="font-semibold text-main">Meal policy</h2><p className="mt-1 text-sm leading-6 text-muted">{mealPolicy === 'opt_out' ? t('dashboard.optOutExplain') : t('dashboard.optInExplain')} {t('dashboard.extraExplain')}</p></div></div></section>
  </div>
}
