-- Premium business rules: manager subscription, one flat per manager, invite-code limits.

create table if not exists public.manager_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_code text not null default 'manager_99_bdt' check (plan_code = 'manager_99_bdt'),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled','incomplete','unpaid')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manager_subscriptions_status on public.manager_subscriptions(user_id,status,current_period_end);

alter table public.manager_subscriptions enable row level security;
revoke all on public.manager_subscriptions from public;
grant select on public.manager_subscriptions to authenticated;

drop policy if exists manager_subscription_select_self on public.manager_subscriptions;
create policy manager_subscription_select_self on public.manager_subscriptions
for select to authenticated using (user_id = auth.uid());

create or replace function private.has_active_manager_plan(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.manager_subscriptions ms
     where ms.user_id = p_user_id
       and ms.status in ('active','trialing')
       and (ms.current_period_end is null or ms.current_period_end > now())
  );
$$;

grant execute on function private.has_active_manager_plan(uuid) to authenticated;

-- Existing flats keep their historical access, but each manager can only own one going forward.
create unique index if not exists uq_flats_created_by on public.flats(created_by);

-- Invite codes are now first-class, revocable and quota-limited.
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz
);

create index if not exists idx_invite_codes_flat_active on public.invite_codes(flat_id, revoked_at, created_at desc);
create index if not exists idx_invite_codes_creator_month on public.invite_codes(created_by, created_at);

alter table public.invite_codes enable row level security;
grant select, insert, update on public.invite_codes to authenticated;

drop policy if exists invite_codes_select_flat on public.invite_codes;
create policy invite_codes_select_flat on public.invite_codes
for select to authenticated using (private.is_flat_member(flat_id));

drop policy if exists invite_codes_insert_manager on public.invite_codes;
create policy invite_codes_insert_manager on public.invite_codes
for insert to authenticated with check (created_by = auth.uid() and private.is_flat_manager(flat_id));

drop policy if exists invite_codes_update_manager on public.invite_codes;
create policy invite_codes_update_manager on public.invite_codes
for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));

-- Backfill every existing flat's legacy invite code into the new table.
insert into public.invite_codes(flat_id,code,created_by,created_at)
select f.id,f.invite_code,f.created_by,f.created_at
from public.flats f
where not exists (select 1 from public.invite_codes ic where ic.flat_id=f.id);

create or replace function public.create_manager_checkout_requirement()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_manager_plan(auth.uid());
$$;

create or replace function public.create_flat(
  p_name text,
  p_address text default null,
  p_month_start_day integer default 1,
  p_meal_policy text default 'opt_out'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_flat uuid; v_start date; v_end date; v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not private.has_active_manager_plan(v_user) then raise exception 'manager_plan_required'; end if;
  if exists(select 1 from public.flats where created_by=v_user) then raise exception 'manager_flat_limit_reached'; end if;
  if p_month_start_day < 1 or p_month_start_day > 28 then raise exception 'invalid_month_start_day'; end if;
  if p_meal_policy not in ('opt_in','opt_out') then raise exception 'invalid_meal_policy'; end if;

  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
  insert into public.flats(name,address,month_start_day,meal_policy,invite_code,created_by)
  values (trim(p_name), nullif(trim(p_address),''), p_month_start_day, p_meal_policy, v_code, v_user)
  returning id into v_flat;
  insert into public.invite_codes(flat_id,code,created_by) values(v_flat,v_code,v_user);
  insert into public.flat_members(flat_id,user_id,role,status) values (v_flat,v_user,'admin','active');

  v_start := case when extract(day from current_date) >= p_month_start_day
    then make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day)
    else (make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day) - interval '1 month')::date end;
  v_end := (v_start + interval '1 month' - interval '1 day')::date;
  insert into public.cycles(flat_id,start_date,end_date,status) values (v_flat,v_start,v_end,'open');
  insert into public.cycle_members(cycle_id,user_id,active_from)
  select c.id,v_user,greatest(v_start,fm.joined_at)
    from public.cycles c join public.flat_members fm on fm.flat_id=c.flat_id and fm.user_id=v_user
   where c.id=(select id from public.cycles where flat_id=v_flat and status='open' order by created_at desc limit 1);
  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_flat,v_user,'flat.created','flat',v_flat,jsonb_build_object('name',p_name,'plan','manager_99_bdt'));
  return v_flat;
end;
$$;

create or replace function public.generate_invite_code(p_flat_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_code text; v_month_start timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  if not private.has_active_manager_plan(v_user) then raise exception 'manager_plan_required'; end if;
  v_month_start := date_trunc('month', now());
  if (select count(*) from public.invite_codes where created_by=v_user and created_at >= v_month_start and created_at < v_month_start + interval '1 month') >= 10 then
    raise exception 'monthly_invite_code_limit_reached';
  end if;
  v_code := upper(substr(encode(gen_random_bytes(10), 'hex'),1,10));
  insert into public.invite_codes(flat_id,code,created_by) values(p_flat_id,v_code,v_user);
  return v_code;
end;
$$;

create or replace function public.revoke_invite_code(p_code_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_flat uuid;
begin
  select flat_id into v_flat from public.invite_codes where id=p_code_id;
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  update public.invite_codes set revoked_at=now() where id=p_code_id and revoked_at is null;
end;
$$;

create or replace function public.join_flat(p_invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_flat uuid; v_cycle uuid; v_start date; v_code_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select ic.id,ic.flat_id into v_code_id,v_flat
    from public.invite_codes ic
   where ic.code=upper(trim(p_invite_code))
     and ic.revoked_at is null
     and (ic.expires_at is null or ic.expires_at > now());
  if v_flat is null then raise exception 'invalid_invite_code'; end if;
  if exists(select 1 from public.flat_members where flat_id=v_flat and user_id=v_user and status='active') then return v_flat; end if;
  if exists(select 1 from public.flat_members where flat_id=v_flat and user_id=v_user and status='left') then
    update public.flat_members set status='active',left_at=null,joined_at=current_date where flat_id=v_flat and user_id=v_user;
  else
    insert into public.flat_members(flat_id,user_id,role,status) values(v_flat,v_user,'member','active');
  end if;
  select id,start_date into v_cycle,v_start from public.cycles where flat_id=v_flat and status='open' order by start_date desc limit 1;
  if v_cycle is not null then
    insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
    values(v_cycle,v_user,greatest(v_start,current_date),0) on conflict(cycle_id,user_id) do nothing;
  end if;
  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_flat,v_user,'member.joined','flat_member',v_user,jsonb_build_object('invite_code_id',v_code_id));
  return v_flat;
end;
$$;

revoke all on function public.create_flat(text,text,integer,text) from public;
grant execute on function public.create_flat(text,text,integer,text) to authenticated;
revoke all on function public.join_flat(text) from public;
grant execute on function public.join_flat(text) to authenticated;
revoke all on function public.generate_invite_code(uuid) from public;
grant execute on function public.generate_invite_code(uuid) to authenticated;
revoke all on function public.revoke_invite_code(uuid) from public;
grant execute on function public.revoke_invite_code(uuid) to authenticated;
revoke all on function public.create_manager_checkout_requirement() from public;
grant execute on function public.create_manager_checkout_requirement() to authenticated;
