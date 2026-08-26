'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, CalendarCheck2, Check, CirclePlay, ReceiptText, ShieldCheck, Sparkles, Utensils, WalletCards } from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'
import { ThemeToggle } from '@/components/theme-toggle'

function LogoMark({ size = 40 }: { size?: number }) {
  return <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-brand-green-2 to-brand-green text-white shadow-[0_10px_28px_rgba(16,185,129,.22)]"><Utensils size={Math.round(size * .45)} strokeWidth={2.2}/></span>
}

export default function LandingPage() {
  const { t, locale } = useI18n()
  const bn = locale === 'bn'
  const copy = bn ? {
    badge: 'বাংলাদেশের মেস ও শেয়ার্ড ফ্ল্যাটের জন্য',
    titleA: 'মেসের হিসাব,', titleB: 'এবার সত্যিই সহজ।',
    sub: 'মিল, বাজার, জমা ও মাসশেষের সেটেলমেন্ট—সবকিছু একটি পরিষ্কার, নির্ভরযোগ্য লেজারে রাখুন।',
    start: 'ম্যানেজার হিসেবে শুরু করুন', join: 'ফ্ল্যাট কোড দিয়ে যোগ দিন',
    note: 'ম্যানেজার ৳৯৯/মাস · সদস্যরা ফ্রি',
    live: 'লাইভ সাইকেল', balance: 'সদস্য ব্যালেন্স',
    section: 'একটি লেজার। কম ঝামেলা।',
    sectionSub: 'দিনের কাজ থেকে মাসশেষের হিসাব—MealHisab একই তথ্য থেকে সবকিছু আপডেট রাখে।',
    meals: 'দৈনিক মিল', mealsBody: 'মোবাইল থেকেই দ্রুত মিল লগ করুন এবং পরিবর্তন সঙ্গে সঙ্গে দেখুন।',
    expenses: 'শেয়ার্ড খরচ', expensesBody: 'বাজার ও অন্যান্য খরচ এক জায়গায় রেকর্ড করুন।',
    settle: 'স্বচ্ছ সেটেলমেন্ট', settleBody: 'কার কত পাওনা বা বাকি—মাসশেষে পরিষ্কারভাবে দেখুন।',
    secure: 'ফ্ল্যাট-লেভেল প্রাইভেসি', secureBody: 'প্রতিটি মেসের তথ্য তাদের নিজস্ব ওয়ার্কস্পেসে সীমাবদ্ধ।',
    demoEyebrow: 'সাইন আপের আগে দেখে নিন', demoTitle: 'চারটি ধাপে পুরো হিসাবের প্রবাহ বুঝে নিন।', demoBody: 'ডেমোতে মিল, জমা, খরচ ও সেটেলমেন্ট ব্যবহার করে দেখুন—কোনো অ্যাকাউন্ট লাগবে না।', demo: 'ইন্টার‌্যাক্টিভ ডেমো খুলুন',
    cta: 'নোটবুক আর গ্রুপ-চ্যাটের হিসাব থেকে বেরিয়ে আসুন।', ctaSub: 'আজই আপনার মেসের জন্য একটি নির্ভরযোগ্য হিসাবের জায়গা তৈরি করুন।',
  } : {
    badge: 'Built for Bangladesh messes & shared flats',
    titleA: 'Shared-house accounting,', titleB: 'finally made calm.',
    sub: 'Track meals, grocery spend, contributions and month-end settlements in one clear, dependable ledger.',
    start: 'Start as manager', join: 'Join with Flat Code',
    note: 'Manager ৳99/month · Members free',
    live: 'Live cycle', balance: 'Member balances',
    section: 'One ledger. Less friction.',
    sectionSub: 'From daily meal logging to month-end settlement, MealHisab keeps every number connected to the same source of truth.',
    meals: 'Daily meals', mealsBody: 'Log meals quickly from mobile and see the cycle update immediately.',
    expenses: 'Shared expenses', expensesBody: 'Record groceries and household costs without spreadsheet cleanup.',
    settle: 'Clear settlements', settleBody: 'See who has credit and who still owes when the cycle closes.',
    secure: 'Flat-level privacy', secureBody: 'Each household stays isolated inside its own private workspace.',
    demoEyebrow: 'Explore before signing up', demoTitle: 'Understand the whole flow in four guided steps.', demoBody: 'Try meals, contributions, expenses and settlement with realistic sample data—no account required.', demo: 'Open interactive demo',
    cta: 'Move your mess beyond notebooks and group-chat math.', ctaSub: 'Create a dependable place for your household accounts today.',
  }

  return <main className="min-h-screen overflow-hidden bg-canvas text-main">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_-6%,rgb(var(--brand-green)/.10),transparent_30rem),radial-gradient(circle_at_90%_12%,rgb(var(--brand-green)/.06),transparent_26rem)]" />
    <div className="relative mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-30 flex items-center justify-between rounded-2xl border border-line bg-surface/84 px-3.5 py-3 shadow-soft backdrop-blur-2xl sm:px-4">
        <Link href="/" className="flex items-center gap-3"><LogoMark size={38}/><div><p className="text-sm font-black tracking-[-0.025em] text-main">MealHisab</p><p className="text-[9px] font-bold uppercase tracking-[0.19em] text-muted">Bangladesh</p></div></Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle compact />
          <LanguageToggle />
          <Link href="/demo" className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-main md:inline-flex">{t('nav.tryDemo')}</Link>
          <Link href="/login" className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-main sm:inline-flex">{t('nav.logIn')}</Link>
          <Link href="/account-type" className="btn-primary min-h-9 px-3.5 py-2 text-xs sm:text-sm">{t('nav.getStarted')}<ArrowRight size={14}/></Link>
        </div>
      </header>

      <section className="grid items-center gap-12 pb-20 pt-20 sm:pt-24 lg:grid-cols-[1.04fr_.96fr] lg:gap-16 lg:pb-28 lg:pt-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-[11px] font-bold text-brand-green"><Sparkles size={13}/>{copy.badge}</div>
          <h1 className="mt-6 max-w-3xl text-[3.15rem] font-black leading-[.98] tracking-[-0.055em] text-main sm:text-6xl lg:text-[4.5rem]">{copy.titleA}<br/><span className="text-brand-green">{copy.titleB}</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">{copy.sub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register/manager" className="btn-primary px-5 py-3">{copy.start}<ArrowRight size={16}/></Link><Link href="/join" className="btn-secondary px-5 py-3">{copy.join}</Link></div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted"><span>{copy.note}</span><span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block"/><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-green"/>{t('landing.privacy')}</span></div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[40px] bg-brand-green/8 blur-3xl"/>
          <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><LogoMark size={34}/><div><p className="text-sm font-bold text-main">Mirpur Mess</p><p className="mt-0.5 text-[11px] text-muted">01 Aug — 31 Aug</p></div></div><span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-green">{copy.live}</span></div>
            <div className="grid grid-cols-3 gap-px bg-line"><div className="bg-surface p-4 sm:p-5"><p className="text-[10px] font-semibold text-muted">{t('landing.previewMeals')}</p><p className="mt-2 text-xl font-black text-main sm:text-2xl">99</p></div><div className="bg-surface p-4 sm:p-5"><p className="text-[10px] font-semibold text-muted">{t('landing.previewFood')}</p><p className="mt-2 text-xl font-black text-main sm:text-2xl">৳5,247</p></div><div className="bg-surface p-4 sm:p-5"><p className="text-[10px] font-semibold text-muted">{t('landing.previewRate')}</p><p className="mt-2 text-xl font-black text-brand-green sm:text-2xl">৳53</p></div></div>
            <div className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold text-main">{copy.balance}</p><BarChart3 size={16} className="text-muted"/></div><div className="space-y-2">{[['Rahim Ahmed','+৳286',true],['Nabila Karim','-৳196',false],['Sajid Hasan','-৳537',false]].map(([name,balance,positive]) => <div key={String(name)} className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[10px] font-bold text-main">{String(name).slice(0,1)}</span><span className="text-xs font-semibold text-main sm:text-sm">{name as string}</span></div><span className={`text-xs font-bold sm:text-sm ${positive ? 'text-brand-green' : 'text-danger'}`}>{balance as string}</span></div>)}</div></div>
          </div>
        </div>
      </section>

      <section className="border-y border-line py-16 sm:py-20">
        <div className="max-w-2xl"><p className="eyebrow text-brand-green">MealHisab</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-main sm:text-4xl">{copy.section}</h2><p className="mt-3 text-sm leading-7 text-muted sm:text-base">{copy.sectionSub}</p></div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Utensils,copy.meals,copy.mealsBody],[ReceiptText,copy.expenses,copy.expensesBody],[WalletCards,copy.settle,copy.settleBody],[ShieldCheck,copy.secure,copy.secureBody]].map(([Icon,title,body]) => { const I = Icon as typeof Utensils; return <article key={String(title)} className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green/10 text-brand-green"><I size={17}/></span><h3 className="mt-4 text-sm font-bold text-main">{title as string}</h3><p className="mt-2 text-xs leading-5 text-muted">{body as string}</p></article> })}</div>
      </section>

      <section className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div><p className="eyebrow text-brand-green">{copy.demoEyebrow}</p><h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.035em] text-main sm:text-4xl">{copy.demoTitle}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">{copy.demoBody}</p><Link href="/demo" className="btn-primary mt-6"><CirclePlay size={16}/>{copy.demo}</Link></div>
        <div className="grid gap-3 sm:grid-cols-2">{[[Utensils,t('landing.featMeals')],[WalletCards,t('landing.featCont')],[ReceiptText,t('landing.featExp')],[CalendarCheck2,t('landing.featSet')]].map(([Icon,title],index) => { const I = Icon as typeof Utensils; return <div key={String(title)} className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-brand-green"><I size={16}/></span><span className="text-xs font-black text-line-strong">0{index+1}</span></div><p className="mt-5 text-sm font-bold text-main">{title as string}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand-green" style={{ width: `${40 + index * 16}%` }}/></div></div> })}</div>
      </section>

      <section className="mb-10 overflow-hidden rounded-[30px] border border-line bg-surface shadow-soft"><div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:p-11"><div><div className="flex items-center gap-3"><LogoMark size={40}/><span className="text-sm font-black text-main">MealHisab BD</span></div><h2 className="mt-6 max-w-2xl text-3xl font-black tracking-[-0.035em] text-main sm:text-4xl">{copy.cta}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">{copy.ctaSub}</p></div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col"><Link href="/register/manager" className="btn-primary">{copy.start}<ArrowRight size={15}/></Link><Link href="/join" className="btn-secondary">{copy.join}</Link></div></div></section>

      <footer className="flex flex-col gap-4 border-t border-line py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} MealHisab BD. {t('landing.footer')}</p><div className="flex flex-wrap gap-5"><Link href="/demo" className="transition hover:text-main">{t('nav.tryDemo')}</Link><Link href="/login" className="transition hover:text-main">{t('nav.logIn')}</Link><Link href="/account-type" className="transition hover:text-main">{t('nav.getStarted')}</Link></div></footer>
    </div>
  </main>
}
