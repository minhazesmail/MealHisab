'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ChevronRight, CircleDollarSign, FileBarChart, HandCoins, History, LayoutDashboard, Menu, Settings, Utensils, WalletCards, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { BrandLogoMark } from '@/components/brand-logo-mark'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'
import type { DictKey } from '@/lib/i18n'

export { LanguageProvider, LanguageToggle }

type NavItem = { key: DictKey | 'nav.activity'; href: string; icon: LucideIcon }
const primaryNav: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'nav.meals', href: '/meals', icon: Utensils },
  { key: 'nav.calendar', href: '/calendar', icon: CalendarDays },
  { key: 'nav.expenses', href: '/expenses', icon: CircleDollarSign },
  { key: 'nav.contributions', href: '/contributions', icon: WalletCards },
]
const secondaryNav: NavItem[] = [
  { key: 'nav.settlements', href: '/settlements', icon: HandCoins },
  { key: 'nav.reports', href: '/reports', icon: FileBarChart },
  { key: 'nav.settings', href: '/settings', icon: Settings },
  { key: 'nav.activity', href: '/activity', icon: History },
]
const mobileMore: NavItem[] = [primaryNav[2], ...secondaryNav]
function isActive(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`) }
function navLabel(item: NavItem, locale: 'en' | 'bn', t: (key: DictKey) => string) {
  return item.key === 'nav.activity' ? (locale === 'bn' ? 'অ্যাক্টিভিটি' : 'Activity') : t(item.key as DictKey)
}

function NavLink({ item }: { item: NavItem }) {
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 ${active ? 'bg-brand-green/10 text-main' : 'text-muted hover:bg-surface-2 hover:text-main'}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${active ? 'bg-brand-green text-white shadow-sm' : 'bg-transparent text-muted group-hover:bg-surface-3 group-hover:text-main'}`}>
        <Icon size={16} strokeWidth={active ? 2.25 : 2}/>
      </span>
      <span className="flex-1">{navLabel(item, locale, t)}</span>
      <ChevronRight size={14} className={`transition ${active ? 'translate-x-0 text-brand-green opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50'}`}/>
    </Link>
  )
}

function DesktopNav() {
  const { locale } = useI18n()
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-line/80 bg-surface/72 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="px-5 pb-5 pt-5">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-1 py-2">
          <BrandLogoMark size={40} />
          <div><p className="text-[15px] font-black tracking-[-0.025em] text-main">MealHisab</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-muted">Bangladesh</p></div>
        </Link>
      </div>
      <div className="mx-5 h-px bg-line" />
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        <div>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/80">{locale === 'bn' ? 'দৈনিক' : 'Daily'}</p>
          <div className="space-y-1">{primaryNav.map(item => <NavLink key={item.href} item={item}/>)}</div>
        </div>
        <div>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/80">{locale === 'bn' ? 'ম্যানেজ' : 'Manage'}</p>
          <div className="space-y-1">{secondaryNav.map(item => <NavLink key={item.href} item={item}/>)}</div>
        </div>
      </nav>
      <div className="m-4 rounded-2xl border border-line bg-surface-2/70 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-green">{locale === 'bn' ? 'ওয়ার্কস্পেস' : 'Workspace'}</p>
        <p className="mt-2 text-xs leading-5 text-muted">{locale === 'bn' ? 'মিল, খরচ ও ব্যালেন্স—একটি নির্ভরযোগ্য লেজারে।' : 'Meals, expenses and balances in one reliable ledger.'}</p>
      </div>
    </aside>
  )
}

function MobileNavItem({ item }: { item: NavItem }) {
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  return (
    <Link href={item.href} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-none transition ${active ? 'text-brand-green' : 'text-muted'}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? 'bg-brand-green/10' : ''}`}><Icon size={18}/></span>
      <span className="max-w-full truncate">{navLabel(item, locale, t)}</span>
    </Link>
  )
}

export function MobileNav() {
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = mobileMore.some(({ href }) => isActive(pathname, href))
  const meals = primaryNav[1]
  const mealsActive = isActive(pathname, meals.href)
  const MealsIcon = meals.icon
  const moreLabel = locale === 'bn' ? 'আরও' : 'More'
  return <>
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] lg:hidden">
      <nav className="pointer-events-auto mx-auto flex max-w-lg items-end gap-1 rounded-[22px] border border-line bg-surface/92 px-2 pb-2 pt-2 shadow-[0_20px_55px_rgba(0,0,0,.18)] backdrop-blur-2xl">
        <MobileNavItem item={primaryNav[0]}/>
        <Link href={meals.href} aria-label={t(meals.key as DictKey)} aria-current={mealsActive ? 'page' : undefined} className="relative -mt-7 flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold leading-none text-main">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green-2 to-brand-green text-white shadow-[0_12px_28px_rgba(16,185,129,.28)] transition ${mealsActive ? '-translate-y-0.5 scale-[1.03]' : ''}`}><MealsIcon size={23}/></span>
          <span className="text-brand-green">{t(meals.key as DictKey)}</span>
        </Link>
        <MobileNavItem item={primaryNav[3]}/>
        <MobileNavItem item={primaryNav[4]}/>
        <button type="button" onClick={() => setMoreOpen(open => !open)} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-none transition ${moreActive || moreOpen ? 'text-brand-green' : 'text-muted'}`} aria-expanded={moreOpen} aria-label={locale === 'bn' ? 'আরও নেভিগেশন' : 'More navigation'}>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${moreActive || moreOpen ? 'bg-brand-green/10' : ''}`}>{moreOpen ? <X size={18}/> : <Menu size={18}/>}</span><span>{moreLabel}</span>
        </button>
      </nav>
    </div>
    {moreOpen && <div className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[3px] lg:hidden" onClick={() => setMoreOpen(false)}>
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.1rem)] mx-auto max-w-lg px-3" onClick={event => event.stopPropagation()}>
        <div className="rounded-[26px] border border-line bg-surface/96 p-4 shadow-[0_28px_80px_rgba(0,0,0,.28)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between px-1"><div><p className="eyebrow">{moreLabel}</p><p className="mt-1.5 text-base font-bold tracking-tight text-main">{locale === 'bn' ? 'আপনার মেস ম্যানেজ করুন' : 'Manage your mess'}</p></div><button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:bg-surface-2 hover:text-main" onClick={() => setMoreOpen(false)} aria-label={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}><X size={17}/></button></div>
          <div className="grid grid-cols-2 gap-2.5">{mobileMore.map((item) => { const { href, icon: Icon } = item; const active = isActive(pathname, href); return <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition ${active ? 'border-brand-green/30 bg-brand-green/10 text-main' : 'border-line bg-surface-2/70 text-main hover:border-line-strong'}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-brand-green text-white' : 'bg-surface-3 text-muted'}`}><Icon size={18}/></span><span>{navLabel(item, locale, t)}</span></Link> })}</div>
        </div>
      </div>
    </div>}
  </>
}

export function AppNav() { return <DesktopNav/> }
