-- Edge-case hardening:
-- * active subscriptions have normal write access
-- * grace subscriptions retain normal flat usage but cannot create invites
-- * expired subscriptions are read-only for members and managers
-- * cancel is at period end
-- * flats are archived, never hard-deleted by managers
-- * invite redemption is blocked for locked/archived flats

-- Ensure flats have an explicit lifecycle status.
alter table public.flats
  add column if not exists status text not null default 'active';

alter table public.flats
  drop constraint if exists flats_status_check;

alter table public.flats
  add constraint flats_status_check
  check (status in ('active','archived'));

create index if not exists flats_status_idx on public.flats(status);

-- State helper for UI and server actions.
create or replace function private.flat_lifecycle_state(p_flat_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce(f.status, 'active') = 'archived' then 'archived'
    when private.subscription_state(f.owner_id) = 'expired' then 'locked'
    else private.subscription_state(f.owner_id)
  end
  from public.flats f
  where f.id = p_flat_id;
$$;

revoke all on function private.flat_lifecycle_state(uuid) from public;
grant execute on function private.flat_lifecycle_state(uuid) to authenticated;

create or replace function private.flat_write_allowed(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.flats f
    where f.id = p_flat_id
      and coalesce(f.status, 'active') = 'active'
      and private.subscription_state(f.owner_id) in ('active', 'grace')
  );
$$;

revoke all on function private.flat_write_allowed(uuid) from public;
grant execute on function private.flat_write_allowed(uuid) to authenticated;

-- Canonical manager cancellation: never revoke already-paid access.
create or replace function public.cancel_manager_subscription()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  update public.subscriptions
  set cancel_at_period_end = true,
      updated_at = now()
  where user_id = v_user
    and plan = 'manager_monthly'
    and current_period_end > now();

  if not found then
    raise exception 'subscription_not_active';
  end if;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  select f.id, v_user, 'manager_subscription.cancel_scheduled', 'subscription', s.id,
         jsonb_build_object('period_end', s.current_period_end)
  from public.subscriptions s
  join public.flats f on f.owner_id = s.user_id
  where s.user_id = v_user
    and s.plan = 'manager_monthly'
  order by f.created_at desc
  limit 1;
end;
$$;

revoke all on function public.cancel_manager_subscription() from public;
grant execute on function public.cancel_manager_subscription() to authenticated;

-- Do not allow activation/renewal to leave a cancellation flag behind.
create or replace function private.activate_manager_subscription(p_user_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_subscription public.subscriptions;
begin
  if p_user_id is null then raise exception 'user_required'; end if;

  insert into public.subscriptions(user_id,plan,status,current_period_start,current_period_end,cancel_at_period_end,updated_at)
  values (p_user_id,'manager_monthly','active',v_now,v_now + interval '30 days',false,v_now)
  on conflict (user_id,plan)
  do update set
    status='active',
    current_period_start=case when public.subscriptions.current_period_end > v_now then public.subscriptions.current_period_start else v_now end,
    current_period_end=case when public.subscriptions.current_period_end > v_now then public.subscriptions.current_period_end + interval '30 days' else v_now + interval '30 days' end,
    cancel_at_period_end=false,
    updated_at=v_now
  returning * into v_subscription;

  return v_subscription;
end;
$$;

revoke all on function private.activate_manager_subscription(uuid) from public;
grant execute on function private.activate_manager_subscription(uuid) to authenticated;
grant execute on function private.activate_manager_subscription(uuid) to service_role;

-- Archive only: preserve accounting and audit history.
create or replace function public.archive_flat(p_flat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select exists(select 1 from public.flats where id=p_flat_id and owner_id=v_user and status='active') into v_exists;
  if not v_exists then raise exception 'flat_archive_forbidden'; end if;

  update public.flats set status='archived' where id=p_flat_id;
  update public.flat_members set status='left', left_at=coalesce(left_at, now()) where flat_id=p_flat_id and status='active';

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_flat_id,v_user,'flat.archived','flat',p_flat_id,jsonb_build_object('archived_at',now()));
end;
$$;

revoke all on function public.archive_flat(uuid) from public;
grant execute on function public.archive_flat(uuid) to authenticated;

-- Strengthen join: archive/locked flats cannot accept members.
create or replace function public.join_flat_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.invite_codes%rowtype;
  v_owner uuid;
  v_flat_status text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_invite
  from public.invite_codes
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'invalid_invite_code'; end if;
  if v_invite.status = 'revoked' then raise exception 'invite_code_revoked'; end if;
  if v_invite.status = 'used' then raise exception 'invite_code_already_used'; end if;

  if v_invite.expires_at < now() then
    update public.invite_codes set status='expired' where id=v_invite.id;
    raise exception 'invite_code_expired';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    update public.invite_codes set status='used' where id=v_invite.id;
    raise exception 'invite_code_already_used';
  end if;

  select owner_id,status into v_owner,v_flat_status from public.flats where id=v_invite.flat_id;
  if v_flat_status = 'archived' then raise exception 'flat_archived'; end if;
  if private.subscription_state(v_owner) = 'expired' then raise exception 'flat_locked_subscription_expired'; end if;

  if exists(select 1 from public.flat_members where flat_id=v_invite.flat_id and user_id=v_user and status='active') then
    return v_invite.flat_id;
  end if;

  insert into public.flat_members(flat_id,user_id,role,status)
  values(v_invite.flat_id,v_user,'member','active')
  on conflict(flat_id,user_id) do update set status='active',left_at=null;

  insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
  select c.id,v_user,greatest(c.start_date,current_date),0
  from public.cycles c
  where c.flat_id=v_invite.flat_id and c.status='open'
  order by c.start_date desc limit 1
  on conflict(cycle_id,user_id) do nothing;

  update public.invite_codes
  set used_count=used_count+1,
      used_by=v_user,
      used_at=now(),
      status=case when used_count+1 >= max_uses then 'used' else status end
  where id=v_invite.id;

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_invite.flat_id,v_user,'member.joined','flat_member',v_user,jsonb_build_object('code',v_invite.code));

  return v_invite.flat_id;
end;
$$;

revoke all on function public.join_flat_with_code(text) from public;
grant execute on function public.join_flat_with_code(text) to authenticated;

-- User-facing messages for common edge cases.
create or replace function private.edge_case_message(p_key text)
returns text
language sql
immutable
as $$
  select case p_key
    when 'flat_already_exists' then 'You already have a flat. One manager account can create only one flat.'
    when 'subscription_required' then 'An active Manager Plan is required for this action.'
    when 'flat_locked_subscription_expired' then 'This flat is currently locked because the manager subscription expired.'
    when 'flat_archived' then 'This flat is archived and is no longer accepting members.'
    when 'invite_code_expired' then 'This invite code has expired. Please ask your manager for a new code.'
    when 'invite_code_already_used' then 'This invite code has already been used.'
    when 'monthly_invite_limit_reached' then 'You have reached your monthly limit of 10 invite codes. The limit resets on the 1st of next month.'
    when 'subscription_not_active' then 'Your Manager Plan is not active.'
    when 'flat_archive_forbidden' then 'Only the flat owner can archive this flat.'
    else 'Something went wrong. Please try again.'
  end;
$$;
