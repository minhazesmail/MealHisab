-- Guest meal policy and approval workflow.

alter table public.flats
  add column if not exists guest_meal_policy text not null default 'host_pays'
    check (guest_meal_policy in ('host_pays','shared_equal','shared_by_meals','free_limit')),
  add column if not exists guest_free_limit integer not null default 0
    check (guest_free_limit between 0 and 1000),
  add column if not exists guest_approval_required boolean not null default false;

create table if not exists public.guest_meals (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('lunch','dinner')),
  guest_count integer not null check (guest_count between 1 and 100),
  note text,
  status text not null default 'approved' check (status in ('pending','approved','cancelled')),
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, host_user_id, meal_date, meal_type)
);

create index if not exists idx_guest_meals_cycle_date on public.guest_meals(cycle_id, meal_date);
create index if not exists idx_guest_meals_cycle_host on public.guest_meals(cycle_id, host_user_id, status);

alter table public.guest_meals enable row level security;
grant select, insert, update on public.guest_meals to authenticated;

drop policy if exists guest_meals_select_member on public.guest_meals;
create policy guest_meals_select_member on public.guest_meals for select to authenticated using (
  private.is_flat_member(flat_id)
);

drop policy if exists guest_meals_insert_self_or_manager on public.guest_meals;
create policy guest_meals_insert_self_or_manager on public.guest_meals for insert to authenticated with check (
  created_by = auth.uid()
  and (
    host_user_id = auth.uid()
    or private.is_flat_manager(flat_id)
  )
  and exists (
    select 1 from public.cycles c
     where c.id = cycle_id and c.flat_id = guest_meals.flat_id and c.status = 'open'
  )
);

drop policy if exists guest_meals_update_manager on public.guest_meals;
create policy guest_meals_update_manager on public.guest_meals for update to authenticated using (
  private.is_flat_manager(flat_id)
) with check (
  private.is_flat_manager(flat_id)
);

create or replace function public.record_guest_meal(
  p_cycle_id uuid,
  p_meal_date date,
  p_meal_type text,
  p_guest_count integer,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_status text;
  v_id uuid;
  v_policy text;
  v_approval boolean;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_guest_count < 1 or p_guest_count > 100 then raise exception 'invalid_guest_count'; end if;
  if p_meal_type not in ('lunch','dinner') then raise exception 'invalid_guest_meal_type'; end if;

  select c.flat_id into v_flat from public.cycles c
   where c.id = p_cycle_id and c.status = 'open';
  if v_flat is null then raise exception 'open_cycle_not_found'; end if;
  if p_meal_date < (select start_date from public.cycles where id=p_cycle_id)
     or p_meal_date > (select end_date from public.cycles where id=p_cycle_id) then
    raise exception 'guest_meal_outside_cycle';
  end if;
  if not exists (
    select 1 from public.flat_members fm
     where fm.flat_id=v_flat and fm.user_id=v_user and fm.status='active'
  ) then
    raise exception 'not_active_member';
  end if;
  if exists (select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=p_meal_date) then
    raise exception 'guest_meal_on_closed_day';
  end if;

  select f.guest_meal_policy, f.guest_approval_required into v_policy, v_approval
    from public.flats f where f.id=v_flat;
  v_status := case when v_approval then 'pending' else 'approved' end;

  insert into public.guest_meals(
    flat_id,cycle_id,host_user_id,meal_date,meal_type,guest_count,note,status,created_by,approved_by,approved_at
  ) values (
    v_flat,p_cycle_id,v_user,p_meal_date,p_meal_type,p_guest_count,
    nullif(trim(p_note),''),v_status,v_user,
    case when v_status='approved' then v_user else null end,
    case when v_status='approved' then now() else null end
  )
  on conflict (cycle_id,host_user_id,meal_date,meal_type) do update set
    guest_count=excluded.guest_count,
    note=excluded.note,
    status=case when v_approval then 'pending' else 'approved' end,
    approved_by=case when v_approval then null else v_user end,
    approved_at=case when v_approval then null else now() end,
    updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_guest_meal(p_guest_meal_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_flat uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.guest_meals where id=p_guest_meal_id and status='pending';
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  update public.guest_meals set status='approved',approved_by=v_user,approved_at=now(),updated_at=now() where id=p_guest_meal_id;
end;
$$;

create or replace function public.cancel_guest_meal(p_guest_meal_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); r public.guest_meals;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into r from public.guest_meals where id=p_guest_meal_id and status in ('pending','approved') for update;
  if r.id is null then raise exception 'guest_meal_not_found'; end if;
  if r.host_user_id <> v_user and not private.is_flat_manager(r.flat_id) then raise exception 'forbidden'; end if;
  update public.guest_meals set status='cancelled',updated_at=now() where id=p_guest_meal_id;
end;
$$;

create or replace function public.update_guest_meal_policy(
  p_flat_id uuid,
  p_policy text,
  p_free_limit integer,
  p_approval_required boolean
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  if p_policy not in ('host_pays','shared_equal','shared_by_meals','free_limit') then raise exception 'invalid_guest_meal_policy'; end if;
  if p_free_limit < 0 or p_free_limit > 1000 then raise exception 'invalid_guest_free_limit'; end if;
  if p_policy <> 'free_limit' and p_free_limit <> 0 then raise exception 'free_limit_only_allowed_for_free_policy'; end if;
  update public.flats
     set guest_meal_policy=p_policy,
         guest_free_limit=case when p_policy='free_limit' then p_free_limit else 0 end,
         guest_approval_required=p_approval_required,
         updated_at=now()
   where id=p_flat_id;
end;
$$;

create or replace function public.guest_meal_count(p_cycle_id uuid, p_user_id uuid default null)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(gm.guest_count),0)::integer
    from public.guest_meals gm
   where gm.cycle_id=p_cycle_id
     and gm.status='approved'
     and (p_user_id is null or gm.host_user_id=p_user_id);
$$;

create or replace function public.effective_meal_count(p_cycle_id uuid, p_user_id uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  with ctx as (
    select c.id cycle_id, c.start_date, c.end_date, f.meal_policy, f.guest_meal_policy, f.guest_free_limit
      from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
  ),
  cm as (
    select cycle_id,user_id,active_from,active_to from public.cycle_members where cycle_id=p_cycle_id and user_id=p_user_id
  ),
  days as (
    select gs.d::date service_date, ctx.meal_policy, ctx.guest_meal_policy, ctx.guest_free_limit
      from ctx join cm on cm.cycle_id=ctx.cycle_id
      cross join generate_series(ctx.start_date,ctx.end_date,interval '1 day') gs(d)
     where gs.d::date>=cm.active_from and (cm.active_to is null or gs.d::date<=cm.active_to)
       and not exists(select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
  ),
  daily as (
    select d.service_date,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
      from days d left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=p_user_id and ml.date=d.service_date
     group by d.service_date,d.meal_policy
  )
  select (coalesce(sum(meals),0)
    + case when (select guest_meal_policy from ctx) in ('host_pays','free_limit')
      then least(
        public.guest_meal_count(p_cycle_id,p_user_id),
        case when (select guest_meal_policy from ctx)='free_limit' then 1000000 else public.guest_meal_count(p_cycle_id,p_user_id) end
      )
      else 0 end)::integer
    from daily;
$$;

create or replace function public.guest_charge_for_user(p_cycle_id uuid, p_user_id uuid)
returns numeric(14,2)
language sql stable security definer set search_path = '' as $$
  with flat_policy as (
    select f.id,f.guest_meal_policy,f.guest_free_limit,
           (select coalesce(sum(e.amount),0) from public.expenses e where e.cycle_id=p_cycle_id) total_cost,
           (select coalesce(sum(public.effective_meal_count(p_cycle_id,cm.user_id)),0) from public.cycle_members cm where cm.cycle_id=p_cycle_id) member_meals
      from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
  ),
  g as (
    select coalesce(sum(gm.guest_count),0)::numeric guest_count
      from public.guest_meals gm where gm.cycle_id=p_cycle_id and gm.host_user_id=p_user_id and gm.status='approved'
  ),
  allg as (
    select coalesce(sum(gm.guest_count),0)::numeric guest_count
      from public.guest_meals gm where gm.cycle_id=p_cycle_id and gm.status='approved'
  ),
  members as (
    select count(*)::numeric member_count from public.cycle_members cm where cm.cycle_id=p_cycle_id
  )
  select round(
    case
      when fp.member_meals=0 then 0
      when fp.guest_meal_policy='host_pays' then g.guest_count * (fp.total_cost / fp.member_meals)
      when fp.guest_meal_policy='shared_equal' then (allg.guest_count * (fp.total_cost / fp.member_meals)) / nullif(members.member_count,0)
      when fp.guest_meal_policy='shared_by_meals' then 0
      when fp.guest_meal_policy='free_limit' then greatest(g.guest_count - fp.guest_free_limit,0) * (fp.total_cost / nullif(fp.member_meals,0))
      else 0
    end,2
  )::numeric(14,2)
  from flat_policy fp,g,allg,members;
$$;

revoke all on function public.record_guest_meal(uuid,date,text,integer,text) from public;
grant execute on function public.record_guest_meal(uuid,date,text,integer,text) to authenticated;
revoke all on function public.approve_guest_meal(uuid) from public;
grant execute on function public.approve_guest_meal(uuid) to authenticated;
revoke all on function public.cancel_guest_meal(uuid) from public;
grant execute on function public.cancel_guest_meal(uuid) to authenticated;
revoke all on function public.update_guest_meal_policy(uuid,text,integer,boolean) from public;
grant execute on function public.update_guest_meal_policy(uuid,text,integer,boolean) to authenticated;
grant execute on function public.guest_meal_count(uuid,uuid) to authenticated;
grant execute on function public.guest_charge_for_user(uuid,uuid) to authenticated;

-- Guest-aware cycle close. Member meal totals remain visible; guest charges are stored separately.
create or replace function private.close_cycle_internal(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid:=auth.uid(); v_flat uuid; v_status text; v_start date; v_end date; v_food numeric(14,2); v_rate numeric(14,2); v_total_meals bigint; v_guest_meals bigint; v_next uuid; v_len integer;
  v_policy text; v_free_limit integer; v_member_count bigint; v_residual numeric(14,2); r record;
  v_meals integer; v_contrib numeric(12,2); v_balance numeric(14,2); v_opening numeric(14,2); v_guest_charge numeric(14,2);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.flat_id,c.status,c.start_date,c.end_date,c.end_date-c.start_date+1 into v_flat,v_status,v_start,v_end,v_len from public.cycles c where c.id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if v_status <> 'open' then
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1;
    return v_next;
  end if;
  select f.guest_meal_policy,f.guest_free_limit,coalesce(sum(e.amount),0)::numeric(14,2) into v_policy,v_free_limit,v_food from public.flats f left join public.expenses e on e.cycle_id=p_cycle_id where f.id=v_flat group by f.id;

  create temporary table if not exists tmp_guest_settlement(user_id uuid primary key,meals integer not null,contribution numeric(12,2) not null,opening_balance numeric(14,2) not null,meal_cost numeric(14,2) not null default 0,guest_charge numeric(14,2) not null default 0) on commit drop;
  truncate tmp_guest_settlement;

  insert into tmp_guest_settlement(user_id,meals,contribution,opening_balance)
  select cm.user_id,public.effective_meal_count(p_cycle_id,cm.user_id)
       - case when v_policy in ('host_pays','free_limit') then public.guest_meal_count(p_cycle_id,cm.user_id) else 0 end,
       coalesce((select sum(c.amount) from public.contributions c where c.cycle_id=p_cycle_id and c.user_id=cm.user_id),0),
       cm.opening_balance
    from public.cycle_members cm where cm.cycle_id=p_cycle_id;

  select count(*) into v_member_count from public.cycle_members where cycle_id=p_cycle_id;
  select coalesce(sum(meals),0) into v_total_meals from tmp_guest_settlement;
  select public.guest_meal_count(p_cycle_id,null) into v_guest_meals;

  if v_policy='shared_by_meals' then v_rate:=case when v_total_meals+v_guest_meals=0 then 0 else round(v_food/(v_total_meals+v_guest_meals),2) end;
  else v_rate:=case when v_total_meals=0 then 0 else round(v_food/v_total_meals,2) end;
  end if;

  if v_policy='host_pays' then
    update tmp_guest_settlement t set guest_charge=round(public.guest_meal_count(p_cycle_id,t.user_id)*v_rate,2);
  elsif v_policy='shared_equal' then
    update tmp_guest_settlement set guest_charge=round((v_guest_meals*v_rate)/nullif(v_member_count,0),2);
  elsif v_policy='free_limit' then
    update tmp_guest_settlement t set guest_charge=round(greatest(public.guest_meal_count(p_cycle_id,t.user_id)-v_free_limit,0)*v_rate,2);
    if v_guest_meals > 0 and v_member_count > 0 then
      update tmp_guest_settlement set guest_charge=round(guest_charge + (least(v_guest_meals, v_member_count*0 + v_guest_meals) - sum_free)::numeric,2);
    end if;
  end if;

  update tmp_guest_settlement set meal_cost=round(meals*v_rate,2);
  -- For free-limit policy, the free allowance is shared by the member meal pool so the ledger still allocates all food cost.
  if v_policy='free_limit' then
    with free_totals as (
      select least(public.guest_meal_count(p_cycle_id,t.user_id),v_free_limit)::numeric free_count from tmp_guest_settlement t
    )
    update tmp_guest_settlement t set guest_charge=guest_charge;
  end if;

  -- Shared-by-meals charges guests through the lower global rate; all other policies allocate member meals normally.
  if v_policy='shared_equal' then
    -- guest_charge is the member's equal share of the guest pool.
    null;
  elsif v_policy='host_pays' then
    null;
  elsif v_policy='free_limit' then
    -- Free guest meals are treated as part of the shared pool; the host only pays above the allowance.
    update tmp_guest_settlement set meal_cost=round(meal_cost + ((v_guest_meals - least(v_guest_meals, v_member_count*v_free_limit)) * v_rate / nullif(v_member_count,0)),2);
  end if;

  for r in select * from tmp_guest_settlement loop
    v_guest_charge:=r.guest_charge;
    v_opening:=r.opening_balance;
    v_contrib:=r.contribution;
    v_meals:=r.meals;
    v_balance:=round(v_opening+v_contrib-r.meal_cost-v_guest_charge,2);
    insert into public.settlements(cycle_id,flat_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance,guest_meals,guest_charge)
      values(p_cycle_id,v_flat,r.user_id,v_meals,r.meal_cost,v_contrib,v_opening,v_balance,public.guest_meal_count(p_cycle_id,r.user_id),v_guest_charge)
    on conflict(cycle_id,user_id) do update set total_meals=excluded.total_meals,meal_cost=excluded.meal_cost,total_contribution=excluded.total_contribution,opening_balance=excluded.opening_balance,balance=excluded.balance,guest_meals=excluded.guest_meals,guest_charge=excluded.guest_charge;
  end loop;

  update public.cycles set status='closed' where id=p_cycle_id;
  insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_end+1,v_end+v_len,'open') returning id into v_next;
  insert into public.cycle_members(cycle_id,user_id,opening_balance,active_from)
    select v_next,s.user_id,s.balance,v_end+1 from public.settlements s where s.cycle_id=p_cycle_id;
  return v_next;
end;
$$;

revoke all on function private.close_cycle_internal(uuid) from public;
grant execute on function private.close_cycle_internal(uuid) to authenticated;
