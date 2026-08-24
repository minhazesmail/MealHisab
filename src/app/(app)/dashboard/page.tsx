import { redirect } from 'next/navigation'
import { buildDashboardMembers, type DashboardMember } from '@/lib/dashboard'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/pagination'
import { DashboardClient } from '@/components/dashboard-client'

type CycleMemberRow = {
  user_id: string
  opening_balance: number
  profiles: { full_name: string } | null
  active_from: string
  active_to: string | null
}
type MealRow = { user_id: string; date: string; meal_type: 'lunch' | 'dinner' | 'extra'; count: number }
type ContributionRow = { user_id: string; amount: number }
type ExpenseRow = { amount: number; category: 'grocery' | 'cook_salary' | 'gas' | 'other' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership, error: membershipError } = await supabase
    .from('flat_members')
    .select('flat_id,role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (membershipError) return <div className="card text-sm text-red-600">Could not load your membership.</div>
  if (!membership) redirect('/onboarding')

  const { data: flat, error: flatError } = await supabase
    .from('flats')
    .select('id,name,invite_code,meal_policy')
    .eq('id', membership.flat_id)
    .maybeSingle()
  if (flatError) return <div className="card text-sm text-red-600">Could not load the flat.</div>
  if (!flat) return <div className="card">Flat not found.</div>

  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select('id,flat_id,start_date,end_date,status')
    .eq('flat_id', membership.flat_id)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (cycleError) return <div className="card text-sm text-red-600">Could not load the current cycle.</div>
  if (!cycle) return <div className="card">No open cycle.</div>

  try {
    const [members, logs, expenses, contributions] = await Promise.all([
      fetchAllRows<CycleMemberRow>(
        supabase
          .from('cycle_members')
          .select('user_id,opening_balance,active_from,active_to,profiles(full_name)')
          .eq('cycle_id', cycle.id),
      ),
      fetchAllRows<MealRow>(
        supabase.from('meal_logs').select('user_id,date,meal_type,count').eq('cycle_id', cycle.id),
      ),
      fetchAllRows<ExpenseRow>(
        supabase.from('expenses').select('amount,category').eq('cycle_id', cycle.id),
      ),
      fetchAllRows<ContributionRow>(
        supabase.from('contributions').select('user_id,amount').eq('cycle_id', cycle.id),
      ),
    ])

    const typedMembers = members
    const typedLogs = logs
    const typedExpenses = expenses
    const typedContributions = contributions
    const groceryCost = typedExpenses
      .filter((e) => e.category === 'grocery')
      .reduce((s, e) => s + Number(e.amount), 0)
    const totalShared = typedExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const rows: DashboardMember[] = buildDashboardMembers({
      flat: { meal_policy: flat.meal_policy },
      cycle: { start_date: cycle.start_date, end_date: cycle.end_date },
      members: typedMembers,
      logs: typedLogs,
      contributions: typedContributions,
      totalCost: totalShared,
    })
    const totalMeals = rows.reduce((s, r) => s + r.meals, 0)
    const rate = totalMeals ? totalShared / totalMeals : 0

    return (
      <DashboardClient
        flatName={flat.name}
        inviteCode={flat.invite_code}
        mealPolicy={flat.meal_policy}
        cycleStart={cycle.start_date}
        cycleEnd={cycle.end_date}
        totalMeals={totalMeals}
        foodCost={groceryCost}
        rate={rate}
        totalShared={totalShared}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          meals: r.meals,
          mealCost: r.mealCost,
          contribution: r.contribution,
          balance: r.balance,
        }))}
      />
    )
  } catch (error) {
    console.error('[MealHisab][dashboard-pagination]', error)
    return <div className="card text-sm text-red-600">Could not load the complete dashboard data. Please try again.</div>
  }
}
