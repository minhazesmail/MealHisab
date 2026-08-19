import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CloseCycleButton, LeaveFlatButton, MessClosedForm, RemoveClosedDayButton } from '@/components/forms'
import { SettingsClient } from '@/components/settings-client'

type MemberRow = {
  user_id: string
  role: string
  status: string
  joined_at: string
  profiles: { full_name: string } | null
}

type ClosedDayRow = { date: string; reason: string }

export default async function SettingsPage() {
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

  const { data: flat, error: flatError } = await s
    .from('flats')
    .select('id,name,invite_code,meal_policy')
    .eq('id', m.flat_id)
    .maybeSingle()
  if (flatError) return <div className="card text-sm text-red-600">Could not load flat settings.</div>
  if (!flat) return <div className="card">Flat not found.</div>

  const { data: members } = await s
    .from('flat_members')
    .select('user_id,role,status,joined_at,profiles(full_name)')
    .eq('flat_id', m.flat_id)
    .order('joined_at', { ascending: true })
  const { data: cycle } = await s
    .from('cycles')
    .select('id,start_date,end_date,status')
    .eq('flat_id', m.flat_id)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: closedDays } = cycle
    ? await s
        .from('cycle_closed_days')
        .select('date,reason')
        .eq('cycle_id', cycle.id)
        .order('date', { ascending: true })
    : { data: [] as ClosedDayRow[] }
  const typedMembers = (members ?? []) as unknown as MemberRow[]
  const typedClosedDays = (closedDays ?? []) as ClosedDayRow[]
  const canManage = m.role === 'admin' || m.role === 'manager'

  return (
    <SettingsClient
      flat={{
        name: flat.name,
        inviteCode: flat.invite_code,
        mealPolicy: flat.meal_policy as 'opt_out' | 'opt_in',
      }}
      cycle={
        cycle
          ? { id: cycle.id, startDate: cycle.start_date, endDate: cycle.end_date }
          : null
      }
      members={typedMembers.map((x) => ({
        userId: x.user_id,
        name: x.profiles?.full_name ?? 'Member',
        role: x.role,
        status: x.status,
        joinedAt: x.joined_at,
      }))}
      closedDays={typedClosedDays}
      canManage={canManage}
      flatId={m.flat_id}
      leaveButton={<LeaveFlatButton flatId={m.flat_id} />}
      closeButton={cycle ? <CloseCycleButton cycleId={cycle.id} /> : null}
      messClosedForm={cycle ? <MessClosedForm cycleId={cycle.id} /> : null}
      removeButtons={typedClosedDays.map((day) =>
        cycle ? (
          <RemoveClosedDayButton key={day.date} cycleId={cycle.id} date={day.date} />
        ) : null,
      )}
    />
  )
}
