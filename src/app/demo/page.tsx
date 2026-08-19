'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  BarChart3, CalendarDays, CalendarX2, CircleDollarSign, ClipboardList,
  HandCoins, Home, Minus, Plus, RotateCcw, ShieldCheck, Utensils, Users,
} from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'

type Role = 'Admin' | 'Manager' | 'Member'
type Member = { id: string; name: string; role: Role; meals: number; contribution: number; activeTo: string | null; status: 'active' | 'left'; payout: number; collected: number }
type Expense = { id: number; note: string; category: string; amount: number }
type ClosedDay = { date: string; reason: string }
type ContributionEntry = { id: number; memberId: string; amount: number; note: string; date: string }

const CYCLE_START = '2026-08-01'
const CYCLE_END = '2026-08-31'
function autoDate() {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
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
const tabs = [
  ['overview', 'Overview', Home],
  ['meals', 'Meals', Utensils],
  ['calendar', 'Calendar', CalendarDays],
  ['expenses', 'Expenses', ClipboardList],
  ['contributions', 'Contributions', CircleDollarSign],
  ['operations', 'Operations', Users],
  ['reports', 'Settlement', BarChart3],
] as const

function LogoMark() {
  return (
    <svg width={34} height={34} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <defs><linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#16A34A" /><stop offset="1" stopColor="#0F766E" /></linearGradient></defs>
    </svg>
  )
}

export default function DemoPage() {
  const { t, locale } = useI18n()
  const assignedDate = autoDate()
  const [active, setActive] = useState('overview')
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
  const mealRate = totalMeals ? Math.round((totalExpenses / totalMeals + Number.EPSILON) * 100) / 100 : 0
  const totalContributions = useMemo(() => members.reduce((s, m) => s + m.contribution, 0), [members])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }
  function changeMeals(id: string, delta: number) {
    setMembers((c) => c.map((m) => (m.id === id && m.status === 'active' ? { ...m, meals: Math.max(0, m.meals + delta) } : m)))
    showToast(delta > 0 ? `Meal added for ${assignedDate} (auto).` : `Meal removed for ${assignedDate}.`)
  }
  function addExpense() {
    const amount = Math.round(Number(newAmount) * 100) / 100
    if (!newExpense.trim() || amount <= 0) return
    setExpenses((c) => [...c, { id: Date.now(), note: newExpense.trim(), category: newCategory, amount }])
    setNewExpense(''); setNewAmount('')
    showToast(`${newCategory} expense added.`)
  }
  function addContribution() {
    const amount = Math.round(Number(contributionAmount) * 100) / 100
    if (amount <= 0) { showToast('Enter a valid amount.'); return }
    const date = assignedDate
    setMembers((c) => c.map((m) => m.id === contributionMember && m.status === 'active' ? { ...m, contribution: Math.round((m.contribution + amount) * 100) / 100 } : m))
    setContributions((c) => [{ id: Date.now(), memberId: contributionMember, amount, note: contributionNote.trim() || 'Deposit', date }, ...c])
    setContributionAmount(''); setContributionNote('')
    const name = members.find((m) => m.id === contributionMember)?.name ?? 'Member'
    showToast(`${money(amount)} for ${name} · ${date} (auto)`)
  }
  function addClosedDay() {
    if (!holidayDate || closedDays.some((d) => d.date === holidayDate)) return
    setClosedDays((c) => [...c, { date: holidayDate, reason: holidayReason.trim() || 'Mess closed' }].sort((a, b) => a.date.localeCompare(b.date)))
    showToast('Mess-closed day added.')
  }
  function leaveFlat() {
    const m = members.find((i) => i.id === selectedMember)
    if (!m || m.status === 'left') return
    setMembers((c) => c.map((i) => (i.id === selectedMember ? { ...i, status: 'left', activeTo: departureDate } : i)))
    showToast(`${m.name} left on ${departureDate}.`)
  }
  function recordPayment() {
    const amount = Math.round(Number(paymentAmount) * 100) / 100
    if (amount <= 0) return
    setMembers((c) => c.map((m) => m.id === selectedMember ? (paymentDirection === 'payout' ? { ...m, payout: m.payout + amount } : { ...m, collected: m.collected + amount }) : m))
    showToast(`Recorded ${money(amount)} ${paymentDirection}.`)
  }
  function resetDemo() {
    setMembers(initialMembers); setExpenses(initialExpenses); setClosedDays(initialClosedDays)
    setContributions(initialContributions); setCalendarSelected(null); setActive('overview')
    showToast('Demo reset.')
  }
  function settlementFor(member: Member) {
    const roundedBase = Math.round(member.meals * mealRate * 100) / 100
    const totalRounded = activeMembers.reduce((s, i) => s + Math.round(i.meals * mealRate * 100) / 100, 0)
    const residual = Math.round((totalExpenses - totalRounded) * 100) / 100
    const highest = [...activeMembers].sort((a, b) => b.meals - a.meals)[0]
    const mealCost = Math.round((roundedBase + (member.id === highest?.id ? residual : 0)) * 100) / 100
    return { mealCost, finalBalance: Math.round((member.contribution - mealCost) * 100) / 100 }
  }

  const weekdays = locale === 'bn' ? ['রবি','সোম','মঙ্গল','বুধ','বৃহঃ','শুক্র','শনি'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><LogoMark /><div><p className="text-sm font-black">MealHisab</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">{t('demo.badge')}</p></div></div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={resetDemo} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold sm:inline-flex"><RotateCcw size={14} /> Reset</button>
            <Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">{t('demo.useReal')}</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr] sm:px-6">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-3 rounded-2xl bg-emerald-50 px-3 py-3"><p className="text-xs font-bold text-emerald-800">Mirpur Mess</p><p className="mt-1 text-[11px] text-emerald-700">01–31 Aug · auto-date {assignedDate}</p></div>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${active === id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
          <p className="mt-4 hidden text-[11px] text-slate-500 lg:block"><strong>{t('demo.safe')}:</strong> sample only. Meals & deposits date to {assignedDate}.</p>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{t('demo.tour')}</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{t('demo.title')}</h1>
              <p className="mt-1 text-sm text-slate-500">{t('demo.sub')}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13} /> {t('demo.safe')}</span>
          </div>

          {active === 'overview' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[['Total meals', String(totalMeals)], ['Shared costs', money(totalExpenses)], ['Meal rate', money(mealRate)], ['Contributions', money(totalContributions)]].map(([l, v]) => (
                  <div key={l} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[11px] text-slate-400">{l}</p><p className="mt-1 text-2xl font-black">{v}</p></div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold">Balances</h2>
                {members.map((m) => { const s = settlementFor(m); return (
                  <div key={m.id} className="flex justify-between border-t border-slate-100 py-3 text-sm">
                    <div><p className="font-semibold">{m.name} <span className="text-[10px] uppercase text-slate-400">{m.status}</span></p><p className="text-[11px] text-slate-400">{m.meals} meals · {money(m.contribution)} in</p></div>
                    <p className={`font-bold ${s.finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{s.finalBalance >= 0 ? '+' : '-'}{money(Math.abs(s.finalBalance))}</p>
                  </div>
                )})}
              </div>
            </>
          )}

          {active === 'meals' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Meal tracker</h2>
              <p className="text-sm text-slate-500">Auto date: <strong>{assignedDate}</strong> (Asia/Dhaka).</p>
              <div className="mt-4 grid gap-3">
                {members.map((m) => (
                  <div key={m.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold">{m.name}</p><p className="text-xs text-slate-400">{m.status === 'left' ? `Left ${m.activeTo}` : m.role}</p></div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => changeMeals(m.id, -1)} disabled={m.status === 'left'} className="rounded-xl border bg-white p-2 disabled:opacity-40"><Minus size={16} /></button>
                      <span className="min-w-10 text-center text-lg font-black">{m.meals}</span>
                      <button onClick={() => changeMeals(m.id, 1)} disabled={m.status === 'left'} className="rounded-xl bg-slate-950 p-2 text-white disabled:opacity-40"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'calendar' && (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">August 2026</h2>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                  {weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: new Date(2026, 7, 1).getDay() }, (_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = i + 1
                    const ymd = `2026-08-${String(d).padStart(2, '0')}`
                    const closed = closedDays.some((x) => x.date === ymd)
                    const isToday = ymd === assignedDate
                    const selected = calendarSelected === ymd
                    return (
                      <button key={ymd} type="button" onClick={() => setCalendarSelected(ymd)}
                        className={`min-h-[48px] rounded-xl border p-1 text-left text-xs ${selected ? 'border-emerald-500 bg-emerald-50' : closed ? 'border-amber-200 bg-amber-50' : isToday ? 'border-emerald-200 font-bold' : 'border-slate-100'}`}>
                        <div>{d}</div>
                        {closed && <div className="text-[10px] text-amber-700">Closed</div>}
                        {isToday && !closed && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold">Day details</h3>
                {!calendarSelected && <p className="mt-2 text-sm text-slate-500">Select a day.</p>}
                {calendarSelected && (
                  <div className="mt-3 text-sm">
                    <p><strong>{calendarSelected}</strong></p>
                    {closedDays.find((x) => x.date === calendarSelected) ? (
                      <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-amber-900">{closedDays.find((x) => x.date === calendarSelected)?.reason}</div>
                    ) : (
                      <p className="mt-2 text-slate-600">{calendarSelected === assignedDate ? 'Today — auto meal/contribution date.' : 'Open cycle day.'}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {active === 'expenses' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Expenses</h2>
                {expenses.map((e) => (
                  <div key={e.id} className="flex justify-between border-t border-slate-100 py-3 text-sm"><div><p className="font-semibold">{e.note}</p><p className="text-xs text-slate-400">{e.category}</p></div><p className="font-bold">{money(e.amount)}</p></div>
                ))}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold">Add expense</h3>
                <input className="input w-full" value={newExpense} onChange={(e) => setNewExpense(e.target.value)} placeholder="Note" />
                <select className="input w-full" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}><option>Grocery</option><option>Cook salary</option><option>Gas</option><option>Other</option></select>
                <input className="input w-full" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Amount" inputMode="decimal" />
                <button className="btn-primary w-full" onClick={addExpense}>Add expense</button>
              </div>
            </div>
          )}

          {active === 'contributions' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Contributions</h2>
                <p className="text-sm text-slate-500">Auto date: {assignedDate}</p>
                {contributions.map((row) => (
                  <div key={row.id} className="flex justify-between border-t border-slate-100 py-3 text-sm">
                    <div><p className="font-semibold">{members.find((m) => m.id === row.memberId)?.name}</p><p className="text-xs text-slate-400">{row.note}</p></div>
                    <div className="text-right"><p className="font-bold">{money(row.amount)}</p><p className="text-[11px] text-slate-400">{row.date}</p></div>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-950">Add contribution</h3>
                <p className="text-xs text-emerald-800">Stamps to <strong>{assignedDate}</strong> automatically.</p>
                <select className="input w-full bg-white" value={contributionMember} onChange={(e) => setContributionMember(e.target.value)}>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input className="input w-full bg-white" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} placeholder="Amount" inputMode="decimal" />
                <input className="input w-full bg-white" value={contributionNote} onChange={(e) => setContributionNote(e.target.value)} placeholder="Note" />
                <button className="btn-primary w-full" onClick={addContribution}>Add contribution</button>
              </div>
            </div>
          )}

          {active === 'operations' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2"><CalendarX2 size={18} className="text-emerald-600" /><h2 className="text-lg font-bold">Mess closed</h2></div>
                {closedDays.map((d) => <div key={d.date} className="rounded-xl bg-slate-50 p-3 text-sm mb-2"><p className="font-semibold">{d.date}</p><p className="text-xs text-slate-500">{d.reason}</p></div>)}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="date" className="input" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
                  <input className="input" value={holidayReason} onChange={(e) => setHolidayReason(e.target.value)} placeholder="Reason" />
                </div>
                <button className="btn-primary mt-3 w-full" onClick={addClosedDay}>Mark closed</button>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-lg font-bold">Departure</h2>
                <select className="input w-full" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                  {members.filter((m) => m.status === 'active').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" className="input w-full" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                <button className="btn-primary w-full" onClick={leaveFlat}>Leave flat</button>
              </div>
            </div>
          )}

          {active === 'reports' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Settlement</h2>
                {members.map((m) => { const s = settlementFor(m); return (
                  <div key={m.id} className="border-t border-slate-100 py-3 text-sm">
                    <div className="flex justify-between"><p className="font-semibold">{m.name}</p><p className={`font-bold ${s.finalBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{s.finalBalance >= 0 ? 'Receivable' : 'Payable'} {money(Math.abs(s.finalBalance))}</p></div>
                    <p className="text-xs text-slate-400">{m.meals} meals · cost {money(s.mealCost)}</p>
                  </div>
                )})}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold">Payout / collection</h3>
                <select className="input w-full" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <select className="input w-full" value={paymentDirection} onChange={(e) => setPaymentDirection(e.target.value as 'payout' | 'collection')}><option value="payout">Payout</option><option value="collection">Collection</option></select>
                <input className="input w-full" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" placeholder="Amount" />
                <button className="btn-primary w-full" onClick={recordPayment}>Record</button>
              </div>
            </div>
          )}
        </section>
      </div>
      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </main>
  )
}
