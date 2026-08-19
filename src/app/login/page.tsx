'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

function normalizeBdPhone(value: string) {
  const raw = value.replace(/\s+/g, '')
  if (/^01\d{9}$/.test(raw)) return `+88${raw}`
  if (/^8801\d{9}$/.test(raw)) return `+${raw}`
  if (/^\+8801\d{9}$/.test(raw)) return raw
  return raw
}

function LogoMark() {
  return <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)"/><path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round"/><path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92"/><path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94"/><defs><linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#16A34A"/><stop offset="1" stopColor="#0F766E"/></linearGradient></defs></svg>
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function sendCode() {
    setLoading(true); setError('')
    const normalized = normalizeBdPhone(phone)
    if (!/^\+8801\d{9}$/.test(normalized)) { setError('Use a Bangladesh number such as +8801712345678.'); setLoading(false); return }
    const { error: e } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() || 'MealHisab User' } } })
    if (e) setError(e.message); else setSent(true)
    setLoading(false)
  }

  async function verify() {
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.verifyOtp({ phone: normalizeBdPhone(phone), token: code.trim(), type: 'sms' })
    if (e) setError(e.message); else router.push('/dashboard')
    setLoading(false)
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9f8] px-4 py-8">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,_rgba(16,185,129,.14),_transparent_28%),radial-gradient(circle_at_85%_80%,_rgba(13,148,136,.1),_transparent_30%)]" />
    <div className="relative w-full max-w-md">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"><ArrowLeft size={15} /> Back to MealHisab</Link>
      <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-8">
        <div className="mb-7 flex items-center gap-3"><LogoMark /><div><div className="text-base font-black tracking-tight text-slate-950">MealHisab</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bangladesh</div></div></div>
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Secure access</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Log in or create your account</h1><p className="mt-2 text-sm leading-6 text-slate-500">Use your Bangladesh phone number. New users are set up automatically after OTP verification.</p></div>
        {!sent ? <div className="space-y-4"><label className="block text-sm font-semibold text-slate-700">Your name<input className="input mt-1.5" value={name} onChange={e=>setName(e.target.value)} placeholder="Rahim Ahmed" /></label><label className="block text-sm font-semibold text-slate-700">Phone number<input className="input mt-1.5" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+8801712345678" inputMode="tel" autoComplete="tel" /></label><button className="btn-primary w-full" onClick={sendCode} disabled={loading}>{loading ? 'Sending OTP…' : 'Continue with phone'}</button></div>
        : <div className="space-y-4"><p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">We sent a verification code to <strong>{normalizeBdPhone(phone)}</strong>.</p><label className="block text-sm font-semibold text-slate-700">Verification code<input className="input mt-1.5 text-center text-lg tracking-[0.4em]" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" autoFocus /></label><button className="btn-primary w-full" onClick={verify} disabled={loading || code.length < 4}>{loading ? 'Verifying…' : 'Verify & continue'}</button><button className="btn-secondary w-full" onClick={()=>setSent(false)}>Use a different number</button></div>}
        {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        <div className="mt-7 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400"><ShieldCheck size={14} className="text-emerald-600" />Your flat data is protected by account-based access controls.</div>
      </div>
    </div>
  </main>
}
