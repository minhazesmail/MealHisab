import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManualPaymentReview } from '@/components/manual-payment-review'

export default async function AdminPaymentsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'platform_admin') redirect('/dashboard')

  const { data: rows } = await s.from('payment_requests')
    .select('id,user_id,amount,payment_method,sender_number,transaction_id,note,created_at')
    .eq('status', 'pending')
    .eq('plan', 'manager_monthly')
    .eq('currency', 'BDT')
    .order('created_at', { ascending: true })

  return <div className="space-y-6">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Platform Admin</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Manager Plan payments</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Review manual bKash, Nagad and Rocket payment proofs. Approval activates or extends the Manager Plan for 30 days.</p>
    </div>
    <ManualPaymentReview rows={(rows ?? []).map((r:any) => ({ id:r.id, userId:r.user_id, amount:Number(r.amount), method:r.payment_method, senderNumber:r.sender_number, transactionId:r.transaction_id, note:r.note, createdAt:r.created_at }))}/>
  </div>
}
