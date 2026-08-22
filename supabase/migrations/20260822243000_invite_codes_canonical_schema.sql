-- Canonical invite-code lifecycle schema.
-- Keeps the existing invite system but makes status, usage limits and creation month explicit.

alter table public.invite_codes
  add column if not exists status text not null default 'active',
  add column if not exists max_uses integer not null default 1,
  add column if not exists used_count integer not null default 0,
  add column if not exists created_month date;

-- Backfill the creation month before enforcing NOT NULL.
update public.invite_codes
set created_month = date_trunc('month', created_at)::date
where created_month is null;

alter table public.invite_codes
  alter column created_month set not null;

-- The canonical table references auth.users directly.
alter table public.invite_codes
  drop constraint if exists invite_codes_created_by_fkey;
alter table public.invite_codes
  add constraint invite_codes_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete restrict;

alter table public.invite_codes
  drop constraint if exists invite_codes_status_check;
alter table public.invite_codes
  add constraint invite_codes_status_check
  check (status in ('active','used','revoked','expired'));

alter table public.invite_codes
  drop constraint if exists invite_codes_max_uses_check;
alter table public.invite_codes
  add constraint invite_codes_max_uses_check
  check (max_uses >= 1);

alter table public.invite_codes
  drop constraint if exists invite_codes_used_count_check;
alter table public.invite_codes
  add constraint invite_codes_used_count_check
  check (used_count >= 0 and used_count <= max_uses);

create index if not exists invite_codes_flat_id_idx
  on public.invite_codes(flat_id);

create index if not exists invite_codes_created_by_month_idx
  on public.invite_codes(created_by, created_month);

-- Reconcile legacy rows with their current lifecycle.
update public.invite_codes
set status = case
  when revoked_at is not null then 'revoked'
  when used_at is not null or used_count >= max_uses then 'used'
  when expires_at <= now() then 'expired'
  else 'active'
end;

update public.invite_codes
set max_uses = 1
where max_uses is null or max_uses < 1;

update public.invite_codes
set used_count = case when used_at is not null then 1 else 0 end
where used_count is null or used_count <> case when used_at is not null then 1 else 0 end;

-- Mark expired active codes explicitly. The function is safe to call repeatedly.
create or replace function public.expire_invite_codes()
returns integer
language plpgsql
security definer
set search_path = '' as $$
declare
  v_count integer;
begin
  update public.invite_codes
     set status = 'expired'
   where status = 'active'
     and expires_at <= now()
     and used_count < max_uses
     and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_invite_codes() to authenticated;

-- Generation: every generated row counts toward the 10/month quota.
create or replace function public.generate_invite_code(p_flat_id uuid)
returns text
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_created_month date := date_trunc('month', now())::date;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  if not private.has_active_manager_plan(v_user) then raise exception 'manager_plan_required'; end if;

  if (
    select count(*)
      from public.invite_codes
     where created_by = v_user
       and created_month = v_created_month
  ) >= 10 then
    raise exception 'monthly_invite_code_limit_reached';
  end if;

  v_code := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 10));
  insert into public.invite_codes(
    flat_id, code, created_by, status, max_uses, used_count,
    expires_at, created_month
  ) values (
    p_flat_id, v_code, v_user, 'active', 1, 0,
    now() + interval '7 days', v_created_month
  );

  return v_code;
end;
$$;

-- Revocation is terminal and cannot be undone through the normal UI.
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
     set status = 'revoked', revoked_at = coalesce(revoked_at, now())
   where id = p_code_id
     and status = 'active';
end;
$$;

-- Join consumes the code exactly once, under row lock.
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

  -- Expire stale codes before looking them up.
  perform public.expire_invite_codes();

  select ic.id, ic.flat_id
    into v_code_id, v_flat
    from public.invite_codes ic
   where ic.code = upper(trim(p_invite_code))
     and ic.status = 'active'
     and ic.used_count < ic.max_uses
     and ic.revoked_at is null
     and ic.expires_at > now()
   for update;

  if v_flat is null then
    raise exception 'invalid_invite_code';
  end if;

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

  update public.invite_codes
     set used_count = used_count + 1,
         used_by = v_user,
         used_at = coalesce(used_at, now()),
         status = case when used_count + 1 >= max_uses then 'used' else status end
   where id = v_code_id;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_flat, v_user, 'member.joined', 'flat_member', v_user,
    jsonb_build_object('invite_code_id', v_code_id, 'invite_consumed', true)
  );

  return v_flat;
end;
$$;

grant execute on function public.generate_invite_code(uuid) to authenticated;
grant execute on function public.revoke_invite_code(uuid) to authenticated;
grant execute on function public.join_flat(text) to authenticated;
