import { redirect } from 'next/navigation'
import { ContributionForm } from '@/components/forms'
import { autoAssignCycleDate } from '@/lib/dates'
import { fetchAllRows } from '@/lib/supabase/pagination'
import { createClient } from '@/lib/supabase/server'

type ContributionMember = { userId: string; name: string }
type ContributionRow = {
  id: string
  user_id: string
  amount: number
  note: string | null
  date: string | null
  created_at: string
}

export default async function ContributionsPage() {
  const s = await createClient()
  const {
    data: { user },
  } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await s
    .from('flat_members')
    .select('flat_id,role,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) redirect('/onboarding')

  const { data: cycle, error: cycleError } = await s
    .from('cycles')
    .select('id,start_date,end_date')
    .eq('flat_id', membership.flat_id)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (cycleError) return <div className="card text-sm text-red-600">Could not load the current cycle.</div>
  if (!cycle) return <div className="card">No open cycle.</div>

  const assignedDate = autoAssignCycleDate(cycle.start_date, cycle.end_date)

  let rows: ContributionRow[]
  try {
    rows = await fetchAllRows<ContributionRow>(
      s
        .from('contributions')
        .select('id,user_id,amount,note,date,created_at')
        .eq('cycle_id', cycle.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    )
  } catch (error) {
    console.error('[MealHisab][contributions-pagination]', error)
    return <div className="card text-sm text-red-600">Could not load contributions.</div>
  }

  const { data: flatMembers, error: membersError } = await s
    .from('flat_members')
    .select('user_id,status,profiles(full_name)')
    .eq('flat_id', membership.flat_id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
  if (membersError) return <div className="card text-sm text-red-600">Could not load flat members.</div>

  const members: ContributionMember[] = (flatMembers ?? []).map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    return { userId: member.user_id, name: profile?.full_name ?? 'Member' }
  })
  const canRecordForOthers = membership.role === 'admin' || membership.role === 'manager'
  const formMembers = canRecordForOthers ? members : []
  const typedRows = rows
  const total = typedRows.reduce((sum, row) => sum + Number(row.amount), 0)
  const ownTotal = typedRows
    .filter((row) => row.user_id === user.id)
    .reduce((sum, row) => sum + Number(row.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contributions</h1>
        <p className="text-sm text-slate-500">
          Record deposits for yourself. Managers can record one for any active member. Date is assigned
          automatically ({assignedDate}).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <div className="text-sm text-slate-500">Current cycle total</div>
          <div className="mt-1 text-2xl font-bold">৳{total.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Your contributions</div>
          <div className="mt-1 text-2xl font-bold">৳{ownTotal.toFixed(2)}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <ContributionForm
          flatId={membership.flat_id}
          cycleId={cycle.id}
          userId={user.id}
          members={formMembers}
        />
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Current cycle contributions</h2>
              <p className="text-xs text-slate-500">
                {cycle.start_date} → {cycle.end_date}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {typedRows.length} entries
            </span>
          </div>
          <div className="space-y-3">
            {typedRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between border-b pb-3 text-sm">
                <div>
                  <div className="font-medium">
                    {members.find((member) => member.userId === row.user_id)?.name ??
                      (row.user_id === user.id ? 'You' : 'Member')}
                  </div>
                  <div className="text-slate-500">{row.note || 'No note'}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">৳{Number(row.amount).toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400">
                    {row.date ?? new Date(row.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {typedRows.length === 0 && (
              <p className="text-sm text-slate-500">No contributions recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
