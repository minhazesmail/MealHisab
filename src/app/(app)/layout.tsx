import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Utensils } from 'lucide-react'
import { LanguageToggle, AppNav } from '@/components/app-shell'
import { SignOutButton } from '@/components/sign-out-button'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  return (
    <div className="min-h-screen bg-[#050706] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-[#1b2b20] bg-[#050706]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-3.5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#0d1510]"
          >
            <span className="rounded-xl border border-[#285337] bg-[#0d2a18] p-2 text-[#39ff88] shadow-[0_0_28px_rgba(57,255,136,.08)]">
              <Utensils size={18} />
            </span>
            <span>
              <span className="block text-sm font-black tracking-tight text-white">MealHisab</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8275]">BD</span>
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
        <AppNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}
