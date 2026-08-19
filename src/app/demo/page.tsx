'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleDollarSign,
  ClipboardList,
  Home,
  LogOut,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Utensils,
  Users,
  WalletCards,
  Plus,
  Minus,
  CalendarX2,
  HandCoins,
} from 'lucide-react'

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

type Expense = {
  id: number
  note: string
  category: 'Grocery' | 'Cook salary' | 'Gas' | 'Other'
  amount: number
}

type ClosedDay = { date: string; reason: string }

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

const initialClosedDays: ClosedDay[] = [
  { date: '2026-08-15', reason: 'Eid holiday' },
]

const tabs = [
  ['overview', 'Overview', Home],
  ['meals', 'Meals', Utensils],
  ['expenses', 'Expenses', ClipboardList],
  ['contributions', 'Contributions', CircleDollarSign],
  ['operations', 'Flat operations', Users],
  ['reports', 'Settlement', BarChart3],
] as const

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94" />
      <defs><linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#16A34A"/><stop offset="1" stopColor="#0F766E"/></linearGradient></defs>
    </svg>
  )
}

function money(value: number) {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DemoPage() {
  const [active, setActive] = useState('overview')
  const [members, setMembers] = useState(initialMembers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [closedDays, setClosedDays] = useState(initialClosedDays)
  const [toast, setToast] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<Expense['category']>('Other')
  const [holidayDate, setHolidayDate] = useState('2026-08-20')
  const [holidayReason, setHolidayReason] = useState('Mess closed')
  const [selectedMember, setSelectedMember] = useState('sajid')
  const [departureDate, setDepartureDate] = useState('2026-08-20')
  const [paymentAmount, setPaymentAmount] = useState('500')
  const [paymentDirection, setPaymentDirection] = useState<'payout' | 'collection'>('payout')

  const activeMembers = useMemo(() => members.filter((member) => member.status === 'active'), [members])
  const totalMeals = useMemo(() => activeMembers.reduce((sum, member) => sum + member.meals, 0), [activeMembers])
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses])
  const rawRate = totalMeals ? totalExpenses / totalMeals : 0
  const mealRate = totalMeals ? Math.round((rawRate + Number.EPSILON) * 100) / 100 : 0
  const totalContributions = useMemo(() => activeMembers.reduce((sum, member) => sum + member.contribution, 0), [activeMembers])
  const allocatedMealCost = useMemo(() => {
    if (!totalMeals) return 0
    const rounded = activeMembers.reduce((sum, member) => sum + Math.round(member.meals * mealRate * 100) / 100, 0)
    const residual = Math.round((totalExpenses - rounded) * 100) / 100
    return rounded + residual
  }, [activeMembers, mealRate, totalExpenses, totalMeals])
  const outstanding = useMemo(() => members.reduce((sum, member) => sum + Math.max(0, Math.abs(member.contribution - member.meals * mealRate) - member.payout - member.collected), 0), [members, mealRate])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function changeMeals(id: string, delta: number) {
    setMembers((current) => current.map((member) => member.id === id && member.status === 'active' ? { ...member, meals: Math.max(0, member.meals + delta) } : member))
    showToast(delta > 0 ? 'Meal added. Final settlement remains cent-accurate.' : 'Meal removed from the demo ledger.')
  }

  function addExpense() {
    const amount = Math.round(Number(newAmount) * 100) / 100
    if (!newExpense.trim() || !amount || amount <= 0) return
    setExpenses((current) => [...current, { id: Date.now(), note: newExpense.trim(), category: newCategory, amount }])
    setNewExpense('')
    setNewAmount('')
    showToast(`${newCategory} expense added.`)
  }

  function addClosedDay() {
    if (!holidayDate || !holidayReason.trim()) return
    if (closedDays.some((day) => day.date === holidayDate)) {
      showToast('That date is already marked closed.')
      return
    }
    setClosedDays((current) => [...current, { date: holidayDate, reason: holidayReason.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
    showToast('Mess-closed day added. Implicit meals are suppressed for that date.')
  }

  function leaveFlat() {
    const member = members.find((item) => item.id === selectedMember)
    if (!member || member.status === 'left') return
    setMembers((current) => current.map((item) => item.id === selectedMember ? { ...item, status: 'left', activeTo: departureDate } : item))
    showToast(`${member.name} left on ${departureDate}; open-cycle billing stops there.`)
  }

  function recordPayment() {
    const amount = Math.round(Number(paymentAmount) * 100) / 100
    if (!amount || amount <= 0) return
    setMembers((current) => current.map((member) => {
      if (member.id !== selectedMember) return member
      return paymentDirection === 'payout' ? { ...member, payout: member.payout + amount } : { ...member, collected: member.collected + amount }
    }))
    showToast(paymentDirection === 'payout' ? `Recorded ${money(amount)} payout.` : `Recorded ${money(amount)} collection.`)
  }

  function resetDemo() {
    setMembers(initialMembers)
    setExpenses(initialExpenses)
    setClosedDays(initialClosedDays)
    setActive('overview')
    setSelectedMember('sajid')
    showToast('Demo reset to the hardened sample workflow.')
  }

  function settlementFor(member: Member) {
    const base = member.contribution - member.meals * mealRate
    const otherMembers = activeMembers.filter((item) => item.id !== member.id)
    const roundedWithout = otherMembers.reduce((sum, item) => sum + Math.round(item.meals * mealRate * 100) / 100, 0)
    const residual = totalMeals && member.meals > 0 ? Math.round((totalExpenses - roundedWithout - Math.round(member.meals * mealRate * 100) / 100) * 100) / 100 : 0
    const finalMealCost = Math.round(member.meals * mealRate * 100) / 100 + (residual && member.id === [...activeMembers].sort((a, b) => b.meals - a.meals)[0]?.id ? residual : 0)
    return { base, mealCost: finalMealCost, finalBalance: Math.round((member.contribution - finalMealCost) * 100) / 100 }
  }

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><LogoMark /><div><p className="text-sm font-black tracking-tight">MealHisab</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Hardened demo</p></div></div>
          <div className="flex items-center gap-2"><button onClick={resetDemo} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex"><RotateCcw size={14}/> Reset</button><Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Use real account</Link></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[225px_1fr] lg:px-8 lg:py-8">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:h-fit lg:sticky lg:top-24">
          <div className="mb-3 rounded-2xl bg-emerald-50 px-3 py-3"><p className="text-xs font-bold text-emerald-800">Mirpur Mess</p><p className="mt-1 text-[11px] leading-4 text-emerald-700">01 Aug — 31 Aug · 4 sample members</p></div>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${active === id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}><Icon size={15}/>{label}</button>)}
          </nav>
          <div className="mt-4 hidden rounded-2xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 lg:block"><span className="font-semibold text-slate-800">Safe demo:</span> this is browser-only sample data. It demonstrates the same accounting rules as the real app.</div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Interactive product tour</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">See the updated MealHisab workflow</h1><p className="mt-1 text-sm text-slate-500">Meals, all expense categories, holidays, member departures and final settlement.</p></div><div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13}/> Accounting-safe sample</div></div>

          {active === 'overview' && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Total meals', totalMeals.toString(), 'billable meals'],
                ['All shared costs', money(totalExpenses), 'groceries + overhead'],
                ['Meal rate', money(mealRate), 'rounded to 2 decimals'],
                ['Contributions', money(totalContributions), 'recorded deposits'],
                ['Unresolved', money(outstanding), 'payouts / collections'],
              ].map(([label, value, meta]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[11px] font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-[11px] text-slate-400">{meta}</p></div>)}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Current balances</h2><p className="text-xs text-slate-400">The highest-meal member absorbs any final cent residual so costs reconcile exactly.</p></div><WalletCards size={18} className="text-slate-400"/></div>{members.map((member) => { const s = settlementFor(member); return <div key={member.id} className="flex items-center justify-between border-t border-slate-100 py-3"><div><p className="text-sm font-semibold">{member.name} <span className="ml-1 text-[10px] font-semibold uppercase text-slate-400">{member.status}</span></p><p className="text-[11px] text-slate-400">{member.meals} meals · {member.role}{member.activeTo ? ` · through ${member.activeTo}` : ''}</p></div><p className={`text-sm font-bold ${s.finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{s.finalBalance >= 0 ? '+' : '-'}{money(Math.abs(s.finalBalance))}</p></div> })}</div>
              <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">What changed</p><div className="mt-3 space-y-3 text-sm text-slate-300"><p className="flex gap-2"><Check size={16} className="mt-0.5 text-emerald-300"/> Every expense category is included in settlement.</p><p className="flex gap-2"><Check size={16} className="mt-0.5 text-emerald-300"/> Closed days remove implicit opt-out meals.</p><p className="flex gap-2"><Check size={16} className="mt-0.5 text-emerald-300"/> Leaving a flat ends open-cycle billing on the departure date.</p><p className="flex gap-2"><Check size={16} className="mt-0.5 text-emerald-300"/> Payouts and collections can be recorded against final balances.</p></div><button onClick={() => setActive('operations')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-50">Explore operations <ArrowLeft size={14} className="rotate-180"/></button></div>
            </div>
          </>}

          {active === 'meals' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Meal tracker</h2><p className="text-sm text-slate-500">Manual adjustments are local to Demo Mode. Closed days do not create implicit meals.</p></div><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Utensils size={18}/></div></div></div><div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] text-slate-400">Meal policy</p><p className="mt-1 font-bold">Opt-out by default</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] text-slate-400">Closed days</p><p className="mt-1 font-bold">{closedDays.length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] text-slate-400">Current rate</p><p className="mt-1 font-bold">{money(mealRate)}</p></div></div><div className="grid gap-3">{members.map((member) => <div key={member.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${member.status === 'left' ? 'border-rose-100 bg-rose-50/50' : 'border-slate-100 bg-slate-50'}`}><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.role} · {member.status === 'left' ? `left ${member.activeTo}` : 'active in cycle'}</p></div><div className="flex items-center gap-3"><button disabled={member.status === 'left'} onClick={() => changeMeals(member.id, -1)} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100 disabled:opacity-40" aria-label={`Remove meal from ${member.name}`}><Minus size={16}/></button><div className="min-w-12 text-center"><p className="text-lg font-black">{member.meals}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">meals</p></div><button disabled={member.status === 'left'} onClick={() => changeMeals(member.id, 1)} className="rounded-xl bg-slate-950 p-2 text-white hover:bg-emerald-700 disabled:opacity-40" aria-label={`Add meal for ${member.name}`}><Plus size={16}/></button></div></div>)}</div></div>}

          {active === 'expenses' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Expenses</h2><p className="text-sm text-slate-500">The demo deliberately includes grocery, salary and gas overhead.</p></div><ClipboardList className="text-slate-400" size={18}/></div>{expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{expense.note}</p><p className="text-xs text-slate-400">{expense.category}</p></div><p className="font-bold">{money(expense.amount)}</p></div>)}<div className="mt-4 rounded-2xl bg-slate-950 p-4 text-xs text-slate-300"><span className="font-semibold text-white">Included in closing:</span> groceries + cook salary + gas + other. The demo no longer hides overhead from the ledger.</div></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Add a demo expense</h3><div className="mt-4 space-y-3"><input value={newExpense} onChange={(e) => setNewExpense(e.target.value)} placeholder="e.g. Vegetables" className="input w-full"/><select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Expense['category'])} className="input w-full"><option>Grocery</option><option>Cook salary</option><option>Gas</option><option>Other</option></select><input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Amount in BDT" inputMode="decimal" className="input w-full"/><button onClick={addExpense} className="btn-primary w-full">Add expense</button></div></div></div>}

          {active === 'contributions' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-bold">Contributions</h2><p className="text-sm text-slate-500">Deposits feed directly into the closing balance formula.</p></div>{members.map((member) => { const s = settlementFor(member); return <div key={member.id} className="grid gap-3 border-t border-slate-100 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="text-sm font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.meals} meals · {member.status}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-400">Contribution</p><p className="font-bold">{money(member.contribution)}</p></div><div className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${s.finalBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{s.finalBalance >= 0 ? 'Credit' : 'Due'} · {money(Math.abs(s.finalBalance))}</div></div> })}</div>}

          {active === 'operations' && <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><CalendarX2 size={18}/></div><div><h2 className="text-lg font-bold">Mess closed / holiday</h2><p className="text-sm text-slate-500">Mark a whole day closed so opt-out meals do not get invented.</p></div></div><div className="space-y-3"><input value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} type="date" className="input w-full"/><input value={holidayReason} onChange={(e) => setHolidayReason(e.target.value)} className="input w-full" placeholder="Reason, e.g. Eid holiday"/><button onClick={addClosedDay} className="btn-primary w-full">Mark day closed</button></div><div className="mt-4 space-y-2">{closedDays.map((day) => <div key={day.date} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 text-xs"><span className="font-semibold">{day.date}</span><span className="text-slate-500">{day.reason}</span></div>)}</div></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><LogOut size={18}/></div><div><h2 className="text-lg font-bold">Leave flat</h2><p className="text-sm text-slate-500">Leaving immediately ends open-cycle billing at the selected date.</p></div></div><div className="space-y-3"><select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input w-full">{members.filter((member) => member.status === 'active').map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} type="date" className="input w-full"/><button onClick={leaveFlat} className="btn-primary w-full">Leave flat + prorate</button></div><p className="mt-3 text-xs leading-5 text-slate-400">The real app syncs this into <code>cycle_members.active_to</code>; the demo mirrors that behavior visually.</p></div>
          </div>}

          {active === 'reports' && <div className="space-y-4"><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Settlement preview</h2><p className="text-sm text-slate-500">2-decimal money plus residual reconciliation.</p></div><WalletCards size={18} className="text-slate-400"/></div>{members.map((member) => { const s = settlementFor(member); const paid = member.payout + member.collected; const remaining = Math.round(Math.abs(s.finalBalance) * 100) / 100 - paid; return <div key={member.id} className="border-t border-slate-100 py-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.meals} meals · meal cost {money(s.mealCost)}</p></div><div className={`text-sm font-black ${s.finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{s.finalBalance >= 0 ? '+' : '-'}{money(Math.abs(s.finalBalance))}</div></div><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500"><span className="rounded-full bg-slate-50 px-2.5 py-1">Contribution {money(member.contribution)}</span><span className="rounded-full bg-slate-50 px-2.5 py-1">Settled {money(paid)}</span><span className="rounded-full bg-slate-50 px-2.5 py-1">Remaining {money(Math.max(0, remaining))}</span></div></div> })}</div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><div className="rounded-2xl bg-slate-950 p-3 text-white"><HandCoins size={18}/></div><div><h2 className="text-lg font-bold">Final payout / collection</h2><p className="text-sm text-slate-500">Record what was actually paid or collected.</p></div></div><div className="space-y-3"><select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input w-full">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><button onClick={() => setPaymentDirection('payout')} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${paymentDirection === 'payout' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}>Payout</button><button onClick={() => setPaymentDirection('collection')} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${paymentDirection === 'collection' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}>Collection</button></div><input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input w-full" inputMode="decimal" placeholder="Amount in BDT"/><button onClick={recordPayment} className="btn-primary w-full">Record {paymentDirection}</button></div></div></div>
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Cycle cost</p><p className="mt-2 text-2xl font-black">{money(totalExpenses)}</p><p className="mt-1 text-xs text-slate-400">all expense categories</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Allocated meal cost</p><p className="mt-2 text-2xl font-black">{money(allocatedMealCost)}</p><p className="mt-1 text-xs text-slate-400">exactly reconciled</p></div><div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-[11px] uppercase tracking-[0.16em] text-emerald-600">Residual</p><p className="mt-2 text-2xl font-black text-emerald-800">{money(Math.abs(totalExpenses - allocatedMealCost))}</p><p className="mt-1 text-xs text-emerald-700">ghost money eliminated</p></div></div>
          </div>}
        </section>
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </main>
  )
}
