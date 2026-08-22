'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { recordGuestMeal, approveGuestMeal, cancelGuestMeal, updateGuestMealPolicy } from '@/app/guest-actions'

type GuestPolicy = 'host_pays' | 'shared_equal' | 'shared_by_meals' | 'free_limit'

export function GuestMealForm({ cycleId, date, approvalRequired }: { cycleId: string; date: string; approvalRequired: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('')
  return <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); setError(''); const form=e.currentTarget; const f=new FormData(form); start(async()=>{try{await recordGuestMeal({cycleId,mealDate:date,mealType:String(f.get('mealType')) as 'lunch'|'dinner',guestCount:Number(f.get('guestCount')),note:String(f.get('note')||'')}); toast.success(approvalRequired?'Guest meal submitted for manager approval':'Guest meal recorded'); form.reset(); router.refresh()}catch(err){const m=err instanceof Error?err.message:'Could not save guest meal';setError(m);toast.error(m)}})}}>
    <div><h2 className="font-semibold">Guests</h2><p className="mt-1 text-xs text-muted">Record guests for today. {approvalRequired ? 'A manager must approve guest meals before they affect the settlement.' : 'Guest meals are included in the cycle accounting immediately.'}</p></div>
    <div className="grid gap-2 sm:grid-cols-3"><select name="mealType" className="input" defaultValue="lunch"><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select><input name="guestCount" type="number" min="1" max="100" step="1" className="input" placeholder="Guest count" required/><button className="btn-primary" disabled={pending}>{pending?'Saving…':'Add guests'}</button></div>
    <input name="note" className="input" maxLength={500} placeholder="Note (optional)" />
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
  </form>
}

export function GuestMealPolicySettings({ flatId, policy, freeLimit, approvalRequired }: { flatId: string; policy: GuestPolicy; freeLimit: number; approvalRequired: boolean }) {
  const router=useRouter(); const [pending,start]=useTransition(); const [error,setError]=useState('')
  return <form className="card space-y-4" onSubmit={(e)=>{e.preventDefault();setError('');const f=new FormData(e.currentTarget);start(async()=>{try{await updateGuestMealPolicy({flatId,policy:String(f.get('policy')) as GuestPolicy,freeLimit:Number(f.get('freeLimit')||0),approvalRequired:f.get('approvalRequired')==='on'});toast.success('Guest meal policy saved');router.refresh()}catch(err){const m=err instanceof Error?err.message:'Could not save guest policy';setError(m);toast.error(m)}})}}>
    <div><h2 className="font-semibold">Guest meal policy</h2><p className="mt-1 text-sm text-muted">Choose who bears the cost of guest meals.</p></div>
    <select name="policy" className="input" defaultValue={policy}>
      <option value="host_pays">Host pays</option><option value="shared_equal">Shared equally by members</option><option value="shared_by_meals">Shared proportional to member meals</option><option value="free_limit">Free guest meals up to a limit</option>
    </select>
    <label className="flex items-center gap-2 text-sm"><input name="approvalRequired" type="checkbox" defaultChecked={approvalRequired}/> Require manager approval for guest meals</label>
    <label className="block text-sm"><span className="text-muted">Free guest meals per member / cycle</span><input name="freeLimit" type="number" min="0" max="1000" className="input mt-1" defaultValue={freeLimit}/></label>
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    <button className="btn-primary" disabled={pending}>{pending?'Saving…':'Save guest policy'}</button>
  </form>
}

export function GuestMealApprovalList({ rows }: { rows: Array<{ id: string; name: string; date: string; mealType: string; count: number; status: string }> }) {
  const router=useRouter(); const [pendingId,setPendingId]=useState<string|null>(null); const [,start]=useTransition()
  if(!rows.length)return null
  return <section className="card space-y-3"><div><h2 className="font-semibold">Guest approvals</h2><p className="mt-1 text-sm text-muted">Pending guest meals must be approved before they affect accounting.</p></div>{rows.map(row=><div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium">{row.name}</div><div className="text-sm text-muted">{row.date} · {row.mealType} · {row.count} guest{row.count===1?'':'s'}</div></div><div className="flex gap-2"><button type="button" className="btn-primary text-xs" disabled={pendingId===row.id} onClick={()=>{setPendingId(row.id);start(async()=>{try{await approveGuestMeal(row.id);toast.success('Guest meal approved');router.refresh()}catch(err){toast.error(err instanceof Error?err.message:'Could not approve guest meal')}finally{setPendingId(null)}})}}>Approve</button><button type="button" className="btn-secondary text-xs" disabled={pendingId===row.id} onClick={()=>{setPendingId(row.id);start(async()=>{try{await cancelGuestMeal(row.id);toast.success('Guest meal cancelled');router.refresh()}catch(err){toast.error(err instanceof Error?err.message:'Could not cancel guest meal')}finally{setPendingId(null)}})}}>Reject</button></div></div>)}</section>
}
