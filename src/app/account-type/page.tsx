'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Check, KeyRound, ShieldCheck, Users } from 'lucide-react'
import { BrandLogoMark } from '@/components/brand-logo-mark'
import { LanguageToggle, useI18n } from '@/components/language-provider'

export default function AccountTypePage() {
  const { locale } = useI18n()
  const bn = locale === 'bn'

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-4 py-8 text-main sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(circle_at_20%_5%,_rgba(57,255,136,.15),_transparent_34%),radial-gradient(circle_at_88%_18%,_rgba(25,217,107,.10),_transparent_30%)]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3"><BrandLogoMark size={40} /><div><div className="text-sm font-black tracking-tight sm:text-base">MealHisab</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Bangladesh</div></div></Link>
          <LanguageToggle />
        </div>

        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">{bn ? 'শুরু করার আগে' : 'Before you continue'}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{bn ? 'আপনি মেস ম্যানেজ করেন, নাকি মেম্বার?' : 'Do you manage the mess, or are you joining one?'}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">{bn ? 'ম্যানেজার একটি ফ্ল্যাট চালানোর জন্য ৳49/মাস দেয়। মেম্বাররা ফ্ল্যাট কোড দিয়ে ফ্রি যোগ দেয়।' : 'Managers pay ৳49/month to run one flat. Members join an existing flat for free with a Flat Code.'}</p>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label={bn ? 'অ্যাকাউন্ট টাইপ' : 'Account type'}>
          <Link href="/register/manager" className="group relative overflow-hidden rounded-[28px] border border-brand-green/30 bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-green/60 hover:shadow-glow sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-green/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-brand-green/15 p-3.5 text-brand-green"><Building2 size={24} /></div>
                <span className="rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-[11px] font-bold text-brand-green">৳49 / {bn ? 'মাস' : 'month'}</span>
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight">{bn ? 'আমি মেস ম্যানেজ করি' : 'I manage the mess'}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{bn ? 'একটি ফ্ল্যাট তৈরি করুন, মেম্বার ইনভাইট করুন, মিল-খরচ-জমা ট্র্যাক করুন এবং মাস শেষে সেটেলমেন্ট বন্ধ করুন।' : 'Create one flat, invite members, track meals, expenses and contributions, then close the monthly settlement.'}</p>
              <div className="mt-5 space-y-2 text-sm text-muted">
                <span className="flex items-center gap-2"><Check size={15} className="text-brand-green" /> {bn ? '১টি ফ্ল্যাট' : '1 flat'}</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-brand-green" /> {bn ? 'প্রতি মাসে ১০টি ইনভাইট কোড' : '10 invite codes each month'}</span>
                <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-brand-green" /> {bn ? 'ইমেইল OTP দিয়ে ভেরিফাই' : 'Verify with email OTP'}</span>
              </div>
              <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3.5 text-sm font-bold text-black shadow-glow transition group-hover:bg-brand-green-2">{bn ? 'ম্যানেজার হিসেবে শুরু করুন' : 'Start as Manager'} <ArrowRight size={17} /></span>
            </div>
          </Link>

          <Link href="/join" className="group relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-line-strong sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-surface-3 p-3.5 text-brand-green"><Users size={24} /></div>
                <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1 text-[11px] font-bold text-brand-green">৳0</span>
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight">{bn ? 'আমি আমার মেসে যোগ দিচ্ছি' : 'I am joining my mess'}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{bn ? 'আপনার ম্যানেজার যে ফ্ল্যাট কোড দিয়েছেন সেটি ব্যবহার করুন। কোনো সাবস্ক্রিপশন লাগবে না।' : 'Use the Flat Code from your manager. You do not need your own paid subscription.'}</p>
              <div className="mt-5 space-y-2 text-sm text-muted">
                <span className="flex items-center gap-2"><KeyRound size={15} className="text-brand-green" /> {bn ? 'ভ্যালিড ফ্ল্যাট কোড লাগবে' : 'Valid Flat Code required'}</span>
                <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-brand-green" /> {bn ? 'ইমেইল OTP ভেরিফিকেশন' : 'Email OTP verification'}</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-brand-green" /> {bn ? 'মাসিক ফি নেই' : 'No monthly fee'}</span>
              </div>
              <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface-2 px-5 py-3.5 text-sm font-bold text-brand-green transition group-hover:bg-surface-3">{bn ? 'ফ্ল্যাট কোড দিয়ে যোগ দিন' : 'Join with Flat Code'} <ArrowRight size={17} /></span>
            </div>
          </Link>
        </section>

        <div className="mt-6 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-center text-xs text-muted">
          {bn ? 'ম্যানেজার পেমেন্ট: bKash / Nagad / Rocket • মেম্বার: ফ্রি' : 'Manager payment: bKash / Nagad / Rocket • Members: free'}
        </div>

        <p className="mt-8 text-center text-sm text-muted">{bn ? 'আগেই MealHisab অ্যাকাউন্ট আছে?' : 'Already have a MealHisab account?'} <Link href="/login" className="font-semibold text-brand-green hover:underline">{bn ? 'লগ ইন' : 'Log in'}</Link></p>
      </div>
    </main>
  )
}
