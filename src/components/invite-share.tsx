'use client'

import { useCallback, useMemo, useState } from 'react'
import { Check, Copy, Link2, Share2 } from 'lucide-react'
import { useI18n } from '@/components/language-provider'

function appBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://meal-hisab-sigma.vercel.app'
}

export function buildInviteUrl(code: string) {
  const base = appBaseUrl().replace(/\/$/, '')
  return `${base}/join/${encodeURIComponent(code.trim().toUpperCase())}`
}

export function InviteSharePanel({
  inviteCode,
  flatName,
  compact = false,
}: {
  inviteCode: string
  flatName?: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const link = useMemo(() => buildInviteUrl(inviteCode), [inviteCode])

  const flash = useCallback((kind: 'code' | 'link') => {
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1800)
  }, [])

  const copyText = useCallback(
    async (text: string, kind: 'code' | 'link') => {
      try {
        await navigator.clipboard.writeText(text)
        flash(kind)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        flash(kind)
      }
    },
    [flash],
  )

  const share = useCallback(async () => {
    const title = flatName ? `Join ${flatName} on MealHisab` : 'Join my flat on MealHisab'
    const text = flatName
      ? `Join "${flatName}" on MealHisab — meal & expense accounting for our mess.`
      : 'Join my flat on MealHisab — simple meal & expense accounting.'
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: link })
        return
      } catch {
        /* user cancelled or unsupported */
      }
    }
    await copyText(link, 'link')
  }, [flatName, link, copyText])

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-sm font-bold tracking-widest dark:bg-slate-800">
          {inviteCode}
        </code>
        <button
          type="button"
          className="btn-secondary gap-1.5 text-xs"
          onClick={() => copyText(inviteCode, 'code')}
        >
          {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
          {copied === 'code' ? t('common.copied') : t('settings.copyCode')}
        </button>
        <button type="button" className="btn-secondary gap-1.5 text-xs" onClick={() => copyText(link, 'link')}>
          {copied === 'link' ? <Check size={14} /> : <Link2 size={14} />}
          {copied === 'link' ? t('common.copied') : t('settings.copyLink')}
        </button>
        <button type="button" className="btn-primary gap-1.5 text-xs" onClick={share}>
          <Share2 size={14} />
          {t('settings.shareNative')}
        </button>
      </div>
    )
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">{t('settings.shareInvite')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('settings.shareHelp')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-slate-500">{t('settings.inviteCode')}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-lg font-bold tracking-[0.25em] dark:border-slate-700 dark:bg-slate-950">
              {inviteCode}
            </code>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => copyText(inviteCode, 'code')}
              aria-label={t('settings.copyCode')}
            >
              {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">{t('settings.inviteLink')}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="input font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => copyText(link, 'link')}
              aria-label={t('settings.copyLink')}
            >
              {copied === 'link' ? <Check size={16} /> : <Link2 size={16} />}
            </button>
          </div>
        </div>
      </div>
      <button type="button" className="btn-primary w-full gap-2 sm:w-auto" onClick={share}>
        <Share2 size={16} />
        {t('settings.shareNative')}
      </button>
    </section>
  )
}
