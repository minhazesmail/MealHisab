import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettlementPaymentForm } from '@/components/forms'

type PaymentDirection = 'payout' | 'collection'
type MemberRow = {
  user_id: string
  profiles: { full_name: string } | { full_name: string }[] | null
}
type PaymentRow = {
  settlement_id: string
  direction: PaymentDirection
  amount: number
  paid_at: string
  note: string | null
}
type PaymentTotals = { payout: number; collection: number }

export default async function SettlementsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await s.from('flat_members').select('flat_id,role,status').eq('user_id', user.id).in('status', ['active', 'left']).order('status', { ascending: true }).limit(1).maybeSingle()
  const { data: flat } = membership?.flat_id
    ? await s.from('flats').select('allow_partial_settlement_payments,allow_settlement_overpayments').eq('id', membership.flat_id).maybeSingle()
    : { data: null }

  const { data: settlements, error } = await s.from('settlements')
    .select('id,cycle_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance,cycles(start_date,end_date)')
    .order('created_at', { ascending: false })

  if (error) return <div className="card text-sm text-danger">Could not load settlements.</div>

  const rows = settlements ?? []
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const { data: members } = membership?.flat_id
    ? await s.from('flat_members').select('user_id,profiles(full_name)').eq('flat_id', membership.flat_id).in('user_id', userIds)
    : { data: [] as MemberRow[] }

  const memberRows = (members ?? []) as unknown as MemberRow[]
  const nameMap = new Map(memberRows.map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    return [member.user_id, profile?.full_name ?? 'Member'] as const
  }))

  const settlementIds = rows.map((row) => row.id)
  const { data: payments } = settlementIds.length > 0
    ? await s.from('settlement_payments').select('settlement_id,direction,amount,paid_at,note').in('settlement_id', settlementIds).order('paid_at', { ascending: false })
    : { data: [] as PaymentRow[] }

  const paymentMap = new Map<string, PaymentTotals>()
  for (const payment of (payments ?? []) as unknown as PaymentRow[]) {
    const current = paymentMap.get(payment.settlement_id) ?? { payout: 0, collection: 0 }
    current[payment.direction] = Number(current[payment.direction]) + Number(payment.amount)
    paymentMap.set(payment.settlement_id, current)
  }

  const canManage = membership?.status === 'active' && (membership.role === 'admin' || membership.role === 'manager')
  const allowPartial = flat?.allow_partial_settlement_payments ?? true
  const allowOverpayment = flat?.allow_settlement_overpayments ?? false

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Settlements</h1><p className="text-sm text-muted">Closed-cycle balances, partial payments, and carry-forward amounts.</p></div>
    <div className="space-y-4">
      {rows.map((row) => {
        const balance = Number(row.balance)
        const paymentTotals = paymentMap.get(row.id) ?? { payout: 0, collection: 0 }
        const direction: PaymentDirection | null = balance > 0 ? 'payout' : balance < 0 ? 'collection' : null
        const paid = direction ? paymentTotals[direction] : 0
        const remaining = direction ? Math.max(0, Math.round((Math.abs(balance) - paid) * 100) / 100) : 0
        const cycle = Array.isArray(row.cycles) ? row.cycles[0] : row.cycles
        const isOwn = row.user_id === user.id
        return <section key={row.id} className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-semibold">{nameMap.get(row.user_id) ?? (isOwn ? 'You' : 'Member')}</div>
              <div className="mt-1 text-sm text-muted">{cycle?.start_date ?? '—'} → {cycle?.end_date ?? '—'} · {row.total_meals} meals · Meal cost ৳{Number(row.meal_cost).toFixed(2)}</div>
            </div>
            <div className={`text-right font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-danger'}`}>{balance > 0 ? `Receivable ৳${Math.abs(balance).toFixed(2)}` : balance < 0 ? `Owes ৳${Math.abs(balance).toFixed(2)}` : 'Balanced'}</div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Contributions</div><div className="mt-1 font-semibold">৳{Number(row.total_contribution).toFixed(2)}</div></div>
            <div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Opening balance</div><div className="mt-1 font-semibold">৳{Number(row.opening_balance).toFixed(2)}</div></div>
            <div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Paid</div><div className="mt-1 font-semibold">৳{paid.toFixed(2)}</div></div>
            <div className={`rounded-2xl p-3 ${remaining > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}><div className="text-xs text-muted">Remaining</div><div className="mt-1 font-semibold">{remaining > 0 ? `৳${remaining.toFixed(2)}` : 'Complete'}</div></div>
          </div>
          {canManage && direction && remaining > 0 && <SettlementPaymentForm settlementId={row.id} maxAmount={remaining} direction={direction} />}
          {direction && remaining > 0 && <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100"><strong>৳{remaining.toFixed(2)} remaining.</strong>{' '}This amount will carry forward to the next cycle until the settlement is completed.{!allowPartial && ' Partial payments are disabled, so the full remaining amount is required.'}{allowOverpayment && direction === 'collection' && ' Overpayments are enabled; extra payment becomes credit.'}</div>}
          {isOwn && direction && remaining > 0 && !canManage && <p className="mt-3 text-sm text-muted">Please settle the remaining ৳{remaining.toFixed(2)} with the mess manager.</p>}
        </section>
      })}
      {rows.length === 0 && <div className="card text-sm text-muted">No closed-cycle settlements yet.</div>}
    </div>
  </div>
}
