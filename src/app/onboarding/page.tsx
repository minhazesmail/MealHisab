'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createFlat, joinFlat } from '@/app/actions'
import { createManagerCheckoutSession } from '@/app/billing-actions'
import { createClient } from '@/lib/supabase/client'
import { LanguageProvider, LanguageToggle, useI18n } from '@/components/language-provider'
import { InviteSharePanel } from '@/components/invite-share'

function OnboardingInner() {
  const { t } = useI18n()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(e.currentTarget)
    try {
      if (mode === 'create') {
        const name = String(f.get('name') || '')
        await createFlat({
          name,
          address: String(f.get('address') || ''),
          monthStartDay: Number(f.get('monthStartDay') || 1),
          mealPolicy: String(f.get('mealPolicy')) as 'opt_in' | 'opt_out',
        })
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: m } = await supabase.from('flat_members').select('flat_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
          if (m) {
            const { data: flat } = await supabase.from('flats').select('invite_code,name').eq('id', m.flat_id).maybeSingle()
            if (flat?.invite_code) {
              setCreatedCode(flat.invite_code)
              setCreatedName(flat.name || name)
              setBusy(false)
              return
            }
          }
        }
        router.push('/dashboard')
        router.refresh()
      } else {
        await joinFlat(String(f.get('inviteCode') || ''))
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (createdCode) {
    return (
      <div className="mx-auto mt-10 max-w-xl space-y-5">
        <div className="flex justify-end"><LanguageToggle /></div>
        <div className="card space-y-4">
          <div><h1 className="text-xl font-bold text-main">{createdName || t('onboarding.title')}</h1><p className="mt-2 text-sm text-muted">{t('onboarding.afterCreate')}</p></div>
          <InviteSharePanel inviteCode={createdCode} flatName={createdName} />
          <Link href="/dashboard" className="btn-primary flex w-full justify-center">{t('onboarding.goDashboard')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-10 max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-main">{t('onboarding.title')}</h1><p className="mt-1 text-sm text-muted">{t('onboarding.subtitle')}</p></div><LanguageToggle /></div>

      <div className="card border-brand-green/20 bg-surface-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Flat Manager</p><p className="mt-1 font-semibold">৳99/month</p><p className="mt-1 text-xs text-muted">Subscribe first to create and operate your own flat. Members join free with an invite code.</p></div>
          <form action={createManagerCheckoutSession}><button type="submit" className="btn-secondary whitespace-nowrap">Subscribe Manager Plan</button></form>
        </div>
      </div>

      <div className="card">
        <div className="mb-5 flex gap-2"><button type="button" className={mode==='create'?'btn-primary':'btn-secondary'} onClick={()=>setMode('create')}>Create flat</button><button type="button" className={mode==='join'?'btn-primary':'btn-secondary'} onClick={()=>setMode('join')}>Join flat</button></div>
        {mode === 'create' ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-3 text-xs text-muted">Creating a flat requires an active ৳99/month Manager Plan. One manager can own only one flat.</p>
            <label className="block text-sm font-semibold text-main">{t('onboarding.name')}<input name="name" className="input mt-1.5" placeholder={t('onboarding.namePlaceholder')} required minLength={2}/></label>
            <label className="block text-sm font-semibold text-main">{t('onboarding.address')} <span className="font-normal text-muted">({t('common.optional')})</span><input name="address" className="input mt-1.5" placeholder={t('onboarding.addressPlaceholder')}/></label>
            <label className="block text-sm font-semibold text-main">{t('onboarding.cycleStart')}<select name="monthStartDay" className="input mt-1.5" defaultValue="1">{[1,5,10,15,20,25].map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            <label className="block text-sm font-semibold text-main">{t('onboarding.mealPolicy')}<select name="mealPolicy" className="input mt-1.5" defaultValue="opt_out"><option value="opt_out">{t('onboarding.optOut')}</option><option value="opt_in">{t('onboarding.optIn')}</option></select></label>
            <button className="btn-primary w-full" disabled={busy}>{busy?t('onboarding.creating'):'Create my flat'}</button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">Joining a flat is free. You only need a valid, active invite code from its manager.</div>
            <label className="block text-sm font-semibold text-main">{t('onboarding.inviteCode')}<input name="inviteCode" className="input mt-1.5 text-center uppercase tracking-[0.3em]" placeholder="ABCD1234" maxLength={16} required/></label>
            <button className="btn-primary w-full" disabled={busy}>{busy?t('onboarding.joining'):'Join flat free'}</button>
          </form>
        )}
        {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
      </div>
    </div>
  )
}

export default function OnboardingPage() { return <LanguageProvider><OnboardingInner /></LanguageProvider> }
