'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultLocale,
  t,
  type DictKey,
  type Locale,
  formatBdt,
  formatNumber,
} from '@/lib/i18n'

const STORAGE_KEY = 'mealhisab-locale'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: DictKey) => string
  money: (amount: number) => string
  num: (n: number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'bn') return stored
  const nav = window.navigator?.language?.toLowerCase() ?? ''
  if (nav.startsWith('bn')) return 'bn'
  return defaultLocale
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLocaleState(readStoredLocale())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = locale === 'bn' ? 'bn' : 'en'
  }, [locale, ready])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => t(locale, key),
      money: (amount) => formatBdt(amount, locale),
      num: (n) => formatNumber(n, locale),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return {
      locale: defaultLocale as Locale,
      setLocale: () => {},
      t: (key: DictKey) => t(defaultLocale, key),
      money: (amount: number) => formatBdt(amount, defaultLocale),
      num: (n: number) => formatNumber(n, defaultLocale),
    }
  }
  return ctx
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t: tr } = useI18n()
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800 ${className}`}
      role="group"
      aria-label={tr('lang.toggle')}
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-lg px-2.5 py-1.5 transition ${
          locale === 'en'
            ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('bn')}
        className={`rounded-lg px-2.5 py-1.5 transition ${
          locale === 'bn'
            ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        বাং
      </button>
    </div>
  )
}
