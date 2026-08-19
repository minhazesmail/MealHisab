import Link from 'next/link'
import { ArrowRight, Check, CircleCheck, WalletCards, Utensils, Users, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MealHisab BD — Simple meal accounting for shared flats',
  description: 'Track meals, expenses, contributions and monthly settlements for Bangladeshi messes, shared flats and small households.',
}

function LogoMark({ size = 40 }: { size?: number }) {
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

function MiniAuthCard() {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Get started</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Log in / Sign up</h2>
          <p className="mt-1 text-sm text-slate-500">One Bangladesh phone number. Same simple flow for everyone.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Utensils size={18} /></div>
      </div>
      <div className="space-y-3">
        <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
          Continue with phone <ArrowRight size={16} />
        </Link>
        <p className="text-center text-xs leading-5 text-slate-400">New here? Your MealHisab account is created automatically when you verify your number.</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
        {['Secure OTP', 'BDT-ready', 'Private flats'].map((item) => <div key={item} className="rounded-2xl bg-slate-50 px-2 py-3 font-medium">{item}</div>)}
      </div>
    </div>
  )
}

function DashboardPreview() {
  const rows = [
    ['Rahim Ahmed', '38', '৳2,014', '+৳286'],
    ['Nabila Karim', '32', '৳1,696', '-৳196'],
    ['Sajid Hasan', '29', '৳1,537', '-৳537'],
  ]
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <LogoMark size={30} />
          <div><p className="text-sm font-bold text-slate-900">Mirpur Mess</p><p className="text-[11px] text-slate-400">01 Aug — 31 Aug</p></div>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Open cycle</div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {[
          ['Total meals', '99', 'this cycle'],
          ['Food cost', '৳5,247', 'grocery only'],
          ['Meal rate', '৳53.00', 'per meal'],
        ].map(([label, value, meta]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-medium text-slate-400">{label}</p><p className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-[10px] text-slate-400">{meta}</p></div>)}
      </div>
      <div className="px-5 pb-5">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Member balances</p><p className="text-[11px] text-slate-400">Live</p></div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          {rows.map(([name, meals, cost, balance], index) => <div key={name} className={`grid grid-cols-[1.6fr_.45fr_.75fr_.6fr] items-center gap-2 px-4 py-3 text-xs ${index < rows.length - 1 ? 'border-b border-slate-100' : ''}`}><div className="font-semibold text-slate-800">{name}</div><div className="text-slate-500">{meals}</div><div className="text-slate-500">{cost}</div><div className={balance.startsWith('-') ? 'font-semibold text-rose-500' : 'font-semibold text-emerald-600'}>{balance}</div></div>)}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9f8] text-slate-950">
      <div className="absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,.13),_transparent_38%),radial-gradient(circle_at_85%_20%,_rgba(13,148,136,.12),_transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={38} />
            <div><div className="text-sm font-black tracking-tight text-slate-950 sm:text-base">MealHisab</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">BD</div></div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 sm:inline-flex">Log in</Link>
            <Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Get started</Link>
          </div>
        </header>

        <section className="grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:pb-24 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm"><Sparkles size={14} /> Built for Bangladesh messes & shared flats</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">Meals, money and monthly settlement — <span className="text-emerald-600">finally in one place.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">MealHisab replaces notebooks, spreadsheets and WhatsApp math with one calm ledger for meals, groceries, contributions and end-of-month balances.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-700">Start your flat <ArrowRight size={17} /></Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-white">Already have an account</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              {['Bangladesh phone OTP', 'BDT by default', 'Flat-level privacy'].map((text) => <span key={text} className="inline-flex items-center gap-2"><CircleCheck size={14} className="text-emerald-600" />{text}</span>)}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[44px] bg-emerald-400/10 blur-2xl" />
            <div className="relative"><DashboardPreview /><div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-white/90 bg-white/95 p-4 shadow-xl sm:block"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><WalletCards size={17} /></div><div><p className="text-xs font-semibold text-slate-900">Cycle ready</p><p className="text-[11px] text-slate-400">Balances calculated automatically</p></div></div></div></div>
          </div>
        </section>

        <section className="grid gap-4 border-y border-slate-200/80 py-10 sm:grid-cols-3">
          {[
            [Users, 'One shared source of truth', 'Everyone sees the same meals, contributions and balances.'],
            [Utensils, 'Meal policy that actually fits', 'Opt-out by default, opt-in when your mess needs more control.'],
            [WalletCards, 'Close the month cleanly', 'Snapshot settlements and carry balances into the next cycle.'],
          ].map(([Icon, title, body]) => <div key={title as string} className="rounded-3xl bg-white/75 p-5 shadow-sm"><div className="mb-4 inline-flex rounded-2xl bg-slate-950 p-3 text-white"><Icon size={17} /></div><h3 className="text-sm font-bold text-slate-950">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body as string}</p></div>)}
        </section>

        <section className="grid gap-10 py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Why MealHisab</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Designed for the way a Bangladeshi mess actually works.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">No accounting degree. No spreadsheet maintenance. No chasing everyone for screenshots. MealHisab keeps the workflow close to the kitchen table.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['Meal tracking', 'Lunch, dinner and extra/guest meals in seconds.'], ['Shared expenses', 'Groceries, cook salary, gas and other costs.'], ['Contributions', 'Record deposits and see their effect on balance.'], ['Settlement', 'Close a cycle and carry credits into the next one.']].map(([title, body]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-full bg-emerald-50 p-2 text-emerald-600"><Check size={15} /></div><div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></div></div></div>)}
          </div>
        </section>

        <section className="grid gap-8 rounded-[34px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 sm:p-8 lg:grid-cols-[1.05fr_.95fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex items-center gap-3"><LogoMark size={42} /><div className="font-bold">MealHisab BD</div></div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl">Make the monthly numbers feel simple again.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Create a flat, invite your housemates and let the numbers take care of themselves.</p>
          </div>
          <div className="lg:pl-8"><MiniAuthCard /></div>
        </section>

        <footer className="flex flex-col gap-3 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} MealHisab BD. Simple shared-house accounting.</p><div className="flex gap-4"><Link href="/login" className="hover:text-slate-700">Log in</Link><Link href="/onboarding" className="hover:text-slate-700">Create a flat</Link></div></footer>
      </div>
    </main>
  )
}
