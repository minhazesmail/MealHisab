'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, ChevronRight, CircleDollarSign, History, LayoutDashboard, Menu, Settings, Utensils, WalletCards, X } from 'lucide-react'
import { useState } from 'react'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'
import type { DictKey } from '@/lib/i18n'

export { LanguageProvider, LanguageToggle }

type NavItem = { key: DictKey | 'nav.activity'; href: string; icon: typeof LayoutDashboard }
const navItems: NavItem[] = [
  ['nav.dashboard', '/dashboard', LayoutDashboard], ['nav.meals', '/meals', Utensils], ['nav.calendar', '/calendar', CalendarDays], ['nav.expenses', '/expenses', CircleDollarSign],
  ['nav.contributions', '/contributions', WalletCards], ['nav.settlements', '/settlements', BarChart3], ['nav.reports', '/reports', BarChart3], ['nav.settings', '/settings', Settings], ['nav.activity', '/activity', History],
].map(([key, href, icon]) => ({ key, href, icon }))
const mobileMore = [navItems[4], navItems[5], navItems[6], navItems[7], navItems[8]]
function isActive(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`) }

function DesktopNav() {
  const { t } = useI18n(); const pathname = usePathname()
  return <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:flex lg:flex-col"><div className="px-5 pb-4 pt-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Workspace</p></div><nav className="flex flex-1 flex-col gap-1 px-3">{navItems.map(({key,href,icon:Icon})=>{const active=isActive(pathname,href);return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${active?'border-line-strong bg-surface-3 text-brand-green shadow-glow':'border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-main'}`}><Icon size={18} strokeWidth={active?2.3:2}/><span className="flex-1">{key==='nav.activity'?'Activity':t(key as DictKey)}</span><ChevronRight size={14} className={`transition ${active?'opacity-100':'opacity-0 group-hover:opacity-60'}`}/></Link>})}</nav><div className="border-t border-line px-5 py-4 text-[11px] text-muted">MealHisab BD</div></aside>
}
function MobileNavItem({item}:{item:NavItem}){const {t}=useI18n();const pathname=usePathname();const active=isActive(pathname,item.href);const Icon=item.icon;return <Link href={item.href} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${active?'text-brand-green':'text-muted'}`}><Icon size={19}/><span>{item.key==='nav.activity'?'Activity':t(item.key as DictKey)}</span></Link>}
export function MobileNav(){const {t}=useI18n();const pathname=usePathname();const [moreOpen,setMoreOpen]=useState(false);const moreActive=mobileMore.some(({href})=>isActive(pathname,href));const meals=navItems[1];const mealsActive=isActive(pathname,meals.href);const MealsIcon=meals.icon;return <><nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5 gap-1"><MobileNavItem item={navItems[0]}/><button type="button" aria-label={t(meals.key as DictKey)} className="relative -mt-6 flex flex-col items-center gap-1 text-[10px] font-bold text-black" onClick={()=>{window.location.href=meals.href}}><span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-canvas bg-brand-green shadow-glow transition ${mealsActive?'scale-105':''}`}><MealsIcon size={24}/></span><span className="text-brand-green">{t(meals.key as DictKey)}</span></button><MobileNavItem item={navItems[3]}/><MobileNavItem item={navItems[2]}/><button type="button" onClick={()=>setMoreOpen(open=>!open)} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${moreActive||moreOpen?'text-brand-green':'text-muted'}`} aria-expanded={moreOpen}>{moreOpen?<X size={19}/>:<Menu size={19}/>}<span>More</span></button></div></nav>{moreOpen&&<div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={()=>setMoreOpen(false)}><div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.8rem)] mx-auto max-w-lg px-3" onClick={event=>event.stopPropagation()}><div className="rounded-2xl border border-line-strong bg-surface p-3 shadow-2xl"><div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">More</div><div className="grid grid-cols-2 gap-2">{mobileMore.map(({key,href,icon:Icon})=>{const active=isActive(pathname,href);return <Link key={href} href={href} onClick={()=>setMoreOpen(false)} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold ${active?'border-line-strong bg-surface-3 text-brand-green':'border-line bg-surface-2 text-main'}`}><Icon size={18}/><span>{key==='nav.activity'?'Activity':t(key as DictKey)}</span></Link>})}</div></div></div></div>}</>}
export function AppNav(){return <DesktopNav/>}
