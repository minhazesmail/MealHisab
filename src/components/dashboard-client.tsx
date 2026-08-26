'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CircleDollarSign, TrendingUp, Utensils, WalletCards } from 'lucide-react'
import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

export type DashboardRow = { id: string; name: string; meals: number; mealCost: number; contribution: number; balance: number }

function formatDate(value: string, locale: 'en' | 'bn') {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}

export function DashboardClient({ flatName, inviteCode, mealPolicy, cycleStart, cycleEnd, totalMeals, foodCost, rate, totalShared, rows }: {
  flatName: string; inviteCode: string; mealPolicy: string; cycleStart: string; cycleEnd: string; totalMeals: number; foodCost: number; rate: number; totalShared: number; rows: DashboardRow[]
}) {
  const { t, money, num, locale } = useI18n()
  const copy = locale === 'bn'
    ? {
        openCycle: 'চলমান সাইকেল', hero: 'এই মাসের মেসের সব হিসাব এক জায়গায়। মিল, খরচ ও জমার পরিবর্তন এখানেই প্রতিফলিত হবে।', logToday: 'আজকের মিল লগ করুন', mealsMeta: 'এই সাইকেলে লগ করা', grocery: 'বাজার', groceryMeta: 'খাবারের খরচ', mealRate: 'মিল রেট', mealRateMeta: 'প্রতি মিল', sharedCosts: 'মোট খরচ', sharedCostsMeta: 'এই সাইকেলে', balancesHint: 'সবার বর্তমান অবস্থান—কার জমা বেশি, কার বাকি আছে।', viewSettlements: 'সেটেলমেন্ট দেখুন', logMeals: 'মিল লগ করুন', logMealsMeta: 'লাঞ্চ, ডিনার ও অতিরিক্ত মিল দ্রুত যোগ করুন।', addContribution: 'জমা যোগ করুন', addContributionMeta: 'ডিপোজিট রেকর্ড করে ব্যালেন্স হালনাগাদ রাখুন।', reviewHistory: 'রিপোর্ট দেখুন', reviewHistoryMeta: 'বন্ধ সাইকেল ও স্টেটমেন্ট পর্যালোচনা করুন।', overview: 'সাইকেল ওভারভিউ', quickActions: 'দ্রুত কাজ', policy: 'বর্তমান মিল নীতি', positive: 'পাওনা', due: 'বাকি',
      }
    : {
        openCycle: 'Open cycle', hero: 'A clear view of this month’s household ledger. Meals, spending and contributions stay in sync as your cycle moves.', logToday: 'Log today’s meals', mealsMeta: 'logged this cycle', grocery: 'Grocery', groceryMeta: 'food spending', mealRate: 'Meal rate', mealRateMeta: 'per meal', sharedCosts: 'Total spend', sharedCostsMeta: 'this cycle', balancesHint: 'A live view of who is ahead and who still has an amount due.', viewSettlements: 'View settlements', logMeals: 'Log meals', logMealsMeta: 'Add lunch, dinner and extra meals in seconds.', addContribution: 'Add contribution', addContributionMeta: 'Record deposits and keep balances current.', reviewHistory: 'Review reports', reviewHistoryMeta: 'Inspect closed cycles and printable statements.', overview: 'Cycle overview', quickActions: 'Quick actions', policy: 'Current meal policy', positive: 'credit', due: 'due',
      }

  const metrics = [
    { label: t('dashboard.totalMeals'), value: num(totalMeals), meta: copy.mealsMeta, Icon: Utensils, accent: true },
    { label: copy.grocery, value: money(foodCost), meta: copy.groceryMeta, Icon: CircleDollarSign },
    { label: copy.mealRate, value: money(rate), meta: copy.mealRateMeta, Icon: TrendingUp, accent: true },
    { label: copy.sharedCosts, value: money(totalShared), meta: copy.sharedCostsMeta, Icon: WalletCards },
  ]

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgb(var(--brand-green)/.12),transparent_30%),linear-gradient(140deg,rgb(var(--surface)),rgb(var(--surface-2)/.46))]" />
      <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-9">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-green"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" />{copy.openCycle}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"><CalendarDays size={14}/>{formatDate(cycleStart, locale)} <span className="text-line-strong">—</span> {formatDate(cycleEnd, locale)}</span>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-main sm:text-4xl lg:text-[2.65rem]">{flatName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-[15px]">{copy.hero}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/meals" className="btn-primary"><Utensils size={16}/>{copy.logToday}<ArrowRight size={15}/></Link>
          <InviteSharePanel inviteCode={inviteCode} flatName={flatName} compact />
        </div>
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><p className="eyebrow">{copy.overview}</p><span className="text-xs text-muted">{formatDate(cycleEnd, locale)}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, meta, Icon, accent }) => <article key={String(label)} className="group rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-line-strong">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-muted">{label}</p><p className={`mt-2.5 text-2xl font-black tracking-[-0.025em] ${accent ? 'text-brand-green' : 'text-main'}`}>{value}</p><p className="mt-1 text-[11px] text-muted">{meta}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl border ${accent ? 'border-brand-green/15 bg-brand-green/10 text-brand-green' : 'border-line bg-surface-2 text-muted'}`}><Icon size={17}/></span></div>
        </article>)}
      </div>
    </section>

    <section className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><p className="eyebrow">{t('dashboard.memberBalances')}</p><h2 className="mt-1.5 text-xl font-bold tracking-tight text-main">{copy.balancesHint}</h2></div>
        <Link href="/settlements" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green transition hover:text-main">{copy.viewSettlements}<ArrowRight size={15}/></Link>
      </div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b border-line bg-surface-2/55 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted"><th className="px-6 py-3.5">{t('dashboard.member')}</th><th>{t('dashboard.meals')}</th><th>{t('dashboard.mealCost')}</th><th>{t('dashboard.contributed')}</th><th className="px-6 text-right">{t('dashboard.balance')}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-line last:border-0 transition hover:bg-surface-2/55"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-main">{r.name.slice(0, 1).toUpperCase()}</span><span className="font-semibold text-main">{r.name}</span></div></td><td className="text-muted">{num(r.meals)}</td><td className="text-muted">{money(r.mealCost)}</td><td className="text-muted">{money(r.contribution)}</td><td className="px-6 text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${r.balance < 0 ? 'bg-danger/10 text-danger' : 'bg-brand-green/10 text-brand-green'}`}>{money(r.balance)}</span></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-line md:hidden">{rows.map(r => <article key={r.id} className="p-4"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-main">{r.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><h3 className="truncate font-semibold text-main">{r.name}</h3><p className="mt-0.5 text-xs text-muted">{t('dashboard.meals')}: {num(r.meals)}</p></div></div><div className="text-right"><p className={`text-lg font-black ${r.balance < 0 ? 'text-danger' : 'text-brand-green'}`}>{money(r.balance)}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">{r.balance < 0 ? copy.due : copy.positive}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-surface-2 px-3 py-2.5"><span className="text-muted">{t('dashboard.mealCost')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.mealCost)}</span></div><div className="rounded-xl bg-surface-2 px-3 py-2.5"><span className="text-muted">{t('dashboard.contributed')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.contribution)}</span></div></div></article>)}</div>
    </section>

    <section>
      <p className="eyebrow mb-3">{copy.quickActions}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['/meals', Utensils, copy.logMeals, copy.logMealsMeta],
          ['/contributions', WalletCards, copy.addContribution, copy.addContributionMeta],
          ['/reports', CalendarDays, copy.reviewHistory, copy.reviewHistoryMeta],
        ].map(([href, Icon, title, meta]) => { const IconComp = Icon as typeof Utensils; return <Link key={String(href)} href={String(href)} className="group rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-line-strong"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green/10 text-brand-green"><IconComp size={17}/></span><ArrowRight size={16} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-green"/></div><p className="mt-4 font-bold text-main">{title as string}</p><p className="mt-1.5 text-xs leading-5 text-muted">{meta as string}</p></Link> })}
      </div>
    </section>

    <section className="rounded-2xl border border-line bg-surface-2/65 p-5"><div className="flex items-start gap-3.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-brand-green"><Utensils size={16}/></span><div><p className="eyebrow">{copy.policy}</p><p className="mt-1.5 text-sm leading-6 text-muted">{mealPolicy === 'opt_out' ? t('dashboard.optOutExplain') : t('dashboard.optInExplain')} {t('dashboard.extraExplain')}</p></div></div></section>
  </div>
}
