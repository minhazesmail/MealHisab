import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CloseCycleButton, LeaveFlatButton, MessClosedForm, RemoveClosedDayButton } from '@/components/forms'

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
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: m } = await s.from('flat_members').select('flat_id,role').eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!m) redirect('/onboarding')

  const { data: flat, error: flatError } = await s.from('flats').select('id,name,invite_code,meal_policy').eq('id', m.flat_id).maybeSingle()
  if (flatError) return <div className="card text-sm text-red-600">Could not load flat settings.</div>
  if (!flat) return <div className="card">Flat not found.</div>

  const { data: members } = await s.from('flat_members').select('user_id,role,status,joined_at,profiles(full_name)').eq('flat_id', m.flat_id).order('joined_at', { ascending: true })
  const { data: cycle } = await s.from('cycles').select('id,start_date,end_date,status').eq('flat_id', m.flat_id).eq('status', 'open').order('start_date', { ascending: false }).limit(1).maybeSingle()
  const { data: closedDays } = cycle ? await s.from('cycle_closed_days').select('date,reason').eq('cycle_id', cycle.id).order('date', { ascending: true }) : { data: [] as ClosedDayRow[] }
  const typedMembers = (members ?? []) as unknown as MemberRow[]
  const typedClosedDays = (closedDays ?? []) as ClosedDayRow[]
  const canManage = m.role === 'admin' || m.role === 'manager'

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Flat settings</h1><p className="text-sm text-slate-500">Share the invite code, manage holidays, and control the accounting cycle.</p></div>
    <section className="card grid gap-4 sm:grid-cols-2">
      <div><div className="text-sm text-slate-500">Flat</div><div className="mt-1 font-semibold">{flat.name}</div></div>
      <div><div className="text-sm text-slate-500">Invite code</div><div className="mt-1 font-mono text-lg font-bold tracking-widest">{flat.invite_code}</div></div>
      <div><div className="text-sm text-slate-500">Meal policy</div><div className="mt-1 font-semibold">{flat.meal_policy === 'opt_out' ? 'Opt-out' : 'Opt-in'}</div></div>
      <div><div className="text-sm text-slate-500">Cycle</div><div className="mt-1 font-semibold">{cycle?.start_date ?? '—'} → {cycle?.end_date ?? '—'}</div></div>
    </section>

    {canManage && cycle && <section className="card space-y-4">
      <div><h2 className="font-semibold">Mess closed / holidays</h2><p className="text-sm text-slate-500">Closed days suppress implicit opt-out meals for everyone, so Eid, holidays, or full-day shutdowns do not create phantom charges.</p></div>
      <MessClosedForm cycleId={cycle.id} />
      <div className="divide-y rounded-2xl border border-slate-200">
        {typedClosedDays.map((day) => <div key={day.date} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><div><span className="font-medium">{day.date}</span><span className="ml-3 text-slate-500">{day.reason}</span></div><RemoveClosedDayButton cycleId={cycle.id} date={day.date} /></div>)}
        {typedClosedDays.length === 0 && <div className="px-4 py-4 text-sm text-slate-500">No closed days for this cycle.</div>}
      </div>
    </section>}

    <section className="card"><h2 className="mb-4 font-semibold">Members</h2><div className="space-y-3">
      {typedMembers.map((x) => <div key={x.user_id} className="flex items-center justify-between border-b pb-3 text-sm"><div><div className="font-medium">{x.profiles?.full_name ?? 'Member'}</div><div className="text-slate-500">{x.status} · {x.role}</div></div><div className="text-right text-slate-500">Joined {x.joined_at}</div></div>)}
      {typedMembers.length === 0 && <p className="text-sm text-slate-500">No members found.</p>}
    </div></section>

    <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">Leave this flat</h2><p className="text-sm text-slate-500">Your open-cycle billing stops at today and your final closed-cycle balance remains available under Settlements.</p></div>
      <LeaveFlatButton flatId={m.flat_id} />
    </section>

    {canManage && cycle && <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Close current cycle</h2><p className="text-sm text-slate-500">All expense categories are allocated, money is rounded to cents, the rounding residual is reconciled, and the next cycle is opened atomically.</p></div><CloseCycleButton cycleId={cycle.id} /></section>}
  </div>
}
