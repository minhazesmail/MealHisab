import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Utensils } from 'lucide-react'
import { LanguageToggle, AppNav, MobileNav } from '@/components/app-shell'
import { SignOutButton } from '@/components/sign-out-button'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  return (
    <div className="min-h-screen bg-canvas text-main">
      <div className="flex min-h-screen">
        <AppNav />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/92 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
              <Link
                href="/dashboard"
                className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-surface-2"
              >
                <span className="rounded-xl border border-line-strong bg-surface-3 p-2 text-brand-green shadow-glow">
                  <Utensils size={18} />
                </span>
                <span>
                  <span className="block text-sm font-black tracking-tight text-main">MealHisab</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">BD</span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <form
                  action={async () => {
                    'use server'
                    const s = await createClient()
                    await s.auth.signOut()
                    redirect('/login')
                  }}
                >
                  <SignOutButton />
                </form>
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
