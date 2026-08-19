import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MealCalendar } from '@/components/meal-calendar'

export default async function CalendarPage() {
  const s = await createClient()
  const {
    data: { user },
  } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: m } = await s
    .from('flat_members')
    .select('flat_id,role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!m) redirect('/onboarding')

  const { data: cycle } = await s
    .from('cycles')
    .select('id,start_date,end_date')
    .eq('flat_id', m.flat_id)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!cycle) return <div className="card">No open cycle.</div>

  const [{ data: closedDays }, { data: logs }] = await Promise.all([
    s.from('cycle_closed_days').select('date,reason').eq('cycle_id', cycle.id),
    s
      .from('meal_logs')
      .select('date,meal_type,count')
      .eq('cycle_id', cycle.id)
      .eq('user_id', user.id),
  ])

  const canManage = m.role === 'admin' || m.role === 'manager'

  return (
    <MealCalendar
      cycleId={cycle.id}
      cycleStart={cycle.start_date}
      cycleEnd={cycle.end_date}
      closedDays={closedDays ?? []}
      mealLogs={logs ?? []}
      canManage={canManage}
    />
  )
}
