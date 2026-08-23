'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  CalendarX2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  History,
  Home,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Utensils,
  Users,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'

type Role = 'Admin' | 'Manager' | 'Member'
type Member = {
  id: string
  name: string
  role: Role
  meals: number
  contribution: number
  activeTo: string | null
  status: 'active' | 'left'
  payout: number
  collected: number
}
type Expense = { id: number; note: string; category: string; amount: number }
type ClosedDay = { date: string; reason: string }
type ContributionEntry = { id: number; memberId: string; amount: number; note: string; date: string }

type Tab = 'overview' | 'meals' | 'calendar' | 'expenses' | 'contributions' | 'operations' | 'reports'

const CYCLE_START = '2026-08-01'
const CYCLE_END = '2026-08-31'

function autoDate() {
  const d = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  if (d < CYCLE_START) return CYCLE_START
  if (d > CYCLE_END) return CYCLE_END
  return d
}

function money(v: number) {
  return `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const initialMembers: Member[] = [
  { id: 'rahim', name: 'Rahim Ahmed', role: 'Admin', meals: 38, contribution: 2400, activeTo: null, status: 'active', payout: 0, collected: 0 },
  { id: 'nabila', name: 'Nabila Karim', role: 'Manager', meals: 32, contribution: 1500, activeTo: null, status: 'active', payout: 0, collected: 0 },
  { id: 'sajid', name: 'Sajid Hasan', role: 'Member', meals: 29, contribution: 1000, activeTo: null, status: 'active', payout: 0, collected: 0 },
  { id: 'tania', name: 'Tania Sultana', role: 'Member', meals: 26, contribution: 1200, activeTo: null, status: 'active', payout: 0, collected: 0 },
]

const initialExpenses: Expense[] = [
  { id: 1, note: 'Grocery run — Agora', category: 'Grocery', amount: 4200 },
  { id: 2, note: 'Cook salary', category: 'Cook salary', amount: 4500 },
  { id: 3, note: 'Gas refill', category: 'Gas', amount: 950 },
]

const initialClosedDays: ClosedDay[] = [{ date: '2026-08-15', reason: 'Eid holiday' }]

const initialContributions: ContributionEntry[] = [
  { id: 1, memberId: 'rahim', amount: 2400, note: 'Opening deposit', date: '2026-08-01' },
  { id: 2, memberId: 'nabila', amount: 1500, note: 'Week 1', date: '2026-08-03' },
  { id: 3, memberId: 'sajid', amount: 1000, note: 'Cash', date: '2026-08-05' },
  { id: 4, memberId: 'tania', amount: 1200, note: 'bKash', date: '2026-08-07' },
]

const tabs: Array<[Tab, string, LucideIcon]> = [
  ['overview', 'Overview', Home],
  ['meals', 'Meals', Utensils],
  ['calendar', 'Calendar', CalendarDays],
  ['expenses', 'Expenses', ClipboardList],
  ['contributions', 'Contributions', CircleDollarSign],
  ['operations', 'Operations', Users],
  ['reports', 'Settlement', BarChart3],
]

const inputClass = 'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-main outline-none placeholder:text-muted focus:border-line-strong focus:ring-2 focus:ring-brand-green/20'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-black shadow-glow transition hover:bg-brand-green-2 active:scale-[.99]'

function LogoMark() {
  return (
    <svg width={34} height={34} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#demo-logo)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <defs><linearGradient id="demo-logo" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#39FF88" /><stop offset="1" stopColor="#19D96B" /></linearGradient></defs>
    </svg>
  )
}

export default function DemoPage() {
  const { t, locale } = useI18n()
  const assignedDate = autoDate()
  const [active, setActive] = useState<Tab>('overview')
  const [members, setMembers] = useState(initialMembers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [closedDays, setClosedDays] = useState(initialClosedDays)
  const [contributions, setContributions] = useState(initialContributions)
  const [calendarSelected, setCalendarSelected] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState('Other')
  const [contributionMember, setContributionMember] = useState('sajid')
  const [contributionAmount, setContributionAmount] = useState('500')
  const [contributionNote, setContributionNote] = useState('')
  const [holidayDate, setHolidayDate] = useState('2026-08-20')
  const [holidayReason, setHolidayReason] = useState('Mess closed')
  const [selectedMember, setSelectedMember] = useState('sajid')
  const [departureDate, setDepartureDate] = useState('2026-08-20')
  const [paymentAmount, setPaymentAmount] = useState('500')
  const [paymentDirection, setPaymentDirection] = useState<'payout' | 'collection'>('payout')

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members])
  const totalMeals = useMemo(() => activeMembers.reduce((s, m) => s + m.meals, 0), [activeMembers])
  const totalExpenses = useMemo(() => expenses.reduce((s, i) => s + i.amount, 0), [expenses])
  const mealRate = totalMeals ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0
  const totalContributions = useMemo(() => members.reduce((s, m) => s + m.contribution, 0), [members])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function changeMeals(id: string, delta: number) {
    setMembers((current) => current.map((member) => (
      member.id === id && member.status === 'active'
        ? { ...member, meals: Math.max(0, member.meals + delta) }
        : member
    )))
    showToast(delta > 0 ? `Meal added for ${assignedDate}.` : `Meal removed for ${assignedDate}.`)
  }

  function addExpense() {
    const amount = Math.round(Number(newAmount) * 100) / 100
    if (!newExpense.trim() || amount <= 0) {
      showToast('Enter an expense note and a valid amount.')
      return
    }
    setExpenses((current) => [...current, { id: Date.now(), note: newExpense.trim(), category: newCategory, amount }])
    setNewExpense('')
    setNewAmount('')
    showToast(`${newCategory} expense added.`)
  }

  function addContribution() {
    const amount = Math.round(Number(contributionAmount) * 100) / 100
    if (amount <= 0) {
      showToast('Enter a valid contribution amount.')
      return
    }
    setMembers((current) => current.map((member) => member.id === contributionMember && member.status === 'active'
      ? { ...member, contribution: Math.round((member.contribution + amount) * 100) / 100 }
      : member
    ))
    setContributions((current) => [{ id: Date.now(), memberId: contributionMember, amount, note: contributionNote.trim() || 'Deposit', date: assignedDate }, ...current])
    setContributionAmount('')
    setContributionNote('')
    const name = members.find((m) => m.id === contributionMember)?.name ?? 'Member'
    showToast(`${money(amount)} added for ${name} · ${assignedDate}.`)
  }

  function addClosedDay() {
    if (!holidayDate || closedDays.some((day) => day.date === holidayDate)) {
      showToast('That date is already closed or invalid.')
      return
    }
    setClosedDays((current) => [...current, { date: holidayDate, reason: holidayReason.trim() || 'Mess closed' }].sort((a, b) => a.date.localeCompare(b.date)))
    showToast('Mess-closed day added.')
  }

  function leaveFlat() {
    const member = members.find((item) => item.id === selectedMember)
    if (!member || member.status === 'left') return
    setMembers((current) => current.map((item) => item.id === selectedMember ? { ...item, status: 'left', activeTo: departureDate } : item))
    showToast(`${member.name} left on ${departureDate}.`)
  }

  function recordPayment() {
    const amount = Math.round(Number(paymentAmount) * 100) / 100
    if (amount <= 0) {
      showToast('Enter a valid payment amount.')
      return
    }
    setMembers((current) => current.map((member) => member.id === selectedMember
      ? paymentDirection === 'payout'
        ? { ...member, payout: member.payout + amount }
        : { ...member, collected: member.collected + amount }
      : member
    ))
    showToast(`Recorded ${money(amount)} ${paymentDirection}.`)
  }

  function resetDemo() {
    setMembers(initialMembers)
    setExpenses(initialExpenses)
    setClosedDays(initialClosedDays)
    setContributions(initialContributions)
    setCalendarSelected(null)
    setActive('overview')
    showToast('Demo reset.')
  }

  function settlementFor(member: Member) {
    const roundedBase = Math.round(member.meals * mealRate * 100) / 100
    const totalRounded = activeMembers.reduce((sum, item) => sum + Math.round(item.meals * mealRate * 100) / 100, 0)
    const residual = Math.round((totalExpenses - totalRounded) * 100) / 100
    const highest = [...activeMembers].sort((a, b) => b.meals - a.meals)[0]
    const mealCost = Math.round((roundedBase + (member.id === highest?.id ? residual : 0)) * 100) / 100
    return { mealCost, finalBalance: Math.round((member.contribution - mealCost) * 100) / 100 }
  }

  const weekdays = locale === 'bn' ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <main className="min-h-screen bg-canvas text-main">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(57,255,136,.13),_transparent_38%),radial-gradient(circle_at_85%_10%,_rgba(25,217,107,.10),_transparent_30%)]" />
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><LogoMark /><div><p className="text-sm font-black">MealHisab</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">{t('demo.badge')}</p></div></div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={resetDemo} className="hidden items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-main hover:bg-surface-3 sm:inline-flex"><RotateCcw size={14} /> Reset</button>
            <Link href="/account-type" className="rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-black hover:bg-brand-green-2">Start with your flat</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="rounded-2xl border border-brand-green/25 bg-surface px-4 py-4 shadow-soft sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><div className="rounded-xl bg-brand-green/10 p-2.5 text-brand-green"><CreditCard size={18} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">Manager Plan</p><p className="mt-1 text-sm font-bold">৳99/month · One flat · 10 invite codes/month</p><p className="text-xs text-muted">Members join free with a valid Flat Code. This demo is fully interactive and uses sample data only.</p></div></div>
            <div className="flex shrink-0 gap-2"><Link href="/register/manager" className="rounded-xl bg-brand-green px-3.5 py-2 text-xs font-bold text-black">Become a Manager</Link><Link href="/join" className="rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2 text-xs font-bold text-brand-green">Join Free</Link></div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[230px_1fr]">
        <aside className="rounded-3xl border border-line bg-surface p-3 shadow-soft lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-3 rounded-2xl border border-line bg-surface-2 px-3 py-3"><div className="flex items-center justify-between"><div><p className="text-xs font-bold">Mirpur Mess</p><p className="mt-1 text-[11px] text-muted">01–31 Aug 2026</p></div><span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[10px] font-bold text-brand-green">Demo</span></div><p className="mt-2 text-[10px] text-muted">Auto date: {assignedDate} · Asia/Dhaka</p></div>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${active === id ? 'border border-line-strong bg-surface-3 text-brand-green shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-main'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-4 hidden rounded-2xl border border-brand-green/15 bg-brand-green/5 p-3 text-[11px] text-muted lg:block"><div className="flex items-center gap-2 text-brand-green"><ShieldCheck size={14} /><strong>Safe demo mode</strong></div><p className="mt-1">No database changes. Reset anytime.</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Interactive product tour</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Try MealHisab before you sign up.</h1><p className="mt-1 max-w-2xl text-sm text-muted">Play with meals, expenses, contributions, closed days and settlements. Everything here is sample-only.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-brand-green"><ShieldCheck size={13} /> Sample data</span></div>

          {active === 'overview' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[['Total meals', String(totalMeals), Utensils], ['Shared costs', money(totalExpenses), ClipboardList], ['Meal rate', money(mealRate), CircleDollarSign], ['Contributions', money(totalContributions), WalletCards]].map(([label, value, Icon]) => (
                  <div key={String(label)} className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center gap-2 text-brand-green"><Icon size={15} /><span className="text-[11px] font-semibold text-muted">{label}</span></div><p className="mt-2 text-2xl font-black">{value}</p></div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Member balances</h2><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Live demo</span></div>{members.map((member) => { const settlement = settlementFor(member); return <div key={member.id} className="flex items-center justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{member.name} <span className="ml-1 text-[10px] uppercase text-muted">{member.status}</span></p><p className="text-[11px] text-muted">{member.meals} meals · {money(member.contribution)} contributed</p></div><p className={`text-sm font-black ${settlement.finalBalance >= 0 ? 'text-brand-green' : 'text-danger'}`}>{settlement.finalBalance >= 0 ? '+' : '-'}{money(Math.abs(settlement.finalBalance))}</p></div> })}</div>
            </>
          )}

          {active === 'meals' && <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Meal tracker</h2><p className="text-sm text-muted">The demo follows the same Asia/Dhaka auto-date idea as the real app.</p><div className="mt-4 grid gap-3">{members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-muted">{member.status === 'left' ? `Left ${member.activeTo}` : member.role}</p></div><div className="flex items-center gap-3"><button type="button" aria-label={`Remove meal for ${member.name}`} onClick={() => changeMeals(member.id, -1)} disabled={member.status === 'left'} className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-main disabled:opacity-40"><Minus size={16} /></button><span className="min-w-10 text-center text-lg font-black">{member.meals}</span><button type="button" aria-label={`Add meal for ${member.name}`} onClick={() => changeMeals(member.id, 1)} disabled={member.status === 'left'} className="rounded-xl bg-brand-green p-2 text-black hover:bg-brand-green-2 disabled:opacity-40"><Plus size={16} /></button></div></div>)}</div></div>}

          {active === 'calendar' && <div className="grid gap-4 lg:grid-cols-[1.3fr_.9fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">August 2026</h2><span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[10px] font-bold text-brand-green">Eid day included</span></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">{weekdays.map((weekday) => <div key={weekday} className="py-2">{weekday}</div>)}</div><div className="grid grid-cols-7 gap-1">{Array.from({ length: new Date(2026, 7, 1).getDay() }, (_, i) => <div key={`empty-${i}`} />)}{Array.from({ length: 31 }, (_, i) => { const day = i + 1; const date = `2026-08-${String(day).padStart(2, '0')}`; const closed = closedDays.some((item) => item.date === date); const today = date === assignedDate; const selected = calendarSelected === date; return <button key={date} type="button" onClick={() => setCalendarSelected(date)} className={`min-h-[48px] rounded-xl border p-2 text-left text-xs transition ${selected ? 'border-line-strong bg-surface-3 text-brand-green shadow-glow' : closed ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : today ? 'border-brand-green/40 bg-brand-green/5' : 'border-line bg-surface-2 hover:border-line-strong'}`}><div className="font-semibold">{day}</div>{closed && <div className="mt-1 text-[9px] font-semibold">Closed</div>}{today && !closed && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-green" />}</button>})}</div></div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h3 className="text-sm font-bold">Day details</h3>{!calendarSelected ? <p className="mt-2 text-sm text-muted">Tap a day to inspect it.</p> : <div className="mt-3"><p className="font-bold">{calendarSelected}</p>{closedDays.find((item) => item.date === calendarSelected) ? <div className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-200">{closedDays.find((item) => item.date === calendarSelected)?.reason}</div> : <p className="mt-2 text-sm text-muted">{calendarSelected === assignedDate ? 'Today · meals and contributions use this date automatically.' : 'Open cycle day.'}</p>}</div>}</div></div>}

          {active === 'expenses' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Expenses</h2>{expenses.map((expense) => <div key={expense.id} className="flex justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{expense.note}</p><p className="text-xs text-muted">{expense.category}</p></div><p className="text-sm font-black">{money(expense.amount)}</p></div>)}</div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h3 className="text-sm font-bold">Add a demo expense</h3><div className="mt-3 space-y-3"><input className={inputClass} value={newExpense} onChange={(event) => setNewExpense(event.target.value)} placeholder="Note" /><select className={inputClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value)}><option>Grocery</option><option>Cook salary</option><option>Gas</option><option>Other</option></select><input className={inputClass} value={newAmount} onChange={(event) => setNewAmount(event.target.value)} placeholder="Amount" inputMode="decimal" /><button type="button" className={`${primaryButton} w-full`} onClick={addExpense}>Add expense</button></div></div></div>}

          {active === 'contributions' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Contributions</h2><p className="text-sm text-muted">Demo entries are dated automatically to {assignedDate}.</p>{contributions.map((row) => <div key={row.id} className="flex justify-between border-t border-line py-3"><div><p className="text-sm font-semibold">{members.find((member) => member.id === row.memberId)?.name}</p><p className="text-xs text-muted">{row.note}</p></div><div className="text-right"><p className="text-sm font-black">{money(row.amount)}</p><p className="text-[11px] text-muted">{row.date}</p></div></div>)}</div><div className="rounded-3xl border border-brand-green/20 bg-brand-green/5 p-5"><h3 className="text-sm font-bold text-brand-green">Add contribution</h3><div className="mt-3 space-y-3"><select className={`${inputClass} bg-surface`} value={contributionMember} onChange={(event) => setContributionMember(event.target.value)}>{members.filter((member) => member.status === 'active').map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input className={`${inputClass} bg-surface`} value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} placeholder="Amount" inputMode="decimal" /><input className={`${inputClass} bg-surface`} value={contributionNote} onChange={(event) => setContributionNote(event.target.value)} placeholder="Note" /><button type="button" className={`${primaryButton} w-full`} onClick={addContribution}>Add contribution</button></div></div></div>}

          {active === 'operations' && <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center gap-2"><CalendarX2 size={18} className="text-brand-green" /><h2 className="text-lg font-bold">Mess closed days</h2></div>{closedDays.map((day) => <div key={day.date} className="mt-3 rounded-xl border border-line bg-surface-2 p-3"><p className="text-sm font-semibold">{day.date}</p><p className="text-xs text-muted">{day.reason}</p></div>)}<div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="date" className={inputClass} value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} /><input className={inputClass} value={holidayReason} onChange={(event) => setHolidayReason(event.target.value)} placeholder="Reason" /></div><button type="button" className={`${primaryButton} mt-3 w-full`} onClick={addClosedDay}>Mark closed</button></div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h2 className="text-lg font-bold">Member departure</h2><p className="mt-1 text-sm text-muted">Demo the mid-cycle member lifecycle without affecting real data.</p><div className="mt-3 space-y-3"><select className={inputClass} value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)}>{members.filter((member) => member.status === 'active').map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input type="date" className={inputClass} value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /><button type="button" className={`${primaryButton} w-full`} onClick={leaveFlat}>Mark as left</button></div></div></div>}

          {active === 'reports' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Settlement preview</h2><div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"><History size={13} /> Demo snapshot</div></div>{members.map((member) => { const settlement = settlementFor(member); return <div key={member.id} className="border-t border-line py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{member.name}</p><p className={`text-sm font-black ${settlement.finalBalance >= 0 ? 'text-brand-green' : 'text-danger'}`}>{settlement.finalBalance >= 0 ? 'Receivable' : 'Payable'} {money(Math.abs(settlement.finalBalance))}</p></div><p className="mt-1 text-xs text-muted">{member.meals} meals · meal cost {money(settlement.mealCost)}</p></div>})}</div><div className="rounded-3xl border border-line bg-surface p-5 shadow-soft"><h3 className="text-sm font-bold">Record payment</h3><div className="mt-3 space-y-3"><select className={inputClass} value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><select className={inputClass} value={paymentDirection} onChange={(event) => setPaymentDirection(event.target.value as 'payout' | 'collection')}><option value="payout">Payout</option><option value="collection">Collection</option></select><input className={inputClass} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" placeholder="Amount" /><button type="button" className={`${primaryButton} w-full`} onClick={recordPayment}>Record payment</button></div></div></div>}
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-xl"><div className="min-w-0"><p className="text-xs font-bold text-brand-green">Ready to use the real app?</p><p className="truncate text-[11px] text-muted">Manager: ৳99/month · Members: free</p></div><div className="flex shrink-0 gap-2"><Link href="/register/manager" className="rounded-xl bg-brand-green px-3 py-2 text-[11px] font-bold text-black">Manager</Link><Link href="/join" className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-[11px] font-bold text-brand-green">Join free</Link></div></div>

      {toast && <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm font-semibold text-main shadow-2xl">{toast}</div>}
    </main>
  )
}
