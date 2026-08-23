import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettlementPaymentForm } from '@/components/settlement-payment-form'

type PaymentDirection = 'payout' | 'collection'
type MemberRow = { user_id: string; profiles: { full_name: string } | { full_name: string }[] | null }
type PaymentRow = { settlement_id: string; direction: PaymentDirection; amount: number; paid_at: string; note: string | null }
type PaymentTotals = { payout: number; collection: number }

export default async function SettlementsPage() {
  const s = await createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) redirect('/login')
  const { data: membership } = await s.from('flat_members').select('flat_id,role,status').eq('user_id', user.id).in('status',['active','left']).order('status',{ascending:true}).limit(1).maybeSingle()

  const flat = membership?.flat_id
    ? (await s.from('flats').select('allow_partial_settlement_payments,allow_settlement_overpayments').eq('id',membership.flat_id).maybeSingle()).data
    : null

  const { data: settlements, error } = await s.from('settlements').select('id,cycle_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance,guest_meals,guest_charge,cycles(start_date,end_date)').order('created_at',{ascending:false})
  if(error)return <div className="card text-sm text-danger">Could not load settlements.</div>

  const rows=settlements??[]
  const userIds=[...new Set(rows.map((r)=>r.user_id))]

  let members: MemberRow[] = []
  if (membership?.flat_id && userIds.length) {
    const result = await s.from('flat_members').select('user_id,profiles(full_name)').eq('flat_id',membership.flat_id).in('user_id',userIds)
    members = (result.data ?? []) as unknown as MemberRow[]
  }

  const nameMap=new Map(members.map((m)=>{const p=Array.isArray(m.profiles)?m.profiles[0]:m.profiles;return [m.user_id,p?.full_name??'Member'] as const}))
  const ids=rows.map((r)=>r.id)

  let payments: PaymentRow[] = []
  if (ids.length) {
    const result = await s.from('settlement_payments').select('settlement_id,direction,amount,paid_at,note').in('settlement_id',ids).order('paid_at',{ascending:false})
    payments = (result.data ?? []) as unknown as PaymentRow[]
  }

  const paymentMap=new Map<string,PaymentTotals>()
  for(const p of payments){const cur=paymentMap.get(p.settlement_id)??{payout:0,collection:0};cur[p.direction]+=Number(p.amount);paymentMap.set(p.settlement_id,cur)}
  const canManage=membership?.status==='active'&&(membership.role==='admin'||membership.role==='manager')
  const allowPartial=flat?.allow_partial_settlement_payments??true
  const allowOverpayment=flat?.allow_settlement_overpayments??false

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Settlements</h1><p className="text-sm text-muted">Closed-cycle balances, guest charges, partial payments, and carry-forward amounts.</p></div><div className="space-y-4">{rows.map((row)=>{const balance=Number(row.balance);const pt=paymentMap.get(row.id)??{payout:0,collection:0};const direction:PaymentDirection|null=balance>0?'payout':balance<0?'collection':null;const paid=direction?pt[direction]:0;const remaining=direction?Math.max(0,Math.round((Math.abs(balance)-paid)*100)/100):0;const cycle=Array.isArray(row.cycles)?row.cycles[0]:row.cycles;const isOwn=row.user_id===user.id;return <section key={row.id} className="card"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-semibold">{nameMap.get(row.user_id)??(isOwn?'You':'Member')}</div><div className="mt-1 text-sm text-muted">{cycle?.start_date??'—'} → {cycle?.end_date??'—'} · {row.total_meals} member meals{Number(row.guest_meals)>0?` · ${row.guest_meals} guest meals`:''}</div></div><div className={`text-right font-bold ${balance>=0?'text-emerald-400':'text-danger'}`}>{balance>0?`Receivable ৳${balance.toFixed(2)}`:balance<0?`Owes ৳${Math.abs(balance).toFixed(2)}`:'Balanced'}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-5"><div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Meal cost</div><div className="mt-1 font-semibold">৳{Number(row.meal_cost).toFixed(2)}</div></div><div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Guest charge</div><div className="mt-1 font-semibold">৳{Number(row.guest_charge??0).toFixed(2)}</div></div><div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Contributions</div><div className="mt-1 font-semibold">৳{Number(row.total_contribution).toFixed(2)}</div></div><div className="rounded-2xl bg-surface-2 p-3"><div className="text-xs text-muted">Paid</div><div className="mt-1 font-semibold">৳{paid.toFixed(2)}</div></div><div className={`rounded-2xl p-3 ${remaining>0?'bg-amber-500/10':'bg-emerald-500/10'}`}><div className="text-xs text-muted">Remaining</div><div className="mt-1 font-semibold">{remaining>0?`৳${remaining.toFixed(2)}`:'Complete'}</div></div></div>{canManage&&direction&&remaining>0&&<SettlementPaymentForm settlementId={row.id} remaining={remaining} direction={direction} allowPartial={allowPartial} allowOverpayment={allowOverpayment}/>} {direction&&remaining>0&&<div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100"><strong>৳{remaining.toFixed(2)} remaining.</strong>{' '}This amount will carry forward to the next cycle until completed.{!allowPartial&&' Partial payments are disabled, so the full remaining amount is required.'}{allowOverpayment&&direction==='collection'&&' Overpayments are enabled; extra payment becomes credit.'}</div>}</section>})}{rows.length===0&&<div className="card text-sm text-muted">No closed-cycle settlements yet.</div>}</div></div>
}
