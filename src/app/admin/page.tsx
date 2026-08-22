import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { reviewPayment, extendSubscription, cancelSubscription, unlockFlat, overrideInviteLimit } from '@/app/admin-actions'

function money(v: unknown) { return `৳${Number(v ?? 0).toFixed(2)}` }
function date(v: unknown) { return v ? new Date(String(v)).toLocaleDateString('en-BD') : '—' }

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'platform_admin') redirect('/dashboard')

  const { data, error } = await s.rpc('admin_dashboard_snapshot')
  if (error) throw new Error('Could not load admin dashboard.')
  const snapshot = data ?? {}
  const pending = Array.isArray(snapshot.pending_payments) ? snapshot.pending_payments : []
  const subscriptions = Array.isArray(snapshot.subscriptions) ? snapshot.subscriptions : []
  const flats = Array.isArray(snapshot.flats) ? snapshot.flats : []
  const usage = Array.isArray(snapshot.invite_usage) ? snapshot.invite_usage : []

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-main sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">MealHisab Admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Platform control</h1>
            <p className="mt-2 text-sm text-muted">Payments, subscriptions, flats and invite usage.</p>
          </div>
          <div className="rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">platform_admin</div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card"><div className="text-xs text-muted">Pending payments</div><div className="mt-1 text-2xl font-bold">{pending.length}</div></div>
          <div className="card"><div className="text-xs text-muted">Approved payments</div><div className="mt-1 text-2xl font-bold">{snapshot.approved_payments ?? 0}</div></div>
          <div className="card"><div className="text-xs text-muted">Rejected payments</div><div className="mt-1 text-2xl font-bold">{snapshot.rejected_payments ?? 0}</div></div>
          <div className="card"><div className="text-xs text-muted">Flats</div><div className="mt-1 text-2xl font-bold">{flats.length}</div></div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-line p-5"><h2 className="font-semibold">Pending payment requests</h2></div>
          <div className="divide-y divide-line">
            {pending.length === 0 ? <p className="p-5 text-sm text-muted">No pending requests.</p> : pending.map((p: any) => (
              <div key={p.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div><div className="font-semibold">{p.payment_method?.toUpperCase()} · {money(p.amount)}</div><div className="mt-1 text-sm text-muted">User: {p.user_id}</div><div className="mt-1 text-sm text-muted">Sender: {p.sender_number || '—'} · Txn: {p.transaction_id || '—'}</div><div className="mt-1 text-xs text-muted">Submitted {date(p.created_at)}</div></div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <form action={reviewPayment}><input type="hidden" name="payment_id" value={p.id}/><input type="hidden" name="decision" value="approved"/><button className="btn-primary">Approve</button></form>
                    <form action={reviewPayment} className="flex gap-2"><input type="hidden" name="payment_id" value={p.id}/><input type="hidden" name="decision" value="rejected"/><input name="reject_reason" className="input min-w-44" placeholder="Reject reason"/><button className="btn-secondary text-danger">Reject</button></form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-line p-5"><h2 className="font-semibold">Manager subscriptions</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Period end</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-line">{subscriptions.map((s: any) => <tr key={s.id}><td className="px-5 py-3 font-mono text-xs">{s.user_id}</td><td className="px-5 py-3">{s.status}</td><td className="px-5 py-3">{date(s.current_period_end)}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2"><form action={extendSubscription}><input type="hidden" name="user_id" value={s.user_id}/><input type="hidden" name="days" value="30"/><button className="btn-secondary text-xs">+30 days</button></form><form action={cancelSubscription}><input type="hidden" name="user_id" value={s.user_id}/><button className="text-xs font-semibold text-danger">Cancel</button></form></div></td></tr>)}</tbody></table></div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-line p-5"><h2 className="font-semibold">Flats</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Flat</th><th className="px-5 py-3">Subscription</th><th className="px-5 py-3">Members</th><th className="px-5 py-3">Invites</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-line">{flats.map((f: any) => <tr key={f.id}><td className="px-5 py-3"><div className="font-semibold">{f.name}</div><div className="text-xs text-muted">{f.owner_id}</div></td><td className="px-5 py-3">{f.subscription_state}</td><td className="px-5 py-3">{f.member_count}</td><td className="px-5 py-3">{f.invite_count}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2"><form action={unlockFlat}><input type="hidden" name="flat_id" value={f.id}/><input type="hidden" name="days" value="7"/><button className="btn-secondary text-xs">Unlock 7d</button></form><form action={overrideInviteLimit}><input type="hidden" name="flat_id" value={f.id}/><input type="hidden" name="days" value="31"/><button className="btn-secondary text-xs">Override invites</button></form></div></td></tr>)}</tbody></table></div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-line p-5"><h2 className="font-semibold">Invite code usage</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Manager</th><th className="px-5 py-3">Month</th><th className="px-5 py-3">Generated</th><th className="px-5 py-3">Active</th></tr></thead><tbody className="divide-y divide-line">{usage.map((u: any, i: number) => <tr key={`${u.created_by}-${u.created_month}-${i}`}><td className="px-5 py-3 font-mono text-xs">{u.created_by}</td><td className="px-5 py-3">{u.created_month}</td><td className="px-5 py-3">{u.generated_count}</td><td className="px-5 py-3">{u.active_count}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  )
}
