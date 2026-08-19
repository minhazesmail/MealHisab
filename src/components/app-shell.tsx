'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'

export { LanguageProvider, LanguageToggle }

const navKeys = [
  ['nav.dashboard', '/dashboard'],
  ['nav.meals', '/meals'],
  ['nav.expenses', '/expenses'],
  ['nav.contributions', '/contributions'],
  ['nav.settlements', '/settlements'],
  ['nav.reports', '/reports'],
  ['nav.settings', '/settings'],
] as const

export function AppNav() {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
      {navKeys.map(([key, href]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
