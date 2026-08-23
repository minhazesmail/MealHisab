'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Check, CreditCard, KeyRound, ShieldCheck, Users } from 'lucide-react'
import { LanguageToggle } from '@/components/language-provider'

function BrandMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94" />
      <defs><linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#39FF88" /><stop offset="1" stopColor="#19D96B" /></linearGradient></defs>
    </svg>
  )
}

export default function AccountTypePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-4 py-8 text-main sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(circle_at_20%_5%,_rgba(57,255,136,.15),_transparent_34%),radial-gradient(circle_at_88%_18%,_rgba(25,217,107,.10),_transparent_30%)]" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3"><BrandMark /><div><div className="text-sm font-black tracking-tight sm:text-base">MealHisab</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Bangladesh</div></div></Link>
          <LanguageToggle />
        </div>

        <div className="mb-8 rounded-2xl border border-brand-green/30 bg-gradient-to-r from-brand-green/10 via-brand-green/[0.06] to-transparent px-4 py-4 shadow-soft sm:px-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">MealHisab pricing</p><p className="mt-1 text-base font-black text-main">Manager Plan ৳99/month · Members ৳0</p><p className="mt-1 text-xs leading-5 text-muted">One manager subscription runs the flat. Members join free with a valid Flat Code.</p></div><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-brand-green">10 invite codes/month</span><span className="rounded-full bg-brand-green px-3 py-1.5 text-black">Members join free</span></div></div></div>

        <header className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Welcome to MealHisab BD</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">How do you want to continue?</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">Choose your role. Managers subscribe for ৳99/month; members join an existing flat completely free.</p></header>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Signup options">
          <Link href="/register/manager" className="group relative overflow-hidden rounded-[28px] border border-brand-green/30 bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-green/60 hover:shadow-glow sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-green/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-brand-green/15 p-3.5 text-brand-green"><Building2 size={24} /></div><span className="rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-green">Paid manager plan</span></div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight">Register as Flat Manager</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Create and manage one mess/shared flat, invite members, track meals and expenses, and close monthly settlements.</p>
              <div className="mt-5 rounded-2xl border border-brand-green/20 bg-surface-2 p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted">Manager subscription</p><p className="mt-1 text-2xl font-black text-main">৳99<span className="ml-1 text-xs font-medium text-muted">/month</span></p></div><CreditCard size={20} className="text-brand-green" /></div><div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2"><span className="inline-flex items-center gap-2"><Check size={13} className="text-brand-green" /> 1 flat</span><span className="inline-flex items-center gap-2"><Check size={13} className="text-brand-green" /> 10 invite codes/month</span><span className="inline-flex items-center gap-2"><Check size={13} className="text-brand-green" /> Meal + expense tracking</span><span className="inline-flex items-center gap-2"><Check size={13} className="text-brand-green" /> Settlements + reports</span></div></div>
              <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3.5 text-sm font-bold text-black shadow-glow transition group-hover:bg-brand-green-2">Start as Manager <ArrowRight size={17} /></span><p className="mt-3 text-center text-[11px] text-muted">Verify with OTP • Pay by bKash / Nagad / Rocket</p>
            </div>
          </Link>

          <Link href="/join" className="group relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-line-strong sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-surface-3 p-3.5 text-brand-green"><Users size={24} /></div><span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-green">৳0 for members</span></div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight">Join with Flat Code</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Your mess manager pays for the flat. Enter the valid invite code they gave you and join without buying a subscription.</p>
              <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4"><p className="text-xs text-muted">Free member signup</p><div className="mt-2 space-y-2 text-xs text-muted"><span className="flex items-center gap-2"><KeyRound size={13} className="text-brand-green" /> Valid Flat Code</span><span className="flex items-center gap-2"><ShieldCheck size={13} className="text-brand-green" /> Email OTP verification</span><span className="flex items-center gap-2"><Check size={13} className="text-brand-green" /> No monthly fee</span></div></div>
              <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface-2 px-5 py-3.5 text-sm font-bold text-brand-green transition group-hover:bg-surface-3">Join Free <ArrowRight size={17} /></span><p className="mt-3 text-center text-[11px] text-muted">Members pay ৳0 • Phone OTP optional</p>
            </div>
          </Link>
        </section>

        <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-line bg-surface/70 p-4 text-center"><p className="text-lg font-black text-brand-green">৳99</p><p className="mt-1 text-xs text-muted">manager plan / month</p></div><div className="rounded-2xl border border-line bg-surface/70 p-4 text-center"><p className="text-lg font-black text-brand-green">10</p><p className="mt-1 text-xs text-muted">invite codes / calendar month</p></div><div className="rounded-2xl border border-line bg-surface/70 p-4 text-center"><p className="text-lg font-black text-brand-green">৳0</p><p className="mt-1 text-xs text-muted">member subscription</p></div></div>

        <p className="mt-8 text-center text-xs text-muted">Already have a MealHisab account? <Link href="/login" className="font-semibold text-brand-green hover:underline">Log in</Link></p>
      </div>
    </main>
  )
}
