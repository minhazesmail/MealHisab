'use client'

import { LogOut } from 'lucide-react'
import { useI18n } from '@/components/language-provider'

export function SignOutButton() {
  const { t } = useI18n()
  return (
    <button className="btn-secondary" aria-label={t('nav.signOut')} type="submit">
      <LogOut size={16} />
      <span className="ml-2 hidden sm:inline">{t('nav.signOut')}</span>
    </button>
  )
}
