-- MealHisab production hardening: accounting integrity, departure proration, RBAC,
-- closed/holiday days, settlement payouts, optimized cycle closing, and email-safe profiles.

-- 1) Email-only accounts must not collide on phone=''.
alter table public.profiles alter column phone drop not null;
alter table public.profiles add column if not exists email text;
update public.profiles set phone = null where phone is not null and trim(phone) = '';
create unique index if not exists profiles_email_unique on public.profiles(lower(email)) where email is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, phone, email, full_name)
  values (
    new.id,
    nullif(new.phone, ''),
    nullif(lower(new.email), ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'MealHisab User')
  )
  on conflict (id) do update set
    phone = excluded.phone,
    email = excluded.email,
    full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 2) Closed/holiday days: opt-out meals are suppressed for the entire flat on these dates.
create table if not exists public.cycle_closed_days (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  date date not null,
  reason text not null default 'Mess closed' check (length(trim(reason)) between 1 and 200),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(cycle_id, date)
);
create index if not exists idx_cycle_closed_days_cycle_date on public.cycle_closed_days(cycle_id, date);

-- 3) Final settlement payments/collections, including partial payments.
create table if not exists public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('payout','collection')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  paid_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_settlement_payments_settlement on public.settlement_payments(settlement_id, paid_at desc);
create index if not exists idx_settlement_payments_flat_user on public.settlement_payments(flat_id, user_id, paid_at desc);

-- 4) Money is money: store settlement balances/costs at cents precision.
alter table public.cycle_members alter column opening_balance type numeric(14,2) using round(opening_balance, 2);
alter table public.settlements alter column meal_cost type numeric(14,2) using round(meal_cost, 2);
alter table public.settlements alter column opening_balance type numeric(14,2) using round(opening_balance, 2);
alter table public.settlements alter column balance type numeric(14,2) using round(balance, 2);
create index if not exists idx_meal_logs_cycle_date_user_type on public.meal_logs(cycle_id, date, user_id, meal_type);

-- 5) Managers may administer members/settings, but cannot escalate roles or remove admins.
create or replace function private.guard_manager_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_flat_admin(coalesce(new.flat_id, old.flat_id)) then
    if tg_op = 'INSERT' and new.role <> 'member' then
      raise exception 'only_admins_can_assign_admin_or_manager_role';
    end if;
    if tg_op = 'UPDATE' then
      if new.flat_id <> old.flat_id or new.user_id <> old.user_id or new.role <> old.role then
        raise exception 'only_admins_can_change_member_identity_or_role';
      end if;
      if old.role = 'admin' and new.status = 'left' then
        raise exception 'only_admins_can_remove_admin';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_manager_changes on public.flat_members;
create trigger guard_manager_changes before insert or update on public.flat_members for each row execute function private.guard_manager_changes();

create or replace function private.guard_flat_manager_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_flat_admin(old.id) then
    if new.created_by <> old.created_by or new.invite_code <> old.invite_code or new.currency <> old.currency then
      raise exception 'only_admins_can_change_protected_flat_fields';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_flat_manager_changes on public.flats;
create trigger guard_flat_manager_changes before update on public.flats for each row execute function private.guard_flat_manager_changes();

drop policy if exists flats_update_admin on public.flats;
create policy flats_update_manager on public.flats for update to authenticated using (private.is_flat_manager(id)) with check (private.is_flat_manager(id));

drop policy if exists members_insert_admin on public.flat_members;
create policy members_insert_manager on public.flat_members for insert to authenticated with check (private.is_flat_manager(flat_id));
drop policy if exists members_update_admin on public.flat_members;
create policy members_update_manager on public.flat_members for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));
drop policy if exists members_delete_admin on public.flat_members;
create policy members_delete_manager on public.flat_members for delete to authenticated using (private.is_flat_admin(flat_id) or (private.is_flat_manager(flat_id) and role <> 'admin'));

create policy cycle_closed_days_select_member on public.cycle_closed_days for select to authenticated using (
  exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_member(c.flat_id))
);
create policy cycle_closed_days_insert_manager on public.cycle_closed_days for insert to authenticated with check (
  exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open')
);
create policy cycle_closed_days_update_manager on public.cycle_closed_days for update to authenticated using (
  exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open')
) with check (
  exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open')
);
create policy cycle_closed_days_delete_manager on public.cycle_closed_days for delete to authenticated using (
  exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open')
);

alter table public.cycle_closed_days enable row level security;
alter table public.settlement_payments enable row level security;
grant select, insert, update, delete on public.cycle_closed_days, public.settlement_payments to authenticated;
create policy settlement_payments_select_member on public.settlement_payments for select to authenticated using (private.is_flat_member(flat_id));
create policy settlement_payments_insert_manager on public.settlement_payments for insert to authenticated with check (private.is_flat_manager(flat_id));

-- 6) Leaving a flat immediately prorates all open cycles.
create or replace function private.sync_member_departure()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'left' and new.left_at is not null then
    update public.cycle_members cm
       set active_to = least(coalesce(cm.active_to, new.left_at), new.left_at)
      from public.cycles c
     where c.id = cm.cycle_id
       and c.flat_id = new.flat_id
       and c.status = 'open'
       and cm.user_id = new.user_id
       and cm.active_from <= new.left_at;
  elsif new.status = 'active' and new.left_at is null then
    update public.cycle_members cm
       set active_to = null
      from public.cycles c
     where c.id = cm.cycle_id
       and c.flat_id = new.flat_id
       and c.status = 'open'
       and cm.user_id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_member_departure on public.flat_members;
create trigger sync_member_departure after update of status, left_at on public.flat_members for each row execute function private.sync_member_departure();

update public.cycle_members cm
   set active_to = fm.left_at
  from public.cycles c,
       public.flat_members fm
 where cm.cycle_id = c.id
   and fm.flat_id = c.flat_id
   and fm.user_id = cm.user_id
   and c.status = 'open'
   and fm.status = 'left'
   and fm.left_at is not null;

create or replace function public.leave_flat(p_flat_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_role text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select role into v_role from public.flat_members where flat_id = p_flat_id and user_id = v_user and status = 'active' for update;
  if v_role is null then raise exception 'not_active_member'; end if;
  if v_role = 'admin' and not exists (
    select 1 from public.flat_members where flat_id = p_flat_id and status = 'active' and role = 'admin' and user_id <> v_user
  ) then
    raise exception 'admin_must_transfer_admin_role_before_leaving';
  end if;
  update public.flat_members set status = 'left', left_at = current_date where flat_id = p_flat_id and user_id = v_user;
end;
$$;
revoke all on function public.leave_flat(uuid) from public;
grant execute on function public.leave_flat(uuid) to authenticated;

-- 7) Closed days are validated centrally, not just by the UI.
create or replace function public.set_cycle_closed_day(p_cycle_id uuid, p_date date, p_reason text default 'Mess closed')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_flat uuid; v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id = p_cycle_id and status = 'open';
  if v_flat is null then raise exception 'open_cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.cycles where id = p_cycle_id and p_date between start_date and end_date) then raise exception 'date_outside_cycle'; end if;
  insert into public.cycle_closed_days(cycle_id,date,reason,created_by)
  values (p_cycle_id,p_date,coalesce(nullif(trim(p_reason),''),'Mess closed'),v_user)
  on conflict (cycle_id,date) do update set reason=excluded.reason, created_by=excluded.created_by
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.set_cycle_closed_day(uuid,date,text) from public;
grant execute on function public.set_cycle_closed_day(uuid,date,text) to authenticated;

create or replace function public.remove_cycle_closed_day(p_cycle_id uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_flat uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id = p_cycle_id;
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  delete from public.cycle_closed_days where cycle_id = p_cycle_id and date = p_date;
end;
$$;
revoke all on function public.remove_cycle_closed_day(uuid,date) from public;
grant execute on function public.remove_cycle_closed_day(uuid,date) to authenticated;

-- 8) Production-grade cycle close: one set-based meal aggregation, all expense categories,
-- cents precision, and residual reconciliation so total allocated meal cost equals total expenses.
create or replace function public.close_cycle(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid; v_start date; v_end date; v_next_start date; v_next_end date; v_next uuid;
  v_total_cost numeric(14,2); v_total_meals bigint; v_rate numeric(14,2); v_residual numeric(14,2);
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id,start_date,end_date into v_flat,v_start,v_end from public.cycles where id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if exists(select 1 from public.cycles where id=p_cycle_id and status='closed') then
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1 limit 1;
    if v_next is not null then return v_next; else raise exception 'cycle_already_closed'; end if;
  end if;

  select coalesce(sum(amount),0)::numeric(14,2) into v_total_cost
    from public.expenses where cycle_id=p_cycle_id;

  create temporary table if not exists tmp_settlement(
    user_id uuid primary key,
    meals integer not null,
    contribution numeric(12,2) not null,
    opening_balance numeric(14,2) not null,
    meal_cost numeric(14,2) not null default 0
  ) on commit drop;
  truncate tmp_settlement;

  with member_days as (
    select cm.user_id, gs.d::date as service_date, f.meal_policy
      from public.cycle_members cm
      join public.cycles c on c.id = cm.cycle_id
      join public.flats f on f.id = c.flat_id
      cross join generate_series(c.start_date,c.end_date,interval '1 day') gs(d)
     where cm.cycle_id = p_cycle_id
       and gs.d::date >= cm.active_from
       and (cm.active_to is null or gs.d::date <= cm.active_to)
       and not exists (select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
  ),
  daily_meals as (
    select md.user_id, md.service_date,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'), case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='dinner'), case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='extra'), 0) meals
    from member_days md
    left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=md.user_id and ml.date=md.service_date
    group by md.user_id,md.service_date,md.meal_policy
  ),
  meal_totals as (
    select user_id,sum(meals)::integer meals from daily_meals group by user_id
  ),
  contribution_totals as (
    select user_id,coalesce(sum(amount),0)::numeric(12,2) contribution from public.contributions where cycle_id=p_cycle_id group by user_id
  )
  insert into tmp_settlement(user_id,meals,contribution,opening_balance)
  select mt.user_id,mt.meals,coalesce(ct.contribution,0),coalesce(cm.opening_balance,0)
    from meal_totals mt
    join public.cycle_members cm on cm.cycle_id=p_cycle_id and cm.user_id=mt.user_id
    left join contribution_totals ct on ct.user_id=mt.user_id;

  select coalesce(sum(meals),0) into v_total_meals from tmp_settlement;
  if v_total_meals=0 and v_total_cost>0 then raise exception 'cannot_close_cycle_with_expenses_and_zero_meals'; end if;
  v_rate:=case when v_total_meals=0 then 0 else round(v_total_cost/v_total_meals,2) end;
  update tmp_settlement set meal_cost=round(meals*v_rate,2);
  select round(v_total_cost-coalesce(sum(meal_cost),0),2) into v_residual from tmp_settlement;
  if v_residual<>0 then
    update tmp_settlement
       set meal_cost=round(meal_cost+v_residual,2)
     where user_id=(select user_id from tmp_settlement order by meals desc,user_id desc limit 1);
  end if;

  insert into public.settlements(cycle_id,user_id,flat_id,total_meals,meal_cost,total_contribution,opening_balance,balance)
  select p_cycle_id,user_id,v_flat,meals,meal_cost,contribution,opening_balance,round(opening_balance+contribution-meal_cost,2)
    from tmp_settlement
  on conflict(cycle_id,user_id) do update set total_meals=excluded.total_meals,meal_cost=excluded.meal_cost,total_contribution=excluded.total_contribution,opening_balance=excluded.opening_balance,balance=excluded.balance;

  update public.cycles set status='closed' where id=p_cycle_id;
  v_next_start:=v_end+1;
  v_next_end:=(v_next_start+(v_end-v_start+1))-1;
  insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_next_start,v_next_end,'open') returning id into v_next;
  insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
  select v_next,fm.user_id,greatest(v_next_start,fm.joined_at::date),coalesce(s.balance,0)
    from public.flat_members fm
    left join public.settlements s on s.cycle_id=p_cycle_id and s.user_id=fm.user_id
   where fm.flat_id=v_flat and fm.status='active';

  return v_next;
end;
$$;
revoke all on function public.close_cycle(uuid) from public;
grant execute on function public.close_cycle(uuid) to authenticated;
