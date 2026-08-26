-- Canonical flat creation guard.
-- A flat can be created only by an authenticated user with an ACTIVE
-- Manager Plan, and an owner can create only one flat ever.

create or replace function public.create_flat(
  p_name text,
  p_address text default null,
  p_month_start_day integer default 1,
  p_meal_policy text default 'opt_out'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_code text;
  v_start date;
  v_end date;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Creating a flat requires a currently paid Manager Plan.
  -- Grace access is for an existing flat only; it does not authorize
  -- creation of a new flat.
  if private.subscription_state(v_user) <> 'active' then
    raise exception 'subscription_required';
  end if;

  if exists (
    select 1
      from public.flats
     where owner_id = v_user
  ) then
    raise exception 'flat_already_exists';
  end if;

  if p_month_start_day < 1 or p_month_start_day > 28 then
    raise exception 'invalid_month_start_day';
  end if;

  if p_meal_policy not in ('opt_in', 'opt_out') then
    raise exception 'invalid_meal_policy';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'flat_name_required';
  end if;

  v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));

  insert into public.flats(
    name,
    address,
    month_start_day,
    meal_policy,
    invite_code,
    created_by,
    owner_id
  )
  values (
    trim(p_name),
    nullif(trim(p_address), ''),
    p_month_start_day,
    p_meal_policy,
    v_code,
    v_user,
    v_user
  )
  returning id into v_flat;

  insert into public.flat_members(flat_id, user_id, role, status)
  values (v_flat, v_user, 'admin', 'active');

  v_start := case
    when extract(day from (current_timestamp at time zone 'Asia/Dhaka')) >= p_month_start_day
      then make_date(
        extract(year from (current_timestamp at time zone 'Asia/Dhaka'))::int,
        extract(month from (current_timestamp at time zone 'Asia/Dhaka'))::int,
        p_month_start_day
      )
    else
      (
        make_date(
          extract(year from (current_timestamp at time zone 'Asia/Dhaka'))::int,
          extract(month from (current_timestamp at time zone 'Asia/Dhaka'))::int,
          p_month_start_day
        ) - interval '1 month'
      )::date
  end;

  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  insert into public.cycles(flat_id, start_date, end_date, status)
  values (v_flat, v_start, v_end, 'open');

  insert into public.cycle_members(cycle_id, user_id, active_from)
  select c.id, v_user, greatest(v_start, fm.joined_at)
    from public.cycles c
    join public.flat_members fm
      on fm.flat_id = c.flat_id
     and fm.user_id = v_user
   where c.id = (
     select id
       from public.cycles
      where flat_id = v_flat
        and status = 'open'
      order by created_at desc
      limit 1
   );

  insert into public.audit_logs(
    flat_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_flat,
    v_user,
    'flat.created',
    'flat',
    v_flat,
    jsonb_build_object('name', trim(p_name), 'owner_id', v_user)
  );

  return v_flat;
end;
$$;

revoke all on function public.create_flat(text, text, integer, text) from public;
grant execute on function public.create_flat(text, text, integer, text) to authenticated;
