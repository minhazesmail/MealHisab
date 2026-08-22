'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'
import type { DictKey } from '@/lib/i18n'

export { LanguageProvider, LanguageToggle }

const navKeys: [DictKey, string][] = [
  ['nav.dashboard', '/dashboard'],
  ['nav.meals', '/meals'],
  ['nav.calendar', '/calendar'],
  ['nav.expenses', '/expenses'],
  ['nav.contributions', '/contributions'],
  ['nav.settlements', '/settlements'],
  ['nav.reports', '/reports'],
  ['nav.settings', '/settings'],
]

export function AppNav() {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
      {navKeys.map(([key, href]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition ${
              active
                ? 'border-[#285337] bg-[#10291a] text-[#39ff88] shadow-[0_0_22px_rgba(57,255,136,.08)]'
                : 'border-transparent text-[#8da292] hover:border-[#1b2b20] hover:bg-[#0d1510] hover:text-white'
            }`}
          >
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
