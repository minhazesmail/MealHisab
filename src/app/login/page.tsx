'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'

function normalizeBdPhone(value: string) {
  const raw = value.replace(/\s+/g, '')
  if (/^01\d{9}$/.test(raw)) return `+88${raw}`
  if (/^8801\d{9}$/.test(raw)) return `+${raw}`
  if (/^\+8801\d{9}$/.test(raw)) return raw
  return raw
}

function LogoMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94" />
      <defs><linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#39FF88" /><stop offset="1" stopColor="#19D96B" /></linearGradient></defs>
    </svg>
  )
}

type Method = 'phone' | 'email'

function friendlyAuthError(message: string, method: Method, t: (k: any) => string) {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('email rate')) return method === 'email' ? t('login.rateEmail') : t('login.ratePhone')
  if (lower.includes('email address not authorized')) return t('login.smtpNeeded')
  return message
}

function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

function LoginForm() {
  const { t } = useI18n()
  const [method, setMethod] = useState<Method>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get('next'))
  const supabase = createClient()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function sendCode() {
    if (cooldown > 0) return
    setLoading(true)
    setError('')
    let authError: { message: string } | null = null
    if (method === 'phone') {
      const normalized = normalizeBdPhone(phone)
      if (!/^\+8801\d{9}$/.test(normalized)) { setError(t('login.phoneInvalid')); setLoading(false); return }
      const { error: e } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() || 'MealHisab User' } } })
      authError = e
    } else {
      const normalized = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError(t('login.emailInvalid')); setLoading(false); return }
      const { error: e } = await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() || 'MealHisab User' } } })
      authError = e
    }
    if (authError) { setError(friendlyAuthError(authError.message, method, t)); setLoading(false); return }
    setSent(true); setCooldown(60); setLoading(false)
  }

  async function verify() {
    setLoading(true)
    setError('')
    const result = method === 'phone'
      ? await supabase.auth.verifyOtp({ phone: normalizeBdPhone(phone), token: code.trim(), type: 'sms' })
      : await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    if (result.error) setError(friendlyAuthError(result.error.message, method, t))
    else router.push(nextPath)
    setLoading(false)
  }

  function changeMethod(next: Method) { setMethod(next); setSent(false); setCode(''); setError(''); setCooldown(0) }
  const destination = method === 'phone' ? normalizeBdPhone(phone) : email.trim().toLowerCase()
  const methodLabel = method === 'phone' ? t('login.phone') : t('login.email')
  const otherLabel = method === 'phone' ? t('login.email') : t('login.phone')

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-8 text-main">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,_rgba(57,255,136,.13),_transparent_26%),radial-gradient(circle_at_84%_82%,_rgba(25,217,107,.09),_transparent_28%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-main"><ArrowLeft size={15} /> {t('login.back')}</Link>
          <LanguageToggle />
        </div>
        <div className="overflow-hidden rounded-[30px] border border-line bg-surface/95 p-7 shadow-soft backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex items-center gap-3"><LogoMark /><div><div className="text-base font-black tracking-tight text-main">MealHisab</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Bangladesh</div></div></div>
          <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">{t('login.secure')}</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-main">{t('login.title')}</h1><p className="mt-2 text-sm leading-6 text-muted">{t('login.sub')}</p></div>

          {!sent ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1.5" role="tablist">
                <button type="button" role="tab" aria-selected={method === 'phone'} onClick={() => changeMethod('phone')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${method === 'phone' ? 'bg-surface-3 text-main shadow-soft' : 'text-muted hover:text-main'}`}><Phone size={15} /> {t('login.phone')}</button>
                <button type="button" role="tab" aria-selected={method === 'email'} onClick={() => changeMethod('email')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${method === 'email' ? 'bg-surface-3 text-main shadow-soft' : 'text-muted hover:text-main'}`}><Mail size={15} /> {t('login.email')}</button>
              </div>
              <label className="block text-sm font-semibold text-main">{t('login.name')}<input className="input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahim Ahmed" autoComplete="name" /></label>
              {method === 'phone' ? <label className="block text-sm font-semibold text-main">{t('login.phoneNum')}<input className="input mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801712345678" inputMode="tel" autoComplete="tel" /></label> : <label className="block text-sm font-semibold text-main">{t('login.emailAddr')}<input className="input mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" inputMode="email" autoComplete="email" /></label>}
              <button className="btn-primary w-full" onClick={sendCode} disabled={loading || cooldown > 0}>{loading ? t('login.sending') : cooldown > 0 ? t('login.tryAgain').replace('{s}', String(cooldown)) : t('login.continueWith').replace('{method}', methodLabel)}</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-brand-green">{t('login.sent')} <strong>{destination}</strong>.</p>
              <label className="block text-sm font-semibold text-main">{t('login.code')}<input className="input mt-1.5 text-center text-lg tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" autoFocus /></label>
              <button className="btn-primary w-full" onClick={verify} disabled={loading || code.length < 4}>{loading ? t('login.verifying') : t('login.verify')}</button>
              <div className="grid grid-cols-2 gap-2"><button className="btn-secondary w-full" onClick={() => setSent(false)}>{t('login.changeContact')}</button><button className="btn-secondary w-full" onClick={() => changeMethod(method === 'phone' ? 'email' : 'phone')}>{t('login.useOther').replace('{method}', otherLabel)}</button></div>
              <button type="button" className="w-full text-center text-sm font-semibold text-muted hover:text-main disabled:cursor-not-allowed disabled:opacity-50" onClick={sendCode} disabled={loading || cooldown > 0}>{cooldown > 0 ? t('login.resendIn').replace('{s}', String(cooldown)) : t('login.resend')}</button>
            </div>
          )}

          {error && <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger" role="alert">{error}</p>}
          <div className="mt-7 flex items-center gap-2 border-t border-line pt-5 text-xs text-muted"><ShieldCheck size={14} className="text-brand-green" />{t('login.protected')}</div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">…</main>}><LoginForm /></Suspense>
}
