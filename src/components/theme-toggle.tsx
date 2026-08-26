'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const EVENT = 'mealhisab-theme-change'
type Theme = 'light' | 'dark'

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('mealhisab-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const notify = () => callback()
  media.addEventListener('change', notify)
  window.addEventListener(EVENT, notify)
  window.addEventListener('storage', notify)
  return () => {
    media.removeEventListener('change', notify)
    window.removeEventListener(EVENT, notify)
    window.removeEventListener('storage', notify)
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light')
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        window.localStorage.setItem('mealhisab-theme', next)
        applyTheme(next)
        window.dispatchEvent(new Event(EVENT))
      }}
      className={`inline-flex items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-sm transition hover:border-line-strong hover:bg-surface-2 hover:text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/15 ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  )
}
