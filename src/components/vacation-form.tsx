'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveVacation, cancelVacation, managerSetVacation, requestVacation } from '@/app/actions'

export type VacationRow = { id:string; userId:string; name:string; startDate:string; endDate:string; reason:string; status:'pending'|'approved'|'cancelled' }

export function VacationForm({ cycleId }: { cycleId:string }) {
  const router=useRouter(); const [pending,start]=useTransition(); const [error,setError]=useState('')
  return <form className="card space-y-3" onSubmit={(e)=>{e.preventDefault();setError('');const f=new FormData(e.currentTarget);start(async()=>{try{await requestVacation({cycleId,startDate:String(f.get('startDate')),endDate:String(f.get('endDate')),reason:String(f.get('reason')||'')});toast.success('Vacation request saved');e.currentTarget.reset();router.refresh()}catch(err){const m=err instanceof Error?err.message:'Could not save vacation';setError(m);toast.error(m)}})}}>
    <div><h2 className="font-semibold">Vacation / Meal freeze</h2><p className="mt-1 text-sm text-muted">Meals default to 0 while you are away. You can still log a meal manually.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><input name="startDate" type="date" className="input" required/><input name="endDate" type="date" className="input" required/></div>
    <input name="reason" className="input" maxLength={200} placeholder="Reason (optional)"/>
    {error&&<p className="text-sm text-danger" role="alert">{error}</p>}<button className="btn-primary" disabled={pending}>{pending?'Saving…':'Set vacation'}</button>
  </form>
}

export function VacationList({ rows, canManage }: { rows:VacationRow[]; canManage:boolean }) {
  const router=useRouter(); const [pendingId,setPendingId]=useState<string|null>(null); const [,start]=useTransition(); const [error,setError]=useState('')
  const act=(kind:'approve'|'cancel',id:string)=>{setPendingId(id);setError('');start(async()=>{try{if(kind==='approve')await approveVacation(id);else await cancelVacation(id);toast.success(kind==='approve'?'Vacation approved':'Vacation cancelled');router.refresh()}catch(err){const m=err instanceof Error?err.message:'Action failed';setError(m);toast.error(m)}finally{setPendingId(null)}})}
  return <section className="card space-y-3"><div><h2 className="font-semibold">Your vacations{canManage?' & requests':''}</h2><p className="mt-1 text-sm text-muted">Approved dates show as Away / ছুটি on your calendar and remove Opt-Out defaults.</p></div>{rows.length===0?<p className="text-sm text-muted">No vacation periods yet.</p>:rows.map(r=><div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium">{r.startDate} → {r.endDate}</div><div className="text-sm text-muted">{r.reason} · {r.status}{r.name?` · ${r.name}`:''}</div></div><div className="flex gap-2">{canManage&&r.status==='pending'&&<button type="button" className="btn-primary text-xs" disabled={pendingId===r.id} onClick={()=>act('approve',r.id)}>Approve</button>}{r.status!=='cancelled'&&<button type="button" className="btn-secondary text-xs" disabled={pendingId===r.id} onClick={()=>act('cancel',r.id)}>Cancel</button>}</div></div>)}{error&&<p className="text-sm text-danger" role="alert">{error}</p>}</section>
}

export function ManagerVacationForm({ cycleId, members }: { cycleId:string; members:Array<{userId:string;name:string}> }) {
  const router=useRouter(); const [pending,start]=useTransition(); const [error,setError]=useState('')
  return <form className="card space-y-3" onSubmit={(e)=>{e.preventDefault();setError('');const f=new FormData(e.currentTarget);start(async()=>{try{await managerSetVacation({cycleId,userId:String(f.get('userId')),startDate:String(f.get('startDate')),endDate:String(f.get('endDate')),reason:String(f.get('reason')||'')});toast.success('Member vacation set');e.currentTarget.reset();router.refresh()}catch(err){const m=err instanceof Error?err.message:'Could not set vacation';setError(m);toast.error(m)}})}}><h2 className="font-semibold">Set vacation for a member</h2><div className="grid gap-3 sm:grid-cols-3"><select name="userId" className="input" required>{members.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}</select><input name="startDate" type="date" className="input" required/><input name="endDate" type="date" className="input" required/></div><input name="reason" className="input" maxLength={200} placeholder="Reason"/>{error&&<p className="text-sm text-danger" role="alert">{error}</p>}<button className="btn-primary" disabled={pending}>{pending?'Saving…':'Set member vacation'}</button></form>
}
