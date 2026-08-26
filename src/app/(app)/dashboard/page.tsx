import { redirect } from 'next/navigation'
import { buildDashboardMembers, type DashboardMember } from '@/lib/dashboard'
import { calculateMealRate } from '@/domain/accounting'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/pagination'
import { DashboardClient } from '@/components/dashboard-client'
import { DashboardState } from '@/components/dashboard-state'

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
  if (membershipError) return <DashboardState kind="membership_error" />
  if (!membership) redirect('/onboarding')

  const canManage = membership.role === 'admin' || membership.role === 'manager'
  const { data: flat, error: flatError } = await supabase
    .from('flats')
    .select('id,name,invite_code,meal_policy')
    .eq('id', membership.flat_id)
    .maybeSingle()
  if (flatError) return <DashboardState kind="flat_error" canManage={canManage} />
  if (!flat) return <DashboardState kind="flat_missing" canManage={canManage} />

  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select('id,flat_id,start_date,end_date,status')
    .eq('flat_id', membership.flat_id)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (cycleError) return <DashboardState kind="cycle_error" canManage={canManage} />
  if (!cycle) return <DashboardState kind="no_cycle" canManage={canManage} />

  let rows: DashboardMember[] = []
  let groceryCost = 0
  let totalShared = 0
  let totalMeals = 0
  let rate = 0

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

    groceryCost = expenses
      .filter((e) => e.category === 'grocery')
      .reduce((sum, expense) => sum + Number(expense.amount), 0)
    totalShared = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
    rows = buildDashboardMembers({
      flat: { meal_policy: flat.meal_policy },
      cycle: { start_date: cycle.start_date, end_date: cycle.end_date },
      members,
      logs,
      contributions,
      totalCost: totalShared,
    })
    totalMeals = rows.reduce((sum, row) => sum + row.meals, 0)
    rate = calculateMealRate(totalShared, totalMeals)
  } catch (error) {
    console.error('[MealHisab][dashboard-pagination]', error)
    return <DashboardState kind="data_error" canManage={canManage} />
  }

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
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        meals: row.meals,
        mealCost: row.mealCost,
        contribution: row.contribution,
        balance: row.balance,
      }))}
    />
  )
}
