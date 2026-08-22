-- Member Vacation / Meal Freeze Mode
-- Short self-service vacations (<= 7 days) are auto-approved; longer vacations
-- require manager approval. Managers can create approved vacations directly.

create table if not exists public.member_leave (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default 'Vacation' check (length(trim(reason)) between 1 and 200),
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','cancelled')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (cycle_id, user_id, start_date, end_date)
);

create index if not exists idx_member_leave_cycle_user_dates on public.member_leave(cycle_id,user_id,start_date,end_date);
alter table public.member_leave enable row level security;
grant select, insert, update on public.member_leave to authenticated;

drop policy if exists member_leave_select on public.member_leave;
create policy member_leave_select on public.member_leave for select to authenticated using (exists (select 1 from public.cycles c where c.id=cycle_id and private.is_flat_member(c.flat_id)));

drop policy if exists member_leave_insert_self_or_manager on public.member_leave;
create policy member_leave_insert_self_or_manager on public.member_leave for insert to authenticated with check (
  created_by=auth.uid()
  and (user_id=auth.uid() or exists (select 1 from public.cycles c where c.id=cycle_id and private.is_flat_manager(c.flat_id)))
  and exists (select 1 from public.cycles c where c.id=cycle_id and c.status='open' and start_date>=c.start_date and end_date<=c.end_date)
  and (user_id=auth.uid() or exists(select 1 from public.flat_members fm join public.cycles c on c.flat_id=fm.flat_id where c.id=cycle_id and fm.user_id=user_id and fm.status='active'))
);

drop policy if exists member_leave_update_manager on public.member_leave;
create policy member_leave_update_manager on public.member_leave for update to authenticated using (exists(select 1 from public.cycles c where c.id=cycle_id and private.is_flat_manager(c.flat_id))) with check (exists(select 1 from public.cycles c where c.id=cycle_id and private.is_flat_manager(c.flat_id)));

create or replace function public.effective_meal_count(p_cycle_id uuid,p_user_id uuid)
returns integer language sql stable security definer set search_path='' as $$
  with ctx as (
    select c.id cycle_id,c.start_date,c.end_date,f.meal_policy from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
  ), cm as (
    select cycle_id,user_id,active_from,active_to from public.cycle_members where cycle_id=p_cycle_id and user_id=p_user_id
  ), days as (
    select gs.d::date service_date,ctx.meal_policy from ctx join cm on cm.cycle_id=ctx.cycle_id cross join generate_series(ctx.start_date,ctx.end_date,interval '1 day') gs(d)
    where gs.d::date>=cm.active_from and (cm.active_to is null or gs.d::date<=cm.active_to)
      and not exists(select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
  ), daily as (
    select d.service_date,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
    from days d left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=p_user_id and ml.date=d.service_date group by d.service_date,d.meal_policy
  ) select coalesce(sum(meals),0)::integer from daily;
$$;
revoke all on function public.effective_meal_count(uuid,uuid) from public;
grant execute on function public.effective_meal_count(uuid,uuid) to authenticated;

create or replace function public.request_member_leave(p_cycle_id uuid,p_start_date date,p_end_date date,p_reason text default 'Vacation')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_flat uuid; v_days integer; v_status text; v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id=p_cycle_id and status='open'; if v_flat is null then raise exception 'open_cycle_not_found'; end if;
  if not exists(select 1 from public.flat_members where flat_id=v_flat and user_id=v_user and status='active') then raise exception 'not_active_member'; end if;
  if p_end_date<p_start_date then raise exception 'invalid_vacation_dates'; end if;
  if p_start_date<(select start_date from public.cycles where id=p_cycle_id) or p_end_date>(select end_date from public.cycles where id=p_cycle_id) then raise exception 'vacation_outside_cycle'; end if;
  if exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=v_user and l.status in('pending','approved') and daterange(l.start_date,l.end_date,'[]') && daterange(p_start_date,p_end_date,'[]')) then raise exception 'vacation_dates_overlap'; end if;
  v_days:=p_end_date-p_start_date+1; v_status:=case when v_days<=7 then 'approved' else 'pending' end;
  insert into public.member_leave(cycle_id,user_id,start_date,end_date,reason,created_by,approved_by,approved_at,status)
  values(p_cycle_id,v_user,p_start_date,p_end_date,coalesce(nullif(trim(p_reason),''),'Vacation'),v_user,case when v_status='approved' then v_user end,case when v_status='approved' then now() end,v_status) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.manager_set_member_leave(p_cycle_id uuid,p_user_id uuid,p_start_date date,p_end_date date,p_reason text default 'Vacation')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_flat uuid; v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id=p_cycle_id and status='open'; if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if p_end_date<p_start_date then raise exception 'invalid_vacation_dates'; end if;
  if p_start_date<(select start_date from public.cycles where id=p_cycle_id) or p_end_date>(select end_date from public.cycles where id=p_cycle_id) then raise exception 'vacation_outside_cycle'; end if;
  if not exists(select 1 from public.flat_members where flat_id=v_flat and user_id=p_user_id and status='active') then raise exception 'member_not_active'; end if;
  if exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status in('pending','approved') and daterange(l.start_date,l.end_date,'[]') && daterange(p_start_date,p_end_date,'[]')) then raise exception 'vacation_dates_overlap'; end if;
  insert into public.member_leave(cycle_id,user_id,start_date,end_date,reason,created_by,approved_by,approved_at,status)
  values(p_cycle_id,p_user_id,p_start_date,p_end_date,coalesce(nullif(trim(p_reason),''),'Vacation'),v_user,v_user,now(),'approved') returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_member_leave(p_leave_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_flat uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select c.flat_id into v_flat from public.member_leave ml join public.cycles c on c.id=ml.cycle_id where ml.id=p_leave_id and ml.status='pending';
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  update public.member_leave set status='approved',approved_by=v_user,approved_at=now() where id=p_leave_id;
end;
$$;

create or replace function public.cancel_member_leave(p_leave_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); r public.member_leave; v_flat uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select ml.* into r from public.member_leave ml where ml.id=p_leave_id and ml.status in('pending','approved') for update; if r.id is null then raise exception 'vacation_not_found'; end if;
  select flat_id into v_flat from public.cycles where id=r.cycle_id; if r.user_id<>v_user and not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  update public.member_leave set status='cancelled' where id=p_leave_id;
end;
$$;

revoke all on function public.request_member_leave(uuid,date,date,text) from public;
grant execute on function public.request_member_leave(uuid,date,date,text) to authenticated;
revoke all on function public.manager_set_member_leave(uuid,uuid,date,date,text) from public;
grant execute on function public.manager_set_member_leave(uuid,uuid,date,date,text) to authenticated;
revoke all on function public.approve_member_leave(uuid) from public;
grant execute on function public.approve_member_leave(uuid) to authenticated;
revoke all on function public.cancel_member_leave(uuid) from public;
grant execute on function public.cancel_member_leave(uuid) to authenticated;
