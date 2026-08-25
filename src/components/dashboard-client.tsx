'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CircleDollarSign, Utensils, WalletCards } from 'lucide-react'
import { useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

export type DashboardRow = { id: string; name: string; meals: number; mealCost: number; contribution: number; balance: number }

export function DashboardClient({ flatName, inviteCode, mealPolicy, cycleStart, cycleEnd, totalMeals, foodCost, rate, totalShared, rows }: {
  flatName: string; inviteCode: string; mealPolicy: string; cycleStart: string; cycleEnd: string; totalMeals: number; foodCost: number; rate: number; totalShared: number; rows: DashboardRow[]
}) {
  const { t, money, num, locale } = useI18n()
  const copy = locale === 'bn'
    ? {
        openCycle: 'চলমান সাইকেল',
        hero: 'এই মাসের মেসের সব হিসাব এক জায়গায়। আগে মিল লগ করুন; বাকি হিসাব একই লেজার থেকে আপডেট হবে।',
        logToday: 'আজকের মিল লগ করুন',
        mealsMeta: 'এই সাইকেলে লগ করা মোট মিল',
        grocery: 'বাজার',
        groceryMeta: 'খাবারের খরচ',
        mealRate: 'মিল রেট',
        mealRateMeta: 'প্রতি মিলের বরাদ্দ খরচ',
        sharedCosts: 'শেয়ার্ড খরচ',
        sharedCostsMeta: 'সাইকেলের সব খরচ',
        balancesHint: 'কে যথেষ্ট জমা দিয়েছেন এবং কার এখনও বাকি আছে।',
        viewSettlements: 'সেটেলমেন্ট দেখুন',
        logMeals: 'মিল লগ করুন',
        logMealsMeta: 'দ্রুত লাঞ্চ, ডিনার ও অতিরিক্ত মিল যোগ করুন।',
        addContribution: 'জমা যোগ করুন',
        addContributionMeta: 'ডিপোজিট রেকর্ড করুন এবং ব্যালেন্স আপডেট রাখুন।',
        reviewHistory: 'ইতিহাস দেখুন',
        reviewHistoryMeta: 'বন্ধ সাইকেল ও প্রিন্টযোগ্য স্টেটমেন্ট দেখুন।',
      }
    : {
        openCycle: 'Open cycle',
        hero: 'Everything for this month’s mess in one place. Log meals first; the rest follows from the same ledger.',
        logToday: 'Log today’s meals',
        mealsMeta: 'logged this cycle',
        grocery: 'Grocery',
        groceryMeta: 'food spending',
        mealRate: 'Meal rate',
        mealRateMeta: 'cost allocated per meal',
        sharedCosts: 'Shared costs',
        sharedCostsMeta: 'all cycle expenses',
        balancesHint: 'Who has paid enough, and who still owes.',
        viewSettlements: 'View settlements',
        logMeals: 'Log meals',
        logMealsMeta: 'Quick lunch, dinner and extra meals.',
        addContribution: 'Add contribution',
        addContributionMeta: 'Record a deposit and keep balances current.',
        reviewHistory: 'Review history',
        reviewHistoryMeta: 'See closed cycles and printable statements.',
      }

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/10 via-surface to-surface p-6 shadow-soft sm:p-7">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-green/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted"><span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-2.5 py-1 text-brand-green">{copy.openCycle}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{cycleStart} → {cycleEnd}</span></div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-main sm:text-4xl">{flatName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy.hero}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/meals" className="btn-primary"><Utensils size={16}/> {copy.logToday} <ArrowRight size={15}/></Link>
          <InviteSharePanel inviteCode={inviteCode} flatName={flatName} compact />
        </div>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[[t('dashboard.totalMeals'), num(totalMeals), copy.mealsMeta, 'text-brand-green', Utensils], [copy.grocery, money(foodCost), copy.groceryMeta, 'text-main', CircleDollarSign], [copy.mealRate, money(rate), copy.mealRateMeta, 'text-brand-green', WalletCards], [copy.sharedCosts, money(totalShared), copy.sharedCostsMeta, 'text-main', CircleDollarSign]].map(([label, value, meta, tone, Icon]) => {
        const IconComp = Icon as typeof Utensils
        return <div key={String(label)} className="card p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label as string}</p><p className={`mt-2 text-2xl font-black tracking-tight ${tone as string}`}>{value as string}</p><p className="mt-1 text-xs text-muted">{meta as string}</p></div><span className="rounded-xl bg-surface-3 p-2 text-muted"><IconComp size={16}/></span></div></div>
      })}
    </div>

    <section className="card p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><h2 className="text-lg font-bold text-main">{t('dashboard.memberBalances')}</h2><p className="mt-1 text-sm text-muted">{copy.balancesHint}</p></div>
        <Link href="/settlements" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-main">{copy.viewSettlements} <ArrowRight size={15}/></Link>
      </div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b border-line bg-surface-2/50 text-left text-xs uppercase tracking-[0.12em] text-muted"><th className="px-6 py-3">{t('dashboard.member')}</th><th>{t('dashboard.meals')}</th><th>{t('dashboard.mealCost')}</th><th>{t('dashboard.contributed')}</th><th className="px-6 text-right">{t('dashboard.balance')}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2/60"><td className="px-6 py-4 font-semibold text-main">{r.name}</td><td>{num(r.meals)}</td><td>{money(r.mealCost)}</td><td>{money(r.contribution)}</td><td className={`px-6 text-right font-bold ${r.balance < 0 ? 'text-danger' : 'text-brand-green'}`}>{money(r.balance)}</td></tr>)}</tbody></table></div>
      <div className="space-y-3 p-4 md:hidden">{rows.map(r => <article key={r.id} className="rounded-2xl border border-line bg-surface-2 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-semibold text-main">{r.name}</h3><p className="mt-1 text-xs text-muted">{t('dashboard.meals')}: {num(r.meals)}</p></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t('dashboard.balance')}</p><p className={`mt-1 text-xl font-black ${r.balance < 0 ? 'text-danger' : 'text-brand-green'}`}>{money(r.balance)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-line p-2.5"><span className="text-muted">{t('dashboard.mealCost')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.mealCost)}</span></div><div className="rounded-xl border border-line p-2.5"><span className="text-muted">{t('dashboard.contributed')}</span><span className="mt-0.5 block font-semibold text-main">{money(r.contribution)}</span></div></div></article>)}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3">
      <Link href="/meals" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><Utensils size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">{copy.logMeals}</p><p className="mt-1 text-xs leading-5 text-muted">{copy.logMealsMeta}</p></Link>
      <Link href="/contributions" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><WalletCards size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">{copy.addContribution}</p><p className="mt-1 text-xs leading-5 text-muted">{copy.addContributionMeta}</p></Link>
      <Link href="/reports" className="card group p-4 transition hover:-translate-y-0.5 hover:border-line-strong"><CalendarDays size={18} className="text-brand-green"/><p className="mt-3 font-bold text-main">{copy.reviewHistory}</p><p className="mt-1 text-xs leading-5 text-muted">{copy.reviewHistoryMeta}</p></Link>
    </section>

    <section className="card bg-surface-2/70"><div className="flex items-start gap-3"><span className="rounded-xl bg-surface-3 p-2 text-brand-green"><Utensils size={16}/></span><div><h2 className="font-semibold text-main">{t('dashboard.mealPolicy')}</h2><p className="mt-1 text-sm leading-6 text-muted">{mealPolicy === 'opt_out' ? t('dashboard.optOutExplain') : t('dashboard.optInExplain')} {t('dashboard.extraExplain')}</p></div></div></section>
  </div>
}
