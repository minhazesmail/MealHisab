'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFlat } from '@/app/actions'

export default function CreateFlatPage() {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setError(''); const f=new FormData(e.currentTarget); try { await createFlat({name:String(f.get('name')||''),address:String(f.get('address')||''),monthStartDay:Number(f.get('monthStartDay')||1),mealPolicy:String(f.get('mealPolicy')) as 'opt_in'|'opt_out'}); router.push('/invites') } catch (err) { setError(err instanceof Error?err.message:'Could not create your flat.') } finally { setBusy(false) } }
  return <main className="min-h-screen bg-canvas px-4 py-10 text-main"><div className="mx-auto max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Manager onboarding</p><h1 className="mt-2 text-3xl font-black">Create your flat</h1><p className="mt-2 text-sm text-muted">Your Manager Plan must be active. You can own only one flat.</p><form onSubmit={submit} className="card mt-6 space-y-4"><label className="block text-sm font-semibold">Flat name<input name="name" className="input mt-1.5" required minLength={2} placeholder="Green View Mess"/></label><label className="block text-sm font-semibold">Address <span className="font-normal text-muted">(optional)</span><input name="address" className="input mt-1.5"/></label><label className="block text-sm font-semibold">Month start day<select name="monthStartDay" className="input mt-1.5" defaultValue="1">{[1,5,10,15,20,25].map(d=><option key={d} value={d}>{d}</option>)}</select></label><label className="block text-sm font-semibold">Meal policy<select name="mealPolicy" className="input mt-1.5" defaultValue="opt_out"><option value="opt_out">Opt-out</option><option value="opt_in">Opt-in</option></select></label><button className="btn-primary w-full" disabled={busy}>{busy?'Creating…':'Create flat'}</button>{error&&<p className="text-sm text-danger" role="alert">{error}</p>}</form></div></main>
}
