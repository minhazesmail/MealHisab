'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarX2,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  Home,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Utensils,
  Users,
  WalletCards,
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
type ExpenseCategory = 'Grocery' | 'Cook salary' | 'Gas' | 'Other'
type Expense = { id: number; note: string; category: ExpenseCategory; amount: number }
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

const initialClosedDays: ClosedDay[] = [{ date: '2026-08-15', reason: 'Eid holiday' }]

const tabs = [
  ['overview', 'Overview', Home],
  ['meals', 'Meals', Utensils],
  ['expenses', 'Expenses', ClipboardList],
  ['contributions', 'Contributions', CircleDollarSign],
  ['operations', 'Flat operations', Users],
  ['reports', 'Settlement', BarChart3],
] as const

function money(value: number) {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94" />
      <defs>
        <linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16A34A" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function DemoPage() {
  const [active, setActive] = useState('overview')
  const [members, setMembers] = useState(initialMembers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [closedDays, setClosedDays] = useState(initialClosedDays)
  const [toast, setToast] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Other')
  const [contributionMember, setContributionMember] = useState('sajid')
  const [contributionAmount, setContributionAmount] = useState('500')
  const [contributionNote, setContributionNote] = useState('')
  const [holidayDate, setHolidayDate] = useState('2026-08-20')
  const [holidayReason, setHolidayReason] = useState('Mess closed')
  const [selectedMember, setSelectedMember] = useState('sajid')
  const [departureDate, setDepartureDate] = useState('2026-08-20')
  const [paymentAmount, setPaymentAmount] = useState('500')
  const [paymentDirection, setPaymentDirection] = useState<'payout' | 'collection'>('payout')

  const activeMembers = useMemo(() => members.filter((member) => member.status === 'active'), [members])
  const totalMeals = useMemo(() => activeMembers.reduce((sum, member) => sum + member.meals, 0), [activeMembers])
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses])
  const mealRate = totalMeals ? Math.round((totalExpenses / totalMeals + Number.EPSILON) * 100) / 100 : 0
  const totalContributions = useMemo(() => members.reduce((sum, member) => sum + member.contribution, 0), [members])
  const outstanding = useMemo(
    () => members.reduce((sum, member) => sum + Math.max(0, Math.abs(member.contribution - member.meals * mealRate) - member.payout - member.collected), 0),
    [members, mealRate],
  )

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function changeMeals(id: string, delta: number) {
    setMembers((current) => current.map((member) => member.id === id && member.status === 'active' ? { ...member, meals: Math.max(0, member.meals + delta) } : member))
    showToast(delta > 0 ? 'Meal added. Settlement recalculates to cents.' : 'Meal removed from the demo ledger.')
  }

  function addExpense() {
    const amount = Math.round(Number(newAmount) * 100) / 100
    if (!newExpense.trim() || !amount || amount <= 0) return
    setExpenses((current) => [...current, { id: Date.now(), note: newExpense.trim(), category: newCategory, amount }])
    setNewExpense('')
    setNewAmount('')
    showToast(`${newCategory} expense added.`)
  }

  function addContribution() {
    const amount = Math.round(Number(contributionAmount) * 100) / 100
    if (!amount || amount <= 0) {
      showToast('Enter a valid contribution amount.')
      return
    }
    setMembers((current) => current.map((member) => member.id === contributionMember && member.status === 'active'
      ? { ...member, contribution: Math.round((member.contribution + amount) * 100) / 100 }
      : member))
    setContributionAmount('')
    setContributionNote('')
    const memberName = members.find((member) => member.id === contributionMember)?.name ?? 'Member'
    showToast(`${money(amount)} contribution added for ${memberName}.`)
  }

  function addClosedDay() {
    if (!holidayDate || !holidayReason.trim()) return
    if (closedDays.some((day) => day.date === holidayDate)) {
      showToast('That date is already marked closed.')
      return
    }
    setClosedDays((current) => [...current, { date: holidayDate, reason: holidayReason.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
    showToast('Mess-closed day added; implicit meals are suppressed on that date.')
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
    setMembers((current) => current.map((member) => member.id === selectedMember
      ? paymentDirection === 'payout' ? { ...member, payout: member.payout + amount } : { ...member, collected: member.collected + amount }
      : member))
    showToast(paymentDirection === 'payout' ? `Recorded ${money(amount)} payout.` : `Recorded ${money(amount)} collection.`)
  }

  function resetDemo() {
    setMembers(initialMembers)
    setExpenses(initialExpenses)
    setClosedDays(initialClosedDays)
    setActive('overview')
    setContributionMember('sajid')
    setSelectedMember('sajid')
    showToast('Demo reset to the hardened sample workflow.')
  }

  function settlementFor(member: Member) {
    const roundedBase = Math.round(member.meals * mealRate * 100) / 100
    const totalRounded = activeMembers.reduce((sum, item) => sum + Math.round(item.meals * mealRate * 100) / 100, 0)
    const residual = Math.round((totalExpenses - totalRounded) * 100) / 100
    const highestMealsMember = [...activeMembers].sort((a, b) => b.meals - a.meals)[0]
    const mealCost = Math.round((roundedBase + (member.id === highestMealsMember?.id ? residual : 0)) * 100) / 100
    const finalBalance = Math.round((member.contribution - mealCost) * 100) / 100
    return { mealCost, finalBalance }
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
          <div className="mt-4 hidden rounded-2xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 lg:block"><span className="font-semibold text-slate-800">Safe demo:</span> browser-only sample data. Nothing here touches real Supabase records.</div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Interactive product tour</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">See the updated MealHisab workflow</h1><p className="mt-1 text-sm text-slate-500">Meals, expenses, contributions, holidays, departures and final settlement.</p></div><div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13}/> Accounting-safe sample</div></div>

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
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Current balances</h2><p className="text-xs text-slate-400">Contributions reduce what a member owes and increase what they may receive back.</p></div><WalletCards size={18} className="text-slate-400"/></div>{members.map((member) => { const s = settlementFor(member); return <div key={member.id} className="flex flex-col gap-2 border-t border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{member.name} <span className="ml-1 text-[10px] font-semibold uppercase text-slate-400">{member.status}</span></p><p className="text-[11px] text-slate-400">{member.meals} meals · contributions {money(member.contribution)} · meal cost {money(s.mealCost)}</p></div><p className={`text-sm font-bold ${s.finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{s.finalBalance >= 0 ? '+' : '-'}{money(Math.abs(s.finalBalance))}</p></div> })}</div>
          </>}

          {active === 'meals' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-bold">Meal tracker</h2><p className="text-sm text-slate-500">Adjust sample meals and watch the rounded settlement update.</p></div><div className="grid gap-3">{members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.status === 'left' ? `Left ${member.activeTo}` : member.role}</p></div><div className="flex items-center gap-3"><button onClick={() => changeMeals(member.id, -1)} disabled={member.status === 'left'} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100 disabled:opacity-40" aria-label={`Remove meal from ${member.name}`}><Minus size={16}/></button><div className="min-w-12 text-center"><p className="text-lg font-black">{member.meals}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">meals</p></div><button onClick={() => changeMeals(member.id, 1)} disabled={member.status === 'left'} className="rounded-xl bg-slate-950 p-2 text-white hover:bg-emerald-700 disabled:opacity-40" aria-label={`Add meal for ${member.name}`}><Plus size={16}/></button></div></div>)}</div></div>}

          {active === 'expenses' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold">Expenses</h2><p className="text-sm text-slate-500">All shared costs feed the settlement calculation.</p></div>{expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{expense.note}</p><p className="text-xs text-slate-400">{expense.category}</p></div><p className="font-bold">{money(expense.amount)}</p></div>)}</div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Add demo expense</h3><div className="mt-4 space-y-3"><input value={newExpense} onChange={(e) => setNewExpense(e.target.value)} placeholder="e.g. Vegetables" className="input w-full"/><select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)} className="input w-full"><option>Grocery</option><option>Cook salary</option><option>Gas</option><option>Other</option></select><input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Amount in BDT" inputMode="decimal" className="input w-full"/><button onClick={addExpense} className="btn-primary w-full">Add expense</button></div></div></div>}

          {active === 'contributions' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Contributions</h2><p className="text-sm text-slate-500">Add deposits and see each member's balance move immediately.</p></div><HandCoins size={19} className="text-slate-400"/></div>{members.map((member) => <div key={member.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.meals} meals · {member.status}</p></div><div className="text-right"><p className="text-xs text-slate-400">Total contributed</p><p className="font-bold">{money(member.contribution)}</p></div><button onClick={() => { setContributionMember(member.id); setActive('contributions') }} disabled={member.status === 'left'} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">Add</button></div>)}</div><div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5"><h3 className="text-sm font-bold text-emerald-950">Add a contribution</h3><p className="mt-1 text-xs leading-5 text-emerald-800">This is demo-only, but it follows the real app's contribution model.</p><div className="mt-4 space-y-3"><select value={contributionMember} onChange={(e) => setContributionMember(e.target.value)} className="input w-full bg-white"><option value="rahim">Rahim Ahmed</option><option value="nabila">Nabila Karim</option><option value="sajid">Sajid Hasan</option><option value="tania">Tania Sultana</option></select><input value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} placeholder="Amount in BDT" inputMode="decimal" className="input w-full bg-white"/><input value={contributionNote} onChange={(e) => setContributionNote(e.target.value)} placeholder="Note (optional)" className="input w-full bg-white" maxLength={120}/><button onClick={addContribution} className="btn-primary w-full">Add contribution</button></div><p className="mt-3 text-[11px] text-emerald-700">Example: add ৳500 to Sajid and his balance updates without touching real data.</p></div></div>}

          {active === 'operations' && <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><CalendarX2 size={18} className="text-emerald-600"/><div><h2 className="text-lg font-bold">Mess closed days</h2><p className="text-sm text-slate-500">Closed dates suppress implicit opt-out meals.</p></div></div><div className="space-y-2">{closedDays.map((day) => <div key={day.date} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><div><p className="font-semibold">{day.date}</p><p className="text-xs text-slate-500">{day.reason}</p></div></div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="input"/><input value={holidayReason} onChange={(e) => setHolidayReason(e.target.value)} className="input" placeholder="Reason"/></div><button onClick={addClosedDay} className="btn-primary mt-3 w-full">Mark mess closed</button></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Member departure</h2><p className="mt-1 text-sm text-slate-500">Leaving a flat ends implicit billing after the chosen active-to date.</p><div className="mt-4 space-y-3"><select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input w-full">{members.filter((member) => member.status === 'active').map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="input w-full"/><button onClick={leaveFlat} className="btn-primary w-full">Leave flat</button></div><div className="mt-5 space-y-2">{members.map((member) => <div key={member.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-semibold">{member.name}</span><span className="text-slate-500">{member.status === 'left' ? `left ${member.activeTo}` : 'active'}</span></div>)}</div></div></div>}

          {active === 'reports' && <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold">Final settlement</h2><p className="text-sm text-slate-500">2-decimal meal costs plus reconciled residuals; final balances can be paid or collected.</p></div>{members.map((member) => { const s = settlementFor(member); const owed = Math.max(0, Math.abs(s.finalBalance) - member.payout - member.collected); return <div key={member.id} className="border-t border-slate-100 py-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.meals} meals · contribution {money(member.contribution)}</p></div><div className={`font-bold ${s.finalBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{s.finalBalance >= 0 ? 'Receivable' : 'Payable'} {money(Math.abs(s.finalBalance))}</div></div><div className="mt-2 text-xs text-slate-500">Meal cost {money(s.mealCost)} · Paid/collected {money(member.payout + member.collected)} · Remaining {money(owed)}</div></div>})}</div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Record payout or collection</h3><div className="mt-4 space-y-3"><select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input w-full">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><select value={paymentDirection} onChange={(e) => setPaymentDirection(e.target.value as 'payout' | 'collection')} className="input w-full"><option value="payout">Payout to member</option><option value="collection">Collect from member</option></select><input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" className="input w-full" placeholder="Amount in BDT"/><button onClick={recordPayment} className="btn-primary w-full">Record {paymentDirection}</button></div><div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Demo behavior:</strong> payment records update the outstanding amount locally. The real app records these against the closed settlement.</div></div></div>}
        </section>
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </main>
  )
}
