import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { LanguageToggle, AppNav, MobileNav } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignOutButton } from '@/components/sign-out-button'
import { NotificationBell } from '@/components/notification-bell'
import { SubscriptionGraceBanner } from '@/components/subscription-grace-banner'
import { FlatRecoveryBanner } from '@/components/flat-recovery-banner'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  const userId = String(claimsData.claims.sub)
  const { data: membership } = await supabase.from('flat_members').select('flat_id,role,status').eq('user_id', userId).eq('status', 'active').maybeSingle()

  let banner: React.ReactNode = null
  let flatName = ''
  if (membership?.flat_id) {
    const { data: flat } = await supabase.from('flats').select('owner_id,name').eq('id', membership.flat_id).maybeSingle()
    flatName = flat?.name ?? ''
    if (flat?.owner_id) {
      const { data: subscription } = await supabase.from('subscriptions').select('status,current_period_end').eq('user_id', flat.owner_id).eq('plan', 'manager_monthly').maybeSingle()
      const end = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
      const now = new Date()
      const ownerIsManager = membership.role === 'admin' || membership.role === 'manager'
      if (ownerIsManager) {
        let state: 'expiring' | 'grace' | 'locked' | 'hidden' = 'hidden'; let daysRemaining = 0
        if (end && ['active', 'trialing'].includes(subscription?.status ?? '') && end > now) { const days = Math.ceil((end.getTime() - now.getTime()) / 86400000); if (days <= 7) state = 'expiring' }
        else if (end && ['active', 'trialing', 'past_due'].includes(subscription?.status ?? '') && end <= now && end > new Date(now.getTime() - 7 * 86400000)) { state = 'grace'; daysRemaining = Math.max(1, Math.ceil((end.getTime() + 7 * 86400000 - now.getTime()) / 86400000)) }
        else state = 'locked'
        banner = <SubscriptionGraceBanner state={state} daysRemaining={daysRemaining} periodEnd={subscription?.current_period_end ?? null} />
      } else if (!end || end <= now) {
        const graceEnd = end ? new Date(end.getTime() + 7 * 86400000) : new Date(0); const recoveryEnd = end ? new Date(end.getTime() + 30 * 86400000) : new Date(0)
        if (now > graceEnd && now <= recoveryEnd) banner = <FlatRecoveryBanner flatId={membership.flat_id} state="read_only_recovery" />
        else if (now > recoveryEnd) banner = <FlatRecoveryBanner flatId={membership.flat_id} state="support_takeover_eligible" />
      }
    }
  }

  return <div className="min-h-screen bg-canvas text-main">
    {banner}
    <div className="flex min-h-screen">
      <AppNav/>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3.5">
              <Link href="/dashboard" aria-label="MealHisab home" className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong">
                <Sparkles size={17} className="text-brand-green" />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-main">{flatName || 'MealHisab'}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Shared household ledger</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <NotificationBell/>
              <ThemeToggle compact />
              <LanguageToggle/>
              <form action={async () => { 'use server'; const s = await createClient(); await s.auth.signOut(); redirect('/login') }}><SignOutButton/></form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:px-9 lg:pb-10">{children}</main>
      </div>
    </div>
    <MobileNav/>
  </div>
}
