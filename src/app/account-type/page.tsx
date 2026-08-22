'use client'

import Link from 'next/link'
import { Building2, Users, ArrowRight, ShieldCheck } from 'lucide-react'
import { LanguageToggle } from '@/components/language-provider'

export default function AccountTypePage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-main">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-muted hover:text-main">MealHisab BD</Link>
          <LanguageToggle />
        </div>
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">Get started</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">How do you want to use MealHisab?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Managers run a mess with the ৳99/month Manager Plan. Members join an existing flat for free with an invite code.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/login?role=manager" className="group card border-brand-green/30 bg-surface-2 transition hover:-translate-y-0.5 hover:border-brand-green/50">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-brand-green/15 p-3 text-brand-green"><Building2 size={22}/></div>
              <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-brand-green" size={18}/>
            </div>
            <h2 className="mt-5 text-xl font-bold">Register as Flat Manager</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Verify your phone or email, pay ৳99/month, create one flat, and invite your members.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-green"><ShieldCheck size={14}/> Manager Plan required</div>
          </Link>
          <Link href="/login?role=member" className="group card bg-surface-2 transition hover:-translate-y-0.5 hover:border-line-strong">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-surface-3 p-3 text-brand-green"><Users size={22}/></div>
              <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-brand-green" size={18}/>
            </div>
            <h2 className="mt-5 text-xl font-bold">Sign up with Flat Code</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Enter a manager’s invite code, verify your phone or email, and join the mess completely free.</p>
            <div className="mt-5 text-xs font-semibold text-brand-green">Members pay ৳0</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
