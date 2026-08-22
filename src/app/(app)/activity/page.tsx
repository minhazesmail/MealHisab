import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function eventLabel(action: string, metadata: Record<string, unknown>) {
  const amount = typeof metadata.amount === 'number' ? `৳${Number(metadata.amount).toFixed(2)}` : metadata.amount ? `৳${String(metadata.amount)}` : ''
  const date = metadata.date ? String(metadata.date) : ''
  const mealType = metadata.meal_type ? String(metadata.meal_type) : ''
  const count = metadata.count != null ? String(metadata.count) : ''
  switch (action) {
    case 'meal.logged': return `Logged ${mealType} for ${date}${count ? ` · ${count} meal${count === '1' ? '' : 's'}` : ''}`
    case 'meal.updated': return `Updated ${mealType} for ${date}${count ? ` · ${count} meal${count === '1' ? '' : 's'}` : ''}`
    case 'meal.removed': return `Removed ${mealType} for ${date}`
    case 'expense.added': return `Added expense${metadata.category ? ` · ${String(metadata.category)}` : ''} ${amount}`
    case 'expense.updated': return `Updated expense ${amount}`
    case 'expense.removed': return `Removed expense ${amount}`
    case 'contribution.recorded': return `Recorded contribution ${amount}`
    case 'contribution.updated': return `Updated contribution ${amount}`
    case 'contribution.removed': return `Removed contribution ${amount}`
    case 'settlement.payment_recorded': return `Recorded ${String(metadata.direction ?? 'settlement')} payment ${amount}`
    case 'settlement.payment_updated': return `Updated settlement payment ${amount}`
    case 'settlement.payment_removed': return `Removed settlement payment ${amount}`
    case 'calendar.closed_day_added': return `Marked ${date} as Mess Closed`
    case 'calendar.closed_day_updated': return `Updated Mess Closed day ${date}`
    case 'calendar.closed_day_removed': return `Reopened ${date}`
    case 'guest_meal.added': return `Added ${String(metadata.guest_count ?? 0)} guest meal${Number(metadata.guest_count ?? 0) === 1 ? '' : 's'} for ${date}`
    case 'guest_meal.updated': return `Updated guest meals for ${date}`
    case 'guest_meal.removed': return `Removed guest meals for ${date}`
    case 'vacation.requested': return `Requested vacation ${String(metadata.start_date)} → ${String(metadata.end_date)}`
    case 'vacation.updated': return `Updated vacation ${String(metadata.start_date)} → ${String(metadata.end_date)}`
    case 'vacation.removed': return 'Removed vacation'
    case 'cycle.closed': return 'Closed the cycle'
    default: return action.replaceAll('_', ' ')
  }
}

export default async function ActivityPage() {
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

  const { data: flat } = await s.from('flats').select('name,audit_visibility').eq('id', membership.flat_id).maybeSingle()
  const { data: logs, error } = await s
    .from('audit_logs')
    .select('id,actor_id,action,entity_type,entity_id,metadata,created_at')
    .eq('flat_id', membership.flat_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return <div className="card text-sm text-danger">Could not load the activity log.</div>

  const actorIds = [...new Set((logs ?? []).map((row) => row.actor_id))]
  const { data: profiles } = actorIds.length
    ? await s.from('profiles').select('id,full_name').in('id', actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> }
  const nameMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const canManage = membership.role === 'admin' || membership.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="mt-1 text-sm text-muted">A transparent, append-only history of changes in {flat?.name ?? 'your mess'}.</p>
      </div>
      <section className="card">
        <div className="divide-y divide-line">
          {(logs ?? []).map((row) => {
            const metadata = (row.metadata ?? {}) as Record<string, unknown>
            return (
              <div key={row.id} className="flex gap-3 py-4 first:pt-1 last:pb-1">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green shadow-glow" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {nameMap.get(row.actor_id) ?? 'A member'} <span className="font-normal text-muted">{eventLabel(row.action, metadata)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{new Date(row.created_at).toLocaleString()}</p>
                </div>
              </div>
            )
          })}
          {(logs ?? []).length === 0 && <p className="py-4 text-sm text-muted">No activity recorded yet.</p>}
        </div>
      </section>
      {!canManage && flat?.audit_visibility === 'managers' && <p className="text-xs text-muted">Activity visibility is limited to managers in this mess.</p>}
    </div>
  )
}
