-- Member protection and 30-day recovery window after manager billing failure.
-- 0-7 days after expiry: normal member access; manager remains in grace.
-- After grace through day 30: members remain read-only and can export data.
-- After day 30: support takeover becomes eligible, but is never automatic.

create or replace function private.flat_recovery_state(p_flat_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select sub.current_period_end
    from public.flats f
    join public.subscriptions sub
      on sub.user_id = f.owner_id
     and sub.plan = 'manager_monthly'
    where f.id = p_flat_id
    order by sub.updated_at desc
    limit 1
  )
  select case
    when not exists (select 1 from s) then 'active'
    when (select current_period_end from s) > now() then 'active'
    when (select current_period_end from s) > now() - interval '7 days' then 'grace'
    when (select current_period_end from s) > now() - interval '30 days' then 'read_only_recovery'
    else 'support_takeover_eligible'
  end;
$$;

revoke all on function private.flat_recovery_state(uuid) from public;
grant execute on function private.flat_recovery_state(uuid) to authenticated;

create or replace function private.member_can_write_flat(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.flat_recovery_state(p_flat_id) in ('active', 'grace');
$$;

revoke all on function private.member_can_write_flat(uuid) from public;
grant execute on function private.member_can_write_flat(uuid) to authenticated;

-- Members can request/export recovery data after the manager's flat enters the
-- 30-day recovery window. Actual support takeover remains an explicit action.
create table if not exists public.flat_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  type text not null default 'support_takeover',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  note text,
  constraint flat_recovery_requests_type_check check (type in ('export','support_takeover')),
  constraint flat_recovery_requests_status_check check (status in ('pending','resolved','rejected'))
);

create index if not exists flat_recovery_requests_flat_idx
on public.flat_recovery_requests(flat_id, created_at desc);

alter table public.flat_recovery_requests enable row level security;

create policy flat_recovery_requests_select_member
on public.flat_recovery_requests
for select
to authenticated
using (
  exists (
    select 1 from public.flat_members fm
    where fm.flat_id = flat_recovery_requests.flat_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
  )
);

revoke all on public.flat_recovery_requests from authenticated;

-- Read-only recovery export request. The actual export endpoint can reuse the
-- existing report/statement data and should remain read-only.
create or replace function public.request_flat_recovery(p_flat_id uuid, p_type text default 'export', p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_state text;
  v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_type not in ('export','support_takeover') then raise exception 'invalid_recovery_type'; end if;

  if not exists (
    select 1 from public.flat_members fm
    where fm.flat_id = p_flat_id and fm.user_id = v_user and fm.status = 'active'
  ) then raise exception 'forbidden'; end if;

  v_state := private.flat_recovery_state(p_flat_id);

  if p_type = 'export' and v_state not in ('read_only_recovery', 'support_takeover_eligible') then
    raise exception 'recovery_export_not_available';
  end if;

  if p_type = 'support_takeover' and v_state <> 'support_takeover_eligible' then
    raise exception 'support_takeover_not_available';
  end if;

  insert into public.flat_recovery_requests(flat_id, requested_by, type, note)
  values (p_flat_id, v_user, p_type, nullif(trim(p_note), ''))
  returning id into v_id;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_flat_id, v_user, 'flat.recovery_requested', 'flat_recovery_request', v_id,
          jsonb_build_object('type', p_type, 'state', v_state));

  return v_id;
end;
$$;

revoke all on function public.request_flat_recovery(uuid,text,text) from public;
grant execute on function public.request_flat_recovery(uuid,text,text) to authenticated;

-- Make the read-only boundary explicit for direct member writes after grace.
create or replace function private.assert_member_write_allowed(p_flat_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.flat_recovery_state(p_flat_id) in ('read_only_recovery', 'support_takeover_eligible') then
    raise exception 'flat_read_only_subscription_expired';
  end if;
end;
$$;

revoke all on function private.assert_member_write_allowed(uuid) from public;
grant execute on function private.assert_member_write_allowed(uuid) to authenticated;
