import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContributionForm } from '@/components/forms'

export default async function ContributionsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')
  const { data: m } = await s.from('flat_members').select('flat_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
  if (!m) redirect('/onboarding')
  const { data: c, error: cycleError } = await s.from('cycles').select('id,start_date,end_date').eq('flat_id', m.flat_id).eq('status', 'open').order('start_date', { ascending: false }).limit(1).maybeSingle()
  if (cycleError) return <div className="card text-sm text-red-600">Could not load the current cycle.</div>
  if (!c) return <div className="card">No open cycle.</div>
  const { data: rows, error: rowsError } = await s.from('contributions').select('id,user_id,amount,note,created_at').eq('cycle_id', c.id).order('created_at', { ascending: false })
  if (rowsError) return <div className="card text-sm text-red-600">Could not load contributions.</div>
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Contributions</h1><p className="text-sm text-slate-500">Add your own contribution. Managers can record one for another member.</p></div><div className="grid gap-4 lg:grid-cols-[360px_1fr]"><ContributionForm flatId={m.flat_id} cycleId={c.id} userId={user.id}/><section className="card"><h2 className="mb-4 font-semibold">Current cycle contributions</h2><div className="space-y-3">{(rows ?? []).map((r) => <div key={r.id} className="flex items-center justify-between border-b pb-3 text-sm"><div><div className="font-medium">{r.user_id === user.id ? 'You' : 'Member'}</div><div className="text-slate-500">{r.note || '—'}</div></div><div className="font-semibold">৳{Number(r.amount).toFixed(2)}</div></div>)}{(rows ?? []).length === 0 && <p className="text-sm text-slate-500">No contributions recorded yet.</p>}</div></section></div></div>
}
