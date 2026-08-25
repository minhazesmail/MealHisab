'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, ChevronRight, CircleDollarSign, History, LayoutDashboard, Menu, Settings, Utensils, WalletCards, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
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
  { key: 'nav.settlements', href: '/settlements', icon: BarChart3 },
  { key: 'nav.reports', href: '/reports', icon: BarChart3 },
  { key: 'nav.settings', href: '/settings', icon: Settings },
  { key: 'nav.activity', href: '/activity', icon: History },
]
const mobileMore: NavItem[] = [primaryNav[2], ...secondaryNav]
function isActive(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`) }

function NavLink({ item }: { item: NavItem }) {
  const { t } = useI18n(); const pathname = usePathname(); const active = isActive(pathname, item.href); const Icon = item.icon
  return <Link href={item.href} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${active ? 'border-line-strong bg-surface-3 text-brand-green shadow-glow' : 'border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-main'}`}><Icon size={18} strokeWidth={active ? 2.3 : 2}/><span className="flex-1">{item.key === 'nav.activity' ? 'Activity' : t(item.key as DictKey)}</span><ChevronRight size={14} className={`transition ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}/></Link>
}

function DesktopNav() {
  return <aside className="hidden w-64 shrink-0 border-r border-line bg-surface/95 lg:flex lg:flex-col">
    <div className="border-b border-line px-5 pb-5 pt-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Workspace</p>
      <p className="mt-2 text-sm font-semibold text-main">Your shared kitchen, in one place.</p>
    </div>
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      <div><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Daily</p><div className="space-y-1">{primaryNav.map(item => <NavLink key={item.href} item={item}/>)}</div></div>
      <div><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Manage</p><div className="space-y-1">{secondaryNav.map(item => <NavLink key={item.href} item={item}/>)}</div></div>
    </nav>
    <div className="border-t border-line px-5 py-4 text-[11px] text-muted">MealHisab BD · Simple mess accounting</div>
  </aside>
}

function MobileNavItem({ item }: { item: NavItem }) {
  const { t } = useI18n(); const pathname = usePathname(); const active = isActive(pathname, item.href); const Icon = item.icon
  return <Link href={item.href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${active ? 'text-brand-green' : 'text-muted'}`}><Icon size={19}/><span className="truncate">{item.key === 'nav.activity' ? 'Activity' : t(item.key as DictKey)}</span></Link>
}

export function MobileNav() {
  const { t } = useI18n(); const pathname = usePathname(); const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = mobileMore.some(({ href }) => isActive(pathname, href)); const meals = primaryNav[1]; const mealsActive = isActive(pathname, meals.href); const MealsIcon = meals.icon
  return <>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-end gap-1">
        <MobileNavItem item={primaryNav[0]}/>
        <button type="button" aria-label={t(meals.key as DictKey)} aria-current={mealsActive ? 'page' : undefined} className="relative -mt-6 flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-bold text-black" onClick={() => { window.location.href = meals.href }}><span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-canvas bg-brand-green shadow-glow transition ${mealsActive ? 'scale-105' : ''}`}><MealsIcon size={24}/></span><span className="text-brand-green">{t(meals.key as DictKey)}</span></button>
        <MobileNavItem item={primaryNav[3]}/>
        <MobileNavItem item={primaryNav[4]}/>
        <button type="button" onClick={() => setMoreOpen(open => !open)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${moreActive || moreOpen ? 'text-brand-green' : 'text-muted'}`} aria-expanded={moreOpen} aria-label="More navigation">{moreOpen ? <X size={19}/> : <Menu size={19}/>}<span>More</span></button>
      </div>
    </nav>
    {moreOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)}><div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.8rem)] mx-auto max-w-lg px-3" onClick={event => event.stopPropagation()}><div className="rounded-3xl border border-line-strong bg-surface p-3 shadow-2xl"><div className="mb-3 flex items-center justify-between px-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">More</p><p className="mt-1 text-sm font-semibold text-main">Manage your mess</p></div><button type="button" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-main" onClick={() => setMoreOpen(false)} aria-label="Close"><X size={17}/></button></div><div className="grid grid-cols-2 gap-2">{mobileMore.map(({ key, href, icon: Icon }) => { const active = isActive(pathname, href); return <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold ${active ? 'border-line-strong bg-surface-3 text-brand-green' : 'border-line bg-surface-2 text-main'}`}><Icon size={18}/><span>{key === 'nav.activity' ? 'Activity' : t(key as DictKey)}</span></Link> })}</div></div></div></div>}
  </>
}

export function AppNav() { return <DesktopNav/> }
