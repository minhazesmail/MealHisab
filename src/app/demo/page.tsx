'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  CalendarX2,
  Check,
  CircleDollarSign,
  ClipboardList,
  Home,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Utensils,
  Users,
  WalletCards,
} from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'

type Tab = 'overview' | 'meals' | 'calendar' | 'expenses' | 'contributions' | 'operations' | 'reports'
type Role = 'Admin' | 'Manager' | 'Member'
type Member = {
  id: string
  name: string
  role: Role
  meals: number
  contribution: number
  status: 'active' | 'left'
  activeTo: string | null
}
type Expense = { id: number; note: string; category: string; amount: number }
type ClosedDay = { date: string; reason: string }
type Contribution = { id: number; memberId: string; amount: number; note: string; date: string }
type TabDefinition = { id: Tab; label: string; icon: LucideIcon }
type DemoStat = { label: string; value: string; icon: LucideIcon }

const START = '2026-08-01'
const END = '2026-08-31'

const initialMembers: Member[] = [
  { id: 'rahim', name: 'Rahim Ahmed', role: 'Admin', meals: 38, contribution: 2400, status: 'active', activeTo: null },
  { id: 'nabila', name: 'Nabila Karim', role: 'Manager', meals: 32, contribution: 1500, status: 'active', activeTo: null },
  { id: 'sajid', name: 'Sajid Hasan', role: 'Member', meals: 29, contribution: 1000, status: 'active', activeTo: null },
  { id: 'tania', name: 'Tania Sultana', role: 'Member', meals: 26, contribution: 1200, status: 'active', activeTo: null },
]

const initialExpenses: Expense[] = [
  { id: 1, note: 'Grocery run — Agora', category: 'Grocery', amount: 4200 },
  { id: 2, note: 'Cook salary', category: 'Cook salary', amount: 4500 },
  { id: 3, note: 'Gas refill', category: 'Gas', amount: 950 },
]

const initialClosedDays: ClosedDay[] = [{ date: '2026-08-15', reason: 'Eid holiday' }]

const initialContributions: Contribution[] = [
  { id: 1, memberId: 'rahim', amount: 2400, note: 'Opening deposit', date: '2026-08-01' },
  { id: 2, memberId: 'nabila', amount: 1500, note: 'Week 1', date: '2026-08-03' },
  { id: 3, memberId: 'sajid', amount: 1000, note: 'Cash', date: '2026-08-05' },
  { id: 4, memberId: 'tania', amount: 1200, note: 'bKash', date: '2026-08-07' },
]

const guidedSteps: TabDefinition[] = [
  { id: 'meals', label: 'Meals', icon: Utensils },
  { id: 'contributions', label: 'Contribution', icon: CircleDollarSign },
  { id: 'expenses', label: 'Expense', icon: ClipboardList },
  { id: 'reports', label: 'Settlement', icon: BarChart3 },
]

const exploreTabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'operations', label: 'Operations', icon: Users },
]

const inputClass = 'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-main outline-none placeholder:text-muted focus:border-line-strong focus:ring-2 focus:ring-brand-green/20'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-black shadow-glow transition hover:bg-brand-green-2 active:scale-[.99]'

function dateInDhaka() {
  const value = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  if (value < START) return START
  if (value > END) return END
  return value
}

function money(value: number) {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#demo-logo)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <defs><linearGradient id="demo-logo" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#39FF88" /><stop offset="1" stopColor="#19D96B" /></linearGradient></defs>
    </svg>
  )
}

export default function DemoPage() {
  const { t, locale } = useI18n()
  const assignedDate = dateInDhaka()
  const [active, setActive] = useState<Tab>('meals')
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [closedDays, setClosedDays] = useState<ClosedDay[]>(initialClosedDays)
  const [contributions, setContributions] = useState<Contribution[]>(initialContributions)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Other')
  const [contributionMember, setContributionMember] = useState('sajid')
  const [contributionAmount, setContributionAmount] = useState('500')
  const [contributionNote, setContributionNote] = useState('')
  const [closedDate, setClosedDate] = useState('2026-08-20')
  const [closedReason, setClosedReason] = useState('Mess closed')
  const [leftMember, setLeftMember] = useState('sajid')
  const [leftDate, setLeftDate] = useState('2026-08-20')

  const activeMembers = useMemo(() => members.filter((member) => member.status === 'active'), [members])
  const totalMeals = useMemo(() => activeMembers.reduce((sum, member) => sum + member.meals, 0), [activeMembers])
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses])
  const totalContributions = useMemo(() => members.reduce((sum, member) => sum + member.contribution, 0), [members])
  const mealRate = totalMeals === 0 ? 0 : Math.round((totalExpenses / totalMeals) * 100) / 100
  const weekdays = locale === 'bn' ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const guidedIndex = guidedSteps.findIndex((step) => step.id === active)

  const stats: DemoStat[] = [
    { label: 'Total meals', value: String(totalMeals), icon: Utensils },
    { label: 'Shared costs', value: money(totalExpenses), icon: ClipboardList },
    { label: 'Meal rate', value: money(mealRate), icon: CircleDollarSign },
    { label: 'Contributions', value: money(totalContributions), icon: WalletCards },
  ]

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function updateMeal(memberId: string, delta: number) {
    setMembers((current) => current.map((member) => (
      member.id === memberId && member.status === 'active'
        ? { ...member, meals: Math.max(0, member.meals + delta) }
        : member
    )))
    notify(delta > 0 ? `Meal added for ${assignedDate}.` : `Meal removed for ${assignedDate}.`)
    if (delta > 0) window.setTimeout(() => setActive('contributions'), 500)
  }

  function addExpense() {
    const amount = Math.round(Number(expenseAmount) * 100) / 100
    if (!expenseNote.trim() || amount <= 0) {
      notify('Enter an expense note and a valid amount.')
      return
    }
    setExpenses((current) => [
      ...current,
      { id: Date.now(), note: expenseNote.trim(), category: expenseCategory, amount },
    ])
    setExpenseNote('')
    setExpenseAmount('')
    notify('Expense added. See how it changes the settlement.')
    window.setTimeout(() => setActive('reports'), 500)
  }

  function addContribution() {
    const amount = Math.round(Number(contributionAmount) * 100) / 100
    if (amount <= 0) {
      notify('Enter a valid contribution amount.')
      return
    }
    setMembers((current) => current.map((member) => (
      member.id === contributionMember && member.status === 'active'
        ? { ...member, contribution: Math.round((member.contribution + amount) * 100) / 100 }
        : member
    )))
    setContributions((current) => [
      { id: Date.now(), memberId: contributionMember, amount, note: contributionNote.trim() || 'Deposit', date: assignedDate },
      ...current,
    ])
    setContributionAmount('')
    setContributionNote('')
    notify(`${money(amount)} contribution recorded. Next: add an expense.`)
    window.setTimeout(() => setActive('expenses'), 500)
  }

  function addClosedDay() {
    if (!closedDate || closedDays.some((day) => day.date === closedDate)) {
      notify('That date is already closed or invalid.')
      return
    }
    setClosedDays((current) => [...current, { date: closedDate, reason: closedReason.trim() || 'Mess closed' }].sort((a, b) => a.date.localeCompare(b.date)))
    notify('Closed day added.')
  }

  function markLeft() {
    const member = members.find((item) => item.id === leftMember)
    if (!member || member.status === 'left') return
    setMembers((current) => current.map((item) => (
      item.id === leftMember ? { ...item, status: 'left', activeTo: leftDate } : item
    )))
    notify(`${member.name} left on ${leftDate}.`)
  }

  function resetDemo() {
    setMembers(initialMembers)
    setExpenses(initialExpenses)
    setClosedDays(initialClosedDays)
    setContributions(initialContributions)
    setSelectedDate(null)
    setActive('meals')
    notify('Demo reset. Start by adding a meal.')
  }

  function settlementFor(member: Member) {
    const cost = Math.round(member.meals * mealRate * 100) / 100
    return Math.round((member.contribution - cost) * 100) / 100
  }

  return (
    <main className="min-h-screen bg-canvas text-main">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div><p className="text-sm font-black">MealHisab</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">{t('demo.badge')}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button type="button" onClick={resetDemo} className="hidden items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold sm:inline-flex"><RotateCcw size={14} /> {locale === 'bn' ? 'রিসেট' : 'Reset'}</button>
            <Link href="/account-type" className="rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-black">{locale === 'bn' ? 'নিজের ফ্ল্যাট শুরু করুন' : 'Start with your flat'}</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="rounded-3xl border border-brand-green/25 bg-gradient-to-r from-brand-green/10 via-surface to-surface px-5 py-5 shadow-soft sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">{locale === 'bn' ? '৪ ধাপের গাইডেড ডেমো' : '4-step guided demo'}</p><p className="mt-1 text-lg font-black">{locale === 'bn' ? 'একটি মিল থেকে মাসের সেটেলমেন্ট পর্যন্ত দেখুন।' : 'See the flow from one meal to the monthly settlement.'}</p><p className="mt-1 max-w-2xl text-sm text-muted">{locale === 'bn' ? 'স্যাম্পল ডেটায় কাজ করুন—কোনো বাস্তব ডেটাবেস পরিবর্তন হবে না।' : 'Use sample data and follow the steps. Nothing here changes a real database.'}</p></div>
            <button type="button" onClick={() => setActive('meals')} className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-black">{locale === 'bn' ? 'ডেমো শুরু করুন' : 'Start the tour'}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 sm:px-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-3xl border border-line bg-surface p-3 shadow-soft lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-3 rounded-2xl border border-line bg-surface-2 px-3 py-3"><p className="text-xs font-bold">Mirpur Mess</p><p className="mt-1 text-[11px] text-muted">01–31 Aug 2026 · {locale === 'bn' ? 'তারিখ' : 'Date'}: {assignedDate}</p></div>
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{locale === 'bn' ? 'গাইডেড পথ' : 'Guided path'}</div>
          <nav className="space-y-1">
            {guidedSteps.map((step, index) => {
              const Icon = step.icon
              const activeStep = active === step.id
              const complete = guidedIndex > index || active === 'reports' && index < 3
              return <button type="button" key={step.id} onClick={() => setActive(step.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold ${activeStep ? 'border border-line-strong bg-surface-3 text-brand-green shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-main'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${complete ? 'bg-brand-green text-black' : activeStep ? 'border border-brand-green text-brand-green' : 'border border-line-strong'}`}>{complete ? <Check size={13}/> : index + 1}</span><Icon size={16}/><span>{locale === 'bn' ? ['মিল','কন্ট্রিবিউশন','খরচ','সেটেলমেন্ট'][index] : step.label}</span></button>
            })}
          </nav>
          <div className="my-4 border-t border-line" />
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{locale === 'bn' ? 'সবকিছু দেখুন' : 'Explore everything'}</div>
          <nav className="space-y-1">{exploreTabs.map((tab) => { const Icon = tab.icon; return <button type="button" key={tab.id} onClick={() => setActive(tab.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${active === tab.id ? 'border border-line-strong bg-surface-3 text-brand-green' : 'text-muted hover:bg-surface-2 hover:text-main'}`}><Icon size={15}/>{tab.label}</button> })}</nav>
          <div className="mt-4 hidden rounded-2xl border border-brand-green/15 bg-brand-green/5 p-3 text-[11px] text-muted lg:block"><div className="flex items-center gap-2 text-brand-green"><ShieldCheck size={14} /><strong>{locale === 'bn' ? 'নিরাপদ ডেমো মোড' : 'Safe demo mode'}</strong></div><p className="mt-1">{locale === 'bn' ? 'কোনো ডেটাবেস পরিবর্তন নয়। যেকোনো সময় রিসেট করুন।' : 'No database changes. Reset anytime.'}</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">{locale === 'bn' ? 'ইন্টারঅ্যাক্টিভ প্রোডাক্ট ট্যুর' : 'Interactive product tour'}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{locale === 'bn' ? 'চারটি কাজেই MealHisab বুঝে নিন।' : 'Understand MealHisab in four actions.'}</h1><p className="mt-1 max-w-2xl text-sm text-muted">{locale === 'bn' ? 'একটি মিল যোগ করুন, কন্ট্রিবিউশন দিন, একটি খরচ লিখুন, তারপর সেটেলমেন্ট দেখুন।' : 'Add a meal, record a contribution, add an expense, then see the settlement update.'}</p></div>

          {active === 'overview' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center gap-2 text-brand-green"><Icon size={15} /><span className="text-[11px] font-semibold text-muted">{stat.label}</span></div><p className="mt-2 text-2xl font-black">{stat.value}</p></div> })}</div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Member balances</h2><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Live demo</span></div>{members.map((member) => { const balance = settlementFor(member); return <div key={member.id} className="flex items-center justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{member.name} <span className="ml-1 text-[10px] uppercase text-muted">{member.status}</span></p><p className="text-[11px] text-muted">{member.meals} meals · {money(member.contribution)} contributed</p></div><p className={`text-sm font-black ${balance >= 0 ? 'text-brand-green' : 'text-danger'}`}>{balance >= 0 ? '+' : '-'}{money(Math.abs(balance))}</p></div> })}</div></div>}

          {active === 'meals' && <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="mb-4 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4"><p className="text-xs font-bold text-brand-green">{locale === 'bn' ? 'ধাপ ১ · একটি মিল যোগ করুন' : 'Step 1 · Add a meal'}</p><p className="mt-1 text-sm text-muted">{locale === 'bn' ? 'যেকোনো সক্রিয় সদস্যের + চাপুন। এরপর ডেমো নিজে থেকেই পরের ধাপে যাবে।' : 'Tap + for any active member. The tour will move to the next step automatically.'}</p></div><h2 className="text-lg font-bold">Meal tracker</h2><div className="mt-4 grid gap-3">{members.map((member) => <div key={member.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface-2 p-4"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-muted">{member.status === 'left' ? `Left ${member.activeTo}` : member.role}</p></div><div className="flex items-center gap-3"><button type="button" aria-label={`Remove meal for ${member.name}`} onClick={() => updateMeal(member.id, -1)} disabled={member.status === 'left'} className="rounded-xl border border-line bg-surface p-2 disabled:opacity-40"><Minus size={16} /></button><span className="min-w-10 text-center text-lg font-black">{member.meals}</span><button type="button" aria-label={`Add meal for ${member.name}`} onClick={() => updateMeal(member.id, 1)} disabled={member.status === 'left'} className="rounded-xl bg-brand-green p-2 text-black disabled:opacity-40"><Plus size={16} /></button></div></div>)}</div></div>}

          {active === 'calendar' && <div className="grid gap-4 lg:grid-cols-[1.3fr_.9fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">August 2026</h2><span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[10px] font-bold text-brand-green">Demo</span></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">{weekdays.map((day) => <div key={day} className="py-2">{day}</div>)}</div><div className="grid grid-cols-7 gap-1">{Array.from({ length: new Date(2026, 7, 1).getDay() }, (_, i) => <div key={`blank-${i}`} />)}{Array.from({ length: 31 }, (_, i) => { const date = `2026-08-${String(i + 1).padStart(2, '0')}`; const closed = closedDays.some((item) => item.date === date); const selected = selectedDate === date; const today = date === assignedDate; return <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`min-h-12 rounded-xl border p-2 text-left text-xs ${selected ? 'border-brand-green/50 bg-brand-green/10 text-brand-green' : closed ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : today ? 'border-brand-green/30 bg-brand-green/5' : 'border-line bg-surface-2'}`}><div className="font-semibold">{i + 1}</div>{closed && <div className="mt-1 text-[9px]">Closed</div>}{today && !closed && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-green" />}</button>})}</div></div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h3 className="text-sm font-bold">Day details</h3>{selectedDate ? <><p className="mt-2 font-bold">{selectedDate}</p><p className="mt-2 text-sm text-muted">{closedDays.find((item) => item.date === selectedDate)?.reason ?? (selectedDate === assignedDate ? 'Today · sample activity uses this date.' : 'Open cycle day.')}</p></> : <p className="mt-2 text-sm text-muted">Select a day.</p>}</div></div>}

          {active === 'expenses' && <div className="space-y-4"><div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4"><p className="text-xs font-bold text-brand-green">{locale === 'bn' ? 'ধাপ ৩ · একটি খরচ যোগ করুন' : 'Step 3 · Add an expense'}</p><p className="mt-1 text-sm text-muted">{locale === 'bn' ? 'খরচ যোগ হলে মিল রেট বদলাবে এবং ডেমো আপনাকে সেটেলমেন্টে নিয়ে যাবে।' : 'Adding a cost changes the meal rate and takes you directly to the settlement.'}</p></div><div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Expenses</h2>{expenses.map((expense) => <div key={expense.id} className="flex justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{expense.note}</p><p className="text-xs text-muted">{expense.category}</p></div><p className="font-black">{money(expense.amount)}</p></div>)}</div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h3 className="text-sm font-bold">Add demo expense</h3><div className="mt-3 space-y-3"><input className={inputClass} value={expenseNote} onChange={(event) => setExpenseNote(event.target.value)} placeholder="Note" /><select className={inputClass} value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>Grocery</option><option>Cook salary</option><option>Gas</option><option>Other</option></select><input className={inputClass} value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} inputMode="decimal" placeholder="Amount" /><button type="button" className={`${primaryButton} w-full`} onClick={addExpense}>Add expense</button></div></div></div></div>}

          {active === 'contributions' && <div className="space-y-4"><div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4"><p className="text-xs font-bold text-brand-green">{locale === 'bn' ? 'ধাপ ২ · কন্ট্রিবিউশন রেকর্ড করুন' : 'Step 2 · Record a contribution'}</p><p className="mt-1 text-sm text-muted">{locale === 'bn' ? 'স্যাম্পল সদস্যের জন্য একটি ডিপোজিট যোগ করুন।' : 'Record a deposit for a sample member. The balance updates immediately.'}</p></div><div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Contributions</h2>{contributions.map((row) => <div key={row.id} className="flex justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{members.find((member) => member.id === row.memberId)?.name ?? 'Member'}</p><p className="text-xs text-muted">{row.note} · {row.date}</p></div><p className="font-black">{money(row.amount)}</p></div>)}</div><div className="rounded-3xl border border-brand-green/20 bg-brand-green/5 p-5"><h3 className="text-sm font-bold text-brand-green">Add contribution</h3><div className="mt-3 space-y-3"><select className={inputClass} value={contributionMember} onChange={(event) => setContributionMember(event.target.value)}>{activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input className={inputClass} value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} inputMode="decimal" placeholder="Amount" /><input className={inputClass} value={contributionNote} onChange={(event) => setContributionNote(event.target.value)} placeholder="Note" /><button type="button" className={`${primaryButton} w-full`} onClick={addContribution}>Add contribution</button></div></div></div></div>}

          {active === 'operations' && <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center gap-2"><CalendarX2 size={18} className="text-brand-green" /><h2 className="text-lg font-bold">Mess closed days</h2></div>{closedDays.map((day) => <div key={day.date} className="mt-3 rounded-xl border border-line bg-surface-2 p-3"><p className="text-sm font-semibold">{day.date}</p><p className="text-xs text-muted">{day.reason}</p></div>)}<div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="date" className={inputClass} value={closedDate} onChange={(event) => setClosedDate(event.target.value)} /><input className={inputClass} value={closedReason} onChange={(event) => setClosedReason(event.target.value)} placeholder="Reason" /></div><button type="button" className={`${primaryButton} mt-3 w-full`} onClick={addClosedDay}>Mark closed</button></div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Member departure</h2><div className="mt-3 space-y-3"><select className={inputClass} value={leftMember} onChange={(event) => setLeftMember(event.target.value)}>{activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input type="date" className={inputClass} value={leftDate} onChange={(event) => setLeftDate(event.target.value)} /><button type="button" className={`${primaryButton} w-full`} onClick={markLeft}>Mark as left</button></div></div></div>}

          {active === 'reports' && <div className="space-y-4"><div className="rounded-3xl border border-brand-green/30 bg-gradient-to-r from-brand-green/10 to-transparent p-5"><div className="flex items-center gap-2 text-brand-green"><Check size={18}/><p className="text-xs font-black uppercase tracking-[0.16em]">{locale === 'bn' ? 'এইটাই MealHisab' : 'That’s MealHisab'}</p></div><h2 className="mt-2 text-2xl font-black">{locale === 'bn' ? 'মিল + কন্ট্রিবিউশন + খরচ = পরিষ্কার মাসিক ব্যালেন্স।' : 'Meals + contributions + expenses = a clear monthly balance.'}</h2><p className="mt-2 max-w-2xl text-sm text-muted">{locale === 'bn' ? 'সবাই একই হিসাব দেখে, তাই মাস শেষে হাতে ক্যালকুলেশন করার দরকার নেই।' : 'Everyone sees the same numbers, so there is no manual end-of-month হিসাব to reconcile.'}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/account-type" className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-black">{locale === 'bn' ? 'নিজের ফ্ল্যাট শুরু করুন' : 'Start your flat'}</Link><button type="button" onClick={() => setActive('overview')} className="rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-sm font-bold text-brand-green">{locale === 'bn' ? 'সব ফিচার দেখুন' : 'Explore everything'}</button></div></div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center gap-2"><Check size={16} className="text-brand-green" /><h2 className="text-lg font-bold">Settlement preview</h2></div>{members.map((member) => { const balance = settlementFor(member); return <div key={member.id} className="flex items-center justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{member.name}</p><p className="text-xs text-muted">{member.meals} meals · {money(member.contribution)} contributed</p></div><p className={`font-black ${balance >= 0 ? 'text-brand-green' : 'text-danger'}`}>{balance >= 0 ? 'Receivable' : 'Payable'} {money(Math.abs(balance))}</p></div>})}</div></div>}
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-xl"><div className="min-w-0"><p className="text-xs font-bold text-brand-green">{locale === 'bn' ? 'বাস্তব অ্যাপ ব্যবহার করতে প্রস্তুত?' : 'Ready to use the real app?'}</p><p className="truncate text-[11px] text-muted">{locale === 'bn' ? 'ম্যানেজার ৳99/মাস · সদস্য ফ্রি' : 'Manager: ৳99/month · Members: free'}</p></div><div className="flex shrink-0 gap-2"><Link href="/register/manager" className="rounded-xl bg-brand-green px-3 py-2 text-[11px] font-bold text-black">{locale === 'bn' ? 'ম্যানেজার' : 'Manager'}</Link><Link href="/join" className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-[11px] font-bold text-brand-green">{locale === 'bn' ? 'ফ্রি যোগ দিন' : 'Join free'}</Link></div></div>

      {toast && <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm font-semibold text-main shadow-2xl">{toast}</div>}
    </main>
  )
}
