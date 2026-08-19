import type { Locale } from './i18n'
import { formatBdt, formatNumber, toBanglaDigits } from './i18n'

export { formatBdt, formatNumber, toBanglaDigits }

/** Simple date display; Bangla locale uses bn-BD when available. */
export function formatDate(iso: string, locale: Locale = 'en'): string {
  try {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}
