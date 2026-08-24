-- Harden externally reachable RPCs.
-- Privileged calculations stay in private SECURITY DEFINER helpers, while
-- client-facing functions enforce tenant authorization and anonymous callers
-- cannot execute authenticated application procedures.

create or replace function private.guest_meal_count_internal(p_cycle_id uuid,p_user_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(guest_count),0)::integer
  from public.guest_meals
  where cycle_id=p_cycle_id
    and status='approved'
    and (p_user_id is null or host_user_id=p_user_id)
$$;

create or replace function public.guest_meal_count(p_cycle_id uuid, p_user_id uuid default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_flat uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.flat_id into v_flat from public.cycles c where c.id=p_cycle_id;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if p_user_id is not null and p_user_id<>v_uid and not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if p_user_id is null and not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  return private.guest_meal_count_internal(p_cycle_id,p_user_id);
end;
$$;

revoke all on function public.guest_meal_count(uuid,uuid) from public, anon, authenticated;
grant execute on function public.guest_meal_count(uuid,uuid) to authenticated;
revoke all on function private.guest_meal_count_internal(uuid,uuid) from public, anon, authenticated;
grant execute on function private.guest_meal_count_internal(uuid,uuid) to service_role;

create or replace function private.effective_meal_count_internal(p_cycle_id uuid,p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
with ctx as(
  select c.id,c.start_date,c.end_date,f.meal_policy
  from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
),cm as(
  select cycle_id,user_id,active_from,active_to
  from public.cycle_members where cycle_id=p_cycle_id and user_id=p_user_id
),days as(
  select gs.d::date service_date,ctx.meal_policy
  from ctx join cm on cm.cycle_id=ctx.id
  cross join generate_series(ctx.start_date,ctx.end_date,interval '1 day') gs(d)
  where gs.d::date>=cm.active_from
    and (cm.active_to is null or gs.d::date<=cm.active_to)
    and not exists(select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
),daily as(
  select d.service_date,
    coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
    +coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
    +coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
  from days d
  left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=p_user_id and ml.date=d.service_date
  group by d.service_date,d.meal_policy
)
select (coalesce(sum(meals),0)+private.guest_meal_count_internal(p_cycle_id,p_user_id))::integer from daily
$$;

create or replace function public.effective_meal_count(p_cycle_id uuid,p_user_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_flat uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.flat_id into v_flat from public.cycles c where c.id=p_cycle_id;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if p_user_id<>v_uid and not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  return private.effective_meal_count_internal(p_cycle_id,p_user_id);
end;
$$;

revoke all on function public.effective_meal_count(uuid,uuid) from public, anon, authenticated;
grant execute on function public.effective_meal_count(uuid,uuid) to authenticated;
revoke all on function private.effective_meal_count_internal(uuid,uuid) from public, anon, authenticated;
grant execute on function private.effective_meal_count_internal(uuid,uuid) to service_role;

revoke all on function public.generate_meal_reminders() from public, anon, authenticated;
grant execute on function public.generate_meal_reminders() to service_role;

revoke all on function public.approve_guest_meal(uuid) from public, anon;
grant execute on function public.approve_guest_meal(uuid) to authenticated;
revoke all on function public.approve_member_leave(uuid) from public, anon;
grant execute on function public.approve_member_leave(uuid) to authenticated;
revoke all on function public.cancel_guest_meal(uuid) from public, anon;
grant execute on function public.cancel_guest_meal(uuid) to authenticated;
revoke all on function public.cancel_member_leave(uuid) from public, anon;
grant execute on function public.cancel_member_leave(uuid) to authenticated;
revoke all on function public.ensure_notification_preferences() from public, anon;
grant execute on function public.ensure_notification_preferences() to authenticated;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
revoke all on function public.record_guest_meal(uuid,date,text,integer,text) from public, anon;
grant execute on function public.record_guest_meal(uuid,date,text,integer,text) to authenticated;
revoke all on function public.update_guest_meal_policy(uuid,text,integer,boolean) from public, anon;
grant execute on function public.update_guest_meal_policy(uuid,text,integer,boolean) to authenticated;
revoke all on function public.update_notification_preferences(boolean,text,time,boolean,time,time,text) from public, anon;
grant execute on function public.update_notification_preferences(boolean,text,time,boolean,time,time,text) to authenticated;
