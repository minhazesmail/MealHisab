-- Eid / Festival Mode
-- Adds explicit cycle types, festival metadata, and a dedicated festival expense category.

alter table public.cycles
  add column if not exists cycle_type text not null default 'regular'
    check (cycle_type in ('regular','short','eid','festival')),
  add column if not exists festival_name text,
  add column if not exists festival_start_date date,
  add column if not exists festival_end_date date,
  add column if not exists meals_paused boolean not null default false,
  add constraint cycles_festival_dates_valid check (
    festival_start_date is null
    or festival_end_date is null
    or festival_end_date >= festival_start_date
  );

alter table public.expenses
  drop constraint if exists expenses_category_check;

alter table public.expenses
  add constraint expenses_category_check
  check (category in ('grocery','cook_salary','gas','other','festival'));

create or replace function public.configure_cycle_mode(
  p_cycle_id uuid,
  p_cycle_type text,
  p_festival_name text default null,
  p_festival_start_date date default null,
  p_festival_end_date date default null,
  p_meals_paused boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_cycle_type not in ('regular','short','eid','festival') then raise exception 'invalid_cycle_type'; end if;

  select flat_id into v_flat
    from public.cycles
   where id = p_cycle_id and status = 'open';
  if v_flat is null then raise exception 'open_cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;

  if p_cycle_type in ('eid','festival') and (p_festival_start_date is null or p_festival_end_date is null) then
    raise exception 'festival_dates_required';
  end if;

  if p_festival_start_date is not null and p_festival_end_date < p_festival_start_date then
    raise exception 'invalid_festival_dates';
  end if;

  if p_festival_start_date is not null and not exists (
    select 1 from public.cycles c
     where c.id = p_cycle_id
       and p_festival_start_date >= c.start_date
       and p_festival_end_date <= c.end_date
  ) then
    raise exception 'festival_dates_outside_cycle';
  end if;

  update public.cycles
     set cycle_type = p_cycle_type,
         festival_name = nullif(trim(p_festival_name), ''),
         festival_start_date = p_festival_start_date,
         festival_end_date = p_festival_end_date,
         meals_paused = coalesce(p_meals_paused, false)
   where id = p_cycle_id;

  if coalesce(p_meals_paused, false) and p_festival_start_date is not null then
    insert into public.cycle_closed_days(cycle_id,date,reason,created_by)
    select p_cycle_id, gs.d::date, coalesce(nullif(trim(p_festival_name), ''), 'Festival break'), v_uid
      from generate_series(p_festival_start_date, p_festival_end_date, interval '1 day') gs(d)
    on conflict (cycle_id, date) do update
      set reason = excluded.reason,
          created_by = excluded.created_by;
  end if;
end;
$$;

revoke all on function public.configure_cycle_mode(uuid,text,text,date,date,boolean) from public;
grant execute on function public.configure_cycle_mode(uuid,text,text,date,date,boolean) to authenticated;

-- Festival mode is represented in the same calendar/closed-day ledger, so existing
-- meal, vacation and active_from/active_to calculations automatically pause meals.

create index if not exists idx_cycles_type_dates
  on public.cycles(flat_id, cycle_type, start_date, end_date);

-- Make festival expenses available to the existing expense form without changing
-- the rest of the accounting model.
