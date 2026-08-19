'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleDollarSign,
  ClipboardList,
  Download,
  Home,
  RotateCcw,
  Sparkles,
  Utensils,
  Users,
  WalletCards,
  Plus,
  Minus,
} from 'lucide-react'

type Member = {
  id: string
  name: string
  role: 'Admin' | 'Manager' | 'Member'
  meals: number
  contribution: number
}

type Expense = {
  id: number
  note: string
  category: string
  amount: number
}

const initialMembers: Member[] = [
  { id: 'rahim', name: 'Rahim Ahmed', role: 'Admin', meals: 38, contribution: 2400 },
  { id: 'nabila', name: 'Nabila Karim', role: 'Manager', meals: 32, contribution: 1500 },
  { id: 'sajid', name: 'Sajid Hasan', role: 'Member', meals: 29, contribution: 1000 },
  { id: 'tania', name: 'Tania Sultana', role: 'Member', meals: 26, contribution: 1200 },
]

const initialExpenses: Expense[] = [
  { id: 1, note: 'Grocery run — Agora', category: 'Grocery', amount: 4200 },
  { id: 2, note: 'Cook salary', category: 'Cook salary', amount: 4500 },
  { id: 3, note: 'Gas refill', category: 'Gas', amount: 950 },
]

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

const tabs = [
  ['overview', 'Overview', Home],
  ['meals', 'Meals', Utensils],
  ['expenses', 'Expenses', ClipboardList],
  ['contributions', 'Contributions', CircleDollarSign],
  ['reports', 'Reports', BarChart3],
] as const

export default function DemoPage() {
  const [active, setActive] = useState('overview')
  const [members, setMembers] = useState(initialMembers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [toast, setToast] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const totalMeals = useMemo(() => members.reduce((sum, member) => sum + member.meals, 0), [members])
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses])
  const mealRate = totalMeals ? totalExpenses / totalMeals : 0
  const totalContributions = useMemo(() => members.reduce((sum, member) => sum + member.contribution, 0), [members])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function changeMeals(id: string, delta: number) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, meals: Math.max(0, member.meals + delta) } : member))
    showToast(delta > 0 ? 'Meal added to the demo ledger.' : 'Meal removed from the demo ledger.')
  }

  function addExpense() {
    const amount = Number(newAmount)
    if (!newExpense.trim() || !amount || amount <= 0) return
    setExpenses((current) => [...current, { id: Date.now(), note: newExpense.trim(), category: 'Other', amount }])
    setNewExpense('')
    setNewAmount('')
    showToast('Demo expense added.')
  }

  function resetDemo() {
    setMembers(initialMembers)
    setExpenses(initialExpenses)
    setActive('overview')
    showToast('Demo reset to the sample starting state.')
  }

  const balance = (member: Member) => member.contribution - member.meals * mealRate

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><LogoMark /><div><p className="text-sm font-black tracking-tight">MealHisab</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Demo mode</p></div></div>
          <div className="flex items-center gap-2"><button onClick={resetDemo} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex"><RotateCcw size={14}/> Reset</button><Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Use real account</Link></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8 lg:py-8">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:h-fit lg:sticky lg:top-24">
          <div className="mb-3 rounded-2xl bg-emerald-50 px-3 py-3"><p className="text-xs font-bold text-emerald-800">Mirpur Mess</p><p className="mt-1 text-[11px] leading-4 text-emerald-700">Sample August cycle · 4 members</p></div>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${active === id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}><Icon size={15}/>{label}</button>)}
          </nav>
          <div className="mt-4 hidden rounded-2xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 lg:block"><span className="font-semibold text-slate-800">Safe demo:</span> changes live only in this browser session and never touch your real Supabase data.</div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Interactive product tour</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">See how MealHisab works</h1><p className="mt-1 text-sm text-slate-500">Tap through the workflow and change sample data freely.</p></div><div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700"><Sparkles size={13}/> Sample data</div></div>

          {active === 'overview' && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[['Total meals', totalMeals.toString(), 'this cycle'], ['Food & house costs', `৳${totalExpenses.toLocaleString()}`, 'tracked expenses'], ['Meal rate', `৳${mealRate.toFixed(2)}`, 'per meal'], ['Contributions', `৳${totalContributions.toLocaleString()}`, 'recorded deposits']].map(([label, value, meta]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[11px] font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-[11px] text-slate-400">{meta}</p></div>)}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Member balances</h2><p className="text-xs text-slate-400">What each person should receive or pay</p></div><Users size={18} className="text-slate-400"/></div>{members.map((member) => <div key={member.id} className="flex items-center justify-between border-t border-slate-100 py-3"><div><p className="text-sm font-semibold">{member.name}</p><p className="text-[11px] text-slate-400">{member.meals} meals · {member.role}</p></div><p className={`text-sm font-bold ${balance(member) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{balance(member) >= 0 ? '+' : '-'}৳{Math.abs(balance(member)).toFixed(0)}</p></div>)}</div>
              <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Try it now</p><h2 className="mt-2 text-2xl font-black tracking-tight">Change the numbers.</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use the Meals tab to add or remove meals, then watch the meal rate and balances recalculate.</p><button onClick={() => setActive('meals')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-50">Open meal tracker <ArrowLeft size={14} className="rotate-180"/></button></div>
            </div>
          </>}

          {active === 'meals' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-bold">Meal tracker</h2><p className="text-sm text-slate-500">Adjust sample meals. These changes are local to Demo Mode.</p></div><div className="grid gap-3">{members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.role} · August cycle</p></div><div className="flex items-center gap-3"><button onClick={() => changeMeals(member.id, -1)} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100" aria-label={`Remove meal from ${member.name}`}><Minus size={16}/></button><div className="min-w-12 text-center"><p className="text-lg font-black">{member.meals}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">meals</p></div><button onClick={() => changeMeals(member.id, 1)} className="rounded-xl bg-slate-950 p-2 text-white hover:bg-emerald-700" aria-label={`Add meal for ${member.name}`}><Plus size={16}/></button></div></div>)}</div></div>}

          {active === 'expenses' && <div className="grid gap-4 lg:grid-cols-[1fr_.75fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Expenses</h2><p className="text-sm text-slate-500">Sample shared costs for the current cycle.</p></div><ClipboardList className="text-slate-400" size={18}/></div>{expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{expense.note}</p><p className="text-xs text-slate-400">{expense.category}</p></div><p className="font-bold">৳{expense.amount.toLocaleString()}</p></div>)}</div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Add a demo expense</h3><div className="mt-4 space-y-3"><input value={newExpense} onChange={(e) => setNewExpense(e.target.value)} placeholder="e.g. Vegetables" className="input w-full"/><input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Amount in BDT" inputMode="decimal" className="input w-full"/><button onClick={addExpense} className="btn-primary w-full">Add expense</button></div></div></div>}

          {active === 'contributions' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-bold">Contributions</h2><p className="text-sm text-slate-500">See deposits alongside each member's meal share.</p></div>{members.map((member) => <div key={member.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{member.name}</p><p className="text-xs text-slate-400">{member.meals} meals</p></div><div className="text-right"><p className="text-xs text-slate-400">Contribution</p><p className="font-bold">৳{member.contribution.toLocaleString()}</p></div><div className={`rounded-full px-3 py-1 text-xs font-bold ${balance(member) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{balance(member) >= 0 ? 'Credit' : 'Due'}</div></div>)}</div>}

          {active === 'reports' && <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Settlement preview</h2><p className="text-sm text-slate-500">What closing the cycle would snapshot.</p></div><WalletCards size={18} className="text-slate-400"/></div><div className="overflow-hidden rounded-2xl border border-slate-100"><div className="grid grid-cols-[1.4fr_.55fr_.8fr] bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Member</span><span>Meals</span><span>Balance</span></div>{members.map((member) => <div key={member.id} className="grid grid-cols-[1.4fr_.55fr_.8fr] border-t border-slate-100 px-4 py-3 text-sm"><span className="font-semibold">{member.name}</span><span className="text-slate-500">{member.meals}</span><span className={`font-bold ${balance(member) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{balance(member) >= 0 ? '+' : '-'}৳{Math.abs(balance(member)).toFixed(0)}</span></div>)}</div></div><div className="rounded-3xl bg-emerald-600 p-5 text-white shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Cycle summary</p><p className="mt-2 text-4xl font-black">৳{totalExpenses.toLocaleString()}</p><p className="mt-1 text-sm text-emerald-100">total tracked costs</p><div className="mt-6 grid grid-cols-2 gap-3">{[["Meals", totalMeals], ["Members", members.length], ["Rate", `৳${mealRate.toFixed(2)}`], ["Contributions", `৳${totalContributions.toLocaleString()}`]].map(([label, value]) => <div key={label as string} className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] uppercase tracking-wider text-emerald-100">{label as string}</p><p className="mt-1 text-sm font-bold">{value as string}</p></div>)}</div><button onClick={() => showToast('Demo settlement export prepared (sample only).')} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-emerald-700"><Download size={14}/> Export sample settlement</button></div></div>}

        </section>
      </div>
      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl">{toast}</div>}
    </main>
  )
}
