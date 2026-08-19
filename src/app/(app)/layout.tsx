import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Utensils } from 'lucide-react'
import { LanguageProvider, LanguageToggle, AppNav } from '@/components/app-shell'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <span className="rounded-xl bg-green-100 p-2 text-green-700">
                <Utensils size={18} />
              </span>
              MealHisab BD
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
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </LanguageProvider>
  )
}

function SignOutButton() {
  return (
    <button className="btn-secondary" aria-label="Sign out" type="submit">
      <LogOut size={16} />
      <span className="ml-2 hidden sm:inline">Sign out</span>
    </button>
  )
}
