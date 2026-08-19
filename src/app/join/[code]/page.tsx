'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { joinFlat } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'

function JoinInner({ code }: { code: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [authed, setAuthed] = useState<boolean | null>(null)
  const normalized = code.trim().toUpperCase()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user)
    })
  }, [])

  async function confirmJoin() {
    if (normalized.length < 6) {
      setError(t('join.invalid'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await joinFlat(normalized)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9f8] px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,_rgba(16,185,129,.14),_transparent_28%),radial-gradient(circle_at_85%_80%,_rgba(13,148,136,.1),_transparent_30%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={15} /> MealHisab
          </Link>
          <LanguageToggle />
        </div>
        <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                MealHisab
              </p>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">{t('join.title')}</h1>
            </div>
          </div>
          <p className="mb-6 text-sm leading-6 text-slate-500">{t('join.subtitle')}</p>

          <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
            <div className="text-xs font-medium text-slate-500">{t('join.codeLabel')}</div>
            <div className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-slate-900">
              {normalized || '—'}
            </div>
          </div>

          {authed === null && (
            <p className="text-center text-sm text-slate-400">{t('common.loading')}</p>
          )}

          {authed === false && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{t('join.needAccount')}</p>
              <Link
                href={`/login?next=${encodeURIComponent(`/join/${normalized}`)}`}
                className="btn-primary flex w-full justify-center"
              >
                {t('join.signIn')}
              </Link>
            </div>
          )}

          {authed === true && (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={busy || normalized.length < 6}
              onClick={confirmJoin}
            >
              {busy ? t('onboarding.joining') : t('join.confirm')}
            </button>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm leading-6 text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  return (
    <LanguageProvider>
      <JoinInner code={code || ''} />
    </LanguageProvider>
  )
}
