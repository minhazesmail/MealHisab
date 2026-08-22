import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Utensils } from 'lucide-react'
import { LanguageToggle, AppNav, MobileNav } from '@/components/app-shell'
import { SignOutButton } from '@/components/sign-out-button'
import { NotificationBell } from '@/components/notification-bell'
import { SubscriptionGraceBanner } from '@/components/subscription-grace-banner'
import { FlatRecoveryBanner } from '@/components/flat-recovery-banner'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  const userId = String(claimsData.claims.sub)
  const { data: membership } = await supabase
    .from('flat_members')
    .select('flat_id,role,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  let banner: React.ReactNode = null
  if (membership?.flat_id) {
    const { data: flat } = await supabase.from('flats').select('owner_id').eq('id', membership.flat_id).maybeSingle()
    if (flat?.owner_id) {
      const { data: subscription } = await supabase.from('subscriptions').select('status,current_period_end').eq('user_id', flat.owner_id).eq('plan', 'manager_monthly').maybeSingle()
      const end = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
      const now = new Date()
      const ownerIsManager = membership.role === 'admin' || membership.role === 'manager'

      if (ownerIsManager) {
        let state: 'expiring' | 'grace' | 'locked' | 'hidden' = 'hidden'
        let daysRemaining = 0
        if (end && ['active', 'trialing'].includes(subscription?.status ?? '') && end > now) {
          const days = Math.ceil((end.getTime() - now.getTime()) / 86400000)
          if (days <= 7) state = 'expiring'
        } else if (end && ['active', 'trialing', 'past_due'].includes(subscription?.status ?? '') && end <= now && end > new Date(now.getTime() - 7 * 86400000)) {
          state = 'grace'
          daysRemaining = Math.max(1, Math.ceil((end.getTime() + 7 * 86400000 - now.getTime()) / 86400000))
        } else {
          state = 'locked'
        }
        banner = <SubscriptionGraceBanner state={state} daysRemaining={daysRemaining} periodEnd={subscription?.current_period_end ?? null} />
      } else if (!end || end <= now) {
        const graceEnd = end ? new Date(end.getTime() + 7 * 86400000) : new Date(0)
        const recoveryEnd = end ? new Date(end.getTime() + 30 * 86400000) : new Date(0)
        if (now > graceEnd && now <= recoveryEnd) {
          banner = <FlatRecoveryBanner flatId={membership.flat_id} state="read_only_recovery" />
        } else if (now > recoveryEnd) {
          banner = <FlatRecoveryBanner flatId={membership.flat_id} state="support_takeover_eligible" />
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-main">
      {banner}
      <div className="flex min-h-screen">
        <AppNav />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/92 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
              <Link href="/dashboard" className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-surface-2">
                <span className="rounded-xl border border-line-strong bg-surface-3 p-2 text-brand-green shadow-glow"><Utensils size={18} /></span>
                <span><span className="block text-sm font-black tracking-tight text-main">MealHisab</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">BD</span></span>
              </Link>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <LanguageToggle />
                <form action={async () => { 'use server'; const s = await createClient(); await s.auth.signOut(); redirect('/login') }}><SignOutButton /></form>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
