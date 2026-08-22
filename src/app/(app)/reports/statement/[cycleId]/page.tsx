import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintStatementButton } from '@/components/print-statement-button'

export default async function MonthlyStatementPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await s
    .from('flat_members')
    .select('flat_id,role,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) redirect('/onboarding')
  if (!['admin', 'manager'].includes(membership.role)) return notFound()

  const { data: flat } = await s
    .from('flats')
    .select('id,name')
    .eq('id', membership.flat_id)
    .maybeSingle()
  if (!flat) return notFound()

  const { data: cycle } = await s
    .from('cycles')
    .select('id,start_date,end_date,status,cycle_type,festival_name')
    .eq('id', cycleId)
    .eq('flat_id', flat.id)
    .maybeSingle()
  if (!cycle || cycle.status !== 'closed') return notFound()

  const [{ data: settlements }, { data: expenses }, { data: members }] = await Promise.all([
    s
      .from('settlements')
      .select('user_id,total_meals,meal_cost,total_contribution,balance,opening_balance')
      .eq('cycle_id', cycle.id)
      .order('user_id'),
    s
      .from('expenses')
      .select('amount,category,note,created_at')
      .eq('cycle_id', cycle.id)
      .order('created_at', { ascending: true }),
    s
      .from('cycle_members')
      .select('user_id,profiles(full_name)')
      .eq('cycle_id', cycle.id),
  ])

  const nameMap = new Map<string, string>()
  for (const member of members ?? []) {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    nameMap.set(member.user_id, profile?.full_name ?? 'Member')
  }

  const rows = settlements ?? []
  const totalExpenses = (expenses ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0)
  const totalMeals = rows.reduce((sum, row) => sum + Number(row.total_meals), 0)
  const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0

  const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(`${cycle.start_date}T00:00:00+06:00`))
  const title = cycle.festival_name ? `${cycle.festival_name} Statement` : 'Monthly Statement'

  return (
    <div className="statement-shell bg-white text-slate-900 min-h-screen">
      <div className="statement-toolbar mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">MealHisab</p>
          <p className="text-sm font-semibold">Printable statement</p>
        </div>
        <PrintStatementButton />
      </div>

      <main className="statement-page mx-auto max-w-5xl bg-white px-8 py-8 sm:px-10 print:max-w-none print:px-0 print:py-0">
        <header className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Mess Statement</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{flat.name}</h1>
              <p className="mt-1 text-lg font-semibold">{title} · {monthLabel}</p>
            </div>
            <div className="text-left text-sm sm:text-right">
              <p><span className="font-semibold">Period:</span> {cycle.start_date} → {cycle.end_date}</p>
              <p className="mt-1"><span className="font-semibold">Cycle type:</span> {cycle.cycle_type ?? 'regular'}</p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total expenses</p>
            <p className="mt-1 text-xl font-bold">৳{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total meals</p>
            <p className="mt-1 text-xl font-bold">{totalMeals}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal rate</p>
            <p className="mt-1 text-xl font-bold">৳{mealRate.toFixed(2)}</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Member statement</h2>
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border-b border-slate-300 px-3 py-2">Member</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">Meals</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">Meal cost</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">Contribution</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">Opening</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const balance = Number(row.balance)
                  return (
                    <tr key={row.user_id}>
                      <td className="border-b border-slate-200 px-3 py-2 font-medium">{nameMap.get(row.user_id) ?? 'Member'}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right">{Number(row.total_meals)}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right">৳{Number(row.meal_cost).toFixed(2)}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right">৳{Number(row.total_contribution).toFixed(2)}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right">৳{Number(row.opening_balance).toFixed(2)}</td>
                      <td className={`border-b border-slate-200 px-3 py-2 text-right font-bold ${balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>৳{balance.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Expense summary</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries((expenses ?? []).reduce<Record<string, number>>((acc, expense) => {
              acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount)
              return acc
            }, {})).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-semibold">৳{amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Notes</h2>
          <div className="mt-2 min-h-24 rounded-xl border border-slate-300 p-4 text-sm text-slate-700">
            <p>________________________________________________________________________________</p>
            <p className="mt-5">________________________________________________________________________________</p>
            <p className="mt-5">________________________________________________________________________________</p>
          </div>
        </section>

        <section className="mt-12 grid gap-10 sm:grid-cols-2 break-inside-avoid">
          <div>
            <div className="h-10 border-b border-slate-700" />
            <p className="mt-2 text-sm font-semibold">Manager signature</p>
          </div>
          <div>
            <div className="h-10 border-b border-slate-700" />
            <p className="mt-2 text-sm font-semibold">Member representative signature</p>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500 break-inside-avoid">
          Generated from MealHisab · This statement reflects the closed-cycle settlement snapshot and is intended for mess records.
        </footer>
      </main>
    </div>
  )
}
