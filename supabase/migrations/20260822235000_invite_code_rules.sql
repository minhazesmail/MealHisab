-- Tighten invite codes: single-use, seven-day expiry, active-plan validation at join,
-- and monthly quota counts every generated code (used/revoked/expired included).

alter table public.invite_codes
  add column if not exists used_at timestamptz,
  add column if not exists used_by uuid references public.profiles(id);

update public.invite_codes
   set expires_at = created_at + interval '7 days'
 where expires_at is null;

-- A code is consumed exactly once. Existing rows remain joinable only until their
-- seven-day window expires, then behave like any other expired invite.
create index if not exists idx_invite_codes_active_lookup
  on public.invite_codes(code, revoked_at, expires_at, used_at);

create or replace function public.generate_invite_code(p_flat_id uuid)
returns text
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_month_start timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  if not private.has_active_manager_plan(v_user) then raise exception 'manager_plan_required'; end if;

  v_month_start := date_trunc('month', now());
  -- Every generated code counts toward the quota, regardless of whether it was
  -- later revoked, expired, or consumed.
  if (
    select count(*)
      from public.invite_codes
     where created_by = v_user
       and created_at >= v_month_start
       and created_at < v_month_start + interval '1 month'
  ) >= 10 then
    raise exception 'monthly_invite_code_limit_reached';
  end if;

  v_code := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 10));
  insert into public.invite_codes(flat_id, code, created_by, expires_at)
  values (p_flat_id, v_code, v_user, now() + interval '7 days');

  return v_code;
end;
$$;

create or replace function public.revoke_invite_code(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = '' as $$
declare
  v_flat uuid;
begin
  select flat_id into v_flat
    from public.invite_codes
   where id = p_code_id;

  if v_flat is null or not private.is_flat_manager(v_flat) then
    raise exception 'forbidden';
  end if;

  update public.invite_codes
     set revoked_at = coalesce(revoked_at, now())
   where id = p_code_id;
end;
$$;

create or replace function public.join_flat(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_cycle uuid;
  v_start date;
  v_code_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  -- Lock the invite row so two concurrent joins cannot consume the same code.
  select ic.id, ic.flat_id
    into v_code_id, v_flat
    from public.invite_codes ic
   where ic.code = upper(trim(p_invite_code))
     and ic.revoked_at is null
     and ic.used_at is null
     and ic.expires_at is not null
     and ic.expires_at > now()
   for update;

  if v_flat is null then
    raise exception 'invalid_invite_code';
  end if;

  -- The manager must still be paid/active when the code is used.
  if not exists (
    select 1
      from public.flats f
      join public.flat_members fm on fm.flat_id = f.id
     where f.id = v_flat
       and fm.role in ('admin', 'manager')
       and fm.status = 'active'
       and private.has_active_manager_plan(fm.user_id)
  ) then
    raise exception 'manager_plan_required';
  end if;

  if exists (
    select 1 from public.flat_members
     where flat_id = v_flat and user_id = v_user and status = 'active'
  ) then
    raise exception 'already_a_member';
  end if;

  if exists (
    select 1 from public.flat_members
     where flat_id = v_flat and user_id = v_user and status = 'left'
  ) then
    update public.flat_members
       set status = 'active', left_at = null, joined_at = current_date
     where flat_id = v_flat and user_id = v_user;
  else
    insert into public.flat_members(flat_id, user_id, role, status)
    values (v_flat, v_user, 'member', 'active');
  end if;

  select id, start_date
    into v_cycle, v_start
    from public.cycles
   where flat_id = v_flat and status = 'open'
   order by start_date desc
   limit 1;

  if v_cycle is not null then
    insert into public.cycle_members(cycle_id, user_id, active_from, opening_balance)
    values (v_cycle, v_user, greatest(v_start, current_date), 0)
    on conflict(cycle_id, user_id) do nothing;
  end if;

  -- Consume the code only after all join validation succeeds.
  update public.invite_codes
     set used_at = now(), used_by = v_user
   where id = v_code_id;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_flat,
    v_user,
    'member.joined',
    'flat_member',
    v_user,
    jsonb_build_object('invite_code_id', v_code_id, 'invite_consumed', true)
  );

  return v_flat;
end;
$$;

revoke all on function public.generate_invite_code(uuid) from public;
grant execute on function public.generate_invite_code(uuid) to authenticated;
revoke all on function public.revoke_invite_code(uuid) from public;
grant execute on function public.revoke_invite_code(uuid) to authenticated;
revoke all on function public.join_flat(text) from public;
grant execute on function public.join_flat(text) to authenticated;
