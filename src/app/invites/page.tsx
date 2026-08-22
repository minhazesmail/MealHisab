import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteCodeManager } from '@/components/invite-code-manager'

export default async function InvitesPage() {
  const s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)redirect('/login')
  const {data:flat}=await s.from('flats').select('id,name').eq('owner_id',user.id).maybeSingle(); if(!flat)redirect('/onboarding/create-flat')
  const {data:rows}=await s.from('invite_codes').select('id,code,status,max_uses,used_count,created_month,created_at,revoked_at,expires_at,used_at').eq('flat_id',flat.id).order('created_at',{ascending:false}).limit(100)
  const mapped=(rows??[]).map((x:any)=>({id:x.id,code:x.code,status:x.status,maxUses:Number(x.max_uses),usedCount:Number(x.used_count),createdMonth:x.created_month,createdAt:x.created_at,revokedAt:x.revoked_at,expiresAt:x.expires_at,usedAt:x.used_at}))
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">{flat.name}</p><h1 className="mt-2 text-3xl font-black">Invite codes</h1><p className="mt-2 text-sm text-muted">Share a single-use code with a member. Codes expire after 7 days and every generated code counts toward your monthly limit.</p></div><InviteCodeManager flatId={flat.id} rows={mapped}/></div>
}
