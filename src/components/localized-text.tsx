'use client'

import { useI18n } from '@/components/language-provider'
import type { DictKey } from '@/lib/i18n'

export function LocalizedText({ en, bn }: { en: string; bn: string }) {
  const { locale } = useI18n()
  return <>{locale === 'bn' ? bn : en}</>
}

export function LocalizedKey({ id }: { id: DictKey }) {
  const { t } = useI18n()
  return <>{t(id)}</>
}
