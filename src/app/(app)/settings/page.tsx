import { redirect } from 'next/navigation'
import { CloseCycleButton, LeaveFlatButton, MessClosedForm, RemoveClosedDayButton } from '@/components/forms'
import { SettingsClient } from '@/components/settings-client'
import { NotificationSettings } from '@/components/notification-settings'
import { VacationForm, VacationList, ManagerVacationForm } from '@/components/vacation-form'
import { SettlementSettings } from '@/components/settlement-settings'
import { GuestMealPolicySettings, GuestMealApprovalList } from '@/components/guest-meal-form'
import { AuditSettings } from '@/components/audit-settings'
import { FestivalModeSettings } from '@/components/festival-mode-settings'
import { ManagerPlanCard } from '@/components/manager-plan-card'
import { InviteCodeManager } from '@/components/invite-code-manager'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)redirect('/login')
  const {data:m}=await s.from('flat_members').select('flat_id,role').eq('user_id',user.id).eq('status','active').maybeSingle(); if(!m)redirect('/onboarding')
  const {data:flat}=await s.from('flats').select('id,name,invite_code,meal_policy,allow_partial_settlement_payments,allow_settlement_overpayments,guest_meal_policy,guest_free_limit,guest_approval_required,audit_visibility').eq('id',m.flat_id).maybeSingle(); if(!flat)return <div className="card">Flat not found.</div>
  const {data:subscription}=await s.from('subscriptions').select('status,current_period_end').eq('user_id',user.id).maybeSingle()
  const {data:inviteCodes}=await s.from('invite_codes').select('id,code,created_at,revoked_at,expires_at,used_at').eq('flat_id',m.flat_id).order('created_at',{ascending:false}).limit(20)
  const {data:members}=await s.from('flat_members').select('user_id,role,status,joined_at,profiles(full_name)').eq('flat_id',m.flat_id).order('joined_at',{ascending:true})
  const {data:cycle}=await s.from('cycles').select('id,start_date,end_date,status,cycle_type,festival_name,festival_start_date,festival_end_date,meals_paused').eq('flat_id',m.flat_id).eq('status','open').order('start_date',{ascending:false}).limit(1).maybeSingle()
  const {data:closedDays}=cycle?await s.from('cycle_closed_days').select('date,reason').eq('cycle_id',cycle.id).order('date',{ascending:true}):{data:[]}
  const {data:vacations}=cycle?await s.from('member_leave').select('id,user_id,start_date,end_date,reason,status,profiles(full_name)').eq('cycle_id',cycle.id).neq('status','cancelled').order('start_date',{ascending:true}):{data:[]}
  const {data:guestApprovals}=cycle&&flat.guest_approval_required?await s.from('guest_meals').select('id,host_user_id,meal_date,meal_type,guest_count,status,profiles(full_name)').eq('cycle_id',cycle.id).eq('status','pending').order('meal_date',{ascending:true}):{data:[]}
  const canManage=m.role==='admin'||m.role==='manager'
  const typedMembers=(members??[]) as unknown as Array<{user_id:string;role:string;status:string;joined_at:string;profiles:{full_name:string}|null}>
  const vrows=(vacations??[]).map((v:any)=>({id:v.id,userId:v.user_id,name:v.profiles?.full_name??'',startDate:v.start_date,endDate:v.end_date,reason:v.reason,status:v.status}))
  const rows=canManage?vrows:vrows.filter((v:any)=>v.userId===user.id)
  const approvalRows=(guestApprovals??[]).map((g:any)=>({id:g.id,name:g.profiles?.full_name??'Member',date:g.meal_date,mealType:g.meal_type,count:Number(g.guest_count),status:g.status}))
  const inviteRows=(inviteCodes??[]).map((x:any)=>({id:x.id,code:x.code,createdAt:x.created_at,revokedAt:x.revoked_at,expiresAt:x.expires_at,usedAt:x.used_at}))
  return <div className="space-y-6"><ManagerPlanCard status={subscription?.status??'inactive'} periodEnd={subscription?.current_period_end??null} hasFlat/><SettingsClient flat={{name:flat.name,inviteCode:flat.invite_code,mealPolicy:flat.meal_policy as 'opt_out'|'opt_in'}} cycle={cycle?{id:cycle.id,startDate:cycle.start_date,endDate:cycle.end_date}:null} members={typedMembers.map(x=>({userId:x.user_id,name:x.profiles?.full_name??'Member',role:x.role,status:x.status,joinedAt:x.joined_at}))} closedDays={closedDays??[]} canManage={canManage} flatId={m.flat_id} leaveButton={<LeaveFlatButton flatId={m.flat_id}/>} closeButton={cycle?<CloseCycleButton cycleId={cycle.id}/>:null} messClosedForm={cycle?<MessClosedForm cycleId={cycle.id}/>:null} removeButtons={(closedDays??[]).map((d:any)=><RemoveClosedDayButton key={d.date} cycleId={cycle!.id} date={d.date}/>)} vacationForm={cycle?<VacationForm cycleId={cycle.id}/>:null} vacationList={<VacationList rows={rows} canManage={canManage}/>} managerVacationForm={canManage&&cycle?<ManagerVacationForm cycleId={cycle.id} members={typedMembers.filter(x=>x.status==='active').map(x=>({userId:x.user_id,name:x.profiles?.full_name??'Member'}))}/>:null}/>
    {canManage&&<InviteCodeManager flatId={m.flat_id} rows={inviteRows}/>} {canManage&&cycle&&<FestivalModeSettings cycle={{id:cycle.id,cycleType:(cycle.cycle_type??'regular') as 'regular'|'short'|'eid'|'festival',festivalName:cycle.festival_name??null,festivalStartDate:cycle.festival_start_date??null,festivalEndDate:cycle.festival_end_date??null,mealsPaused:Boolean(cycle.meals_paused)}}/>}
    <GuestMealPolicySettings flatId={m.flat_id} policy={flat.guest_meal_policy as 'host_pays'|'shared_equal'|'shared_by_meals'|'free_limit'} freeLimit={Number(flat.guest_free_limit??0)} approvalRequired={Boolean(flat.guest_approval_required)} />
    {canManage&&<GuestMealApprovalList rows={approvalRows}/>}<NotificationSettings/>{canManage&&<><SettlementSettings flatId={m.flat_id} initialPartial={Boolean(flat.allow_partial_settlement_payments??true)} initialOverpayment={Boolean(flat.allow_settlement_overpayments??false)}/><AuditSettings flatId={m.flat_id} visibility={flat.audit_visibility==='managers'?'managers':'members'}/></>}
  </div>
}
