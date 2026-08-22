-- Minimal platform-admin control surface.
-- Mutations are protected by auth.users.raw_app_meta_data.role = platform_admin.

alter table public.flats
  add column if not exists manual_unlock_until timestamptz,
  add column if not exists invite_limit_override_until timestamptz;

create or replace function private.assert_platform_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if coalesce((select raw_app_meta_data ->> 'role' from auth.users where id = v_user), '') <> 'platform_admin' then
    raise exception 'platform_admin_required';
  end if;
  return v_user;
end;
$$;

revoke all on function private.assert_platform_admin() from public;
grant execute on function private.assert_platform_admin() to authenticated;

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
      and (
        private.subscription_state(f.owner_id) in ('active', 'grace')
        or coalesce(f.manual_unlock_until, 'epoch'::timestamptz) > now()
      )
  );
$$;

grant execute on function private.flat_write_allowed(uuid) to authenticated;

create or replace function private.admin_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.assert_platform_admin();
begin
  return jsonb_build_object(
    'pending_payments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select pr.id, pr.user_id, pr.amount, pr.currency, pr.payment_method, pr.sender_number, pr.transaction_id, pr.note, pr.status, pr.created_at
      from public.payment_requests pr
      where pr.status = 'pending'
      order by pr.created_at desc
      limit 100
    ) x), '[]'::jsonb),
    'approved_payments', coalesce((select count(*) from public.payment_requests where status='approved'),0),
    'rejected_payments', coalesce((select count(*) from public.payment_requests where status='rejected'),0),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (
      select s.id, s.user_id, s.plan, s.status, s.current_period_start, s.current_period_end, s.updated_at
      from public.subscriptions s
      order by s.updated_at desc
      limit 100
    ) x), '[]'::jsonb),
    'flats', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select f.id, f.name, f.owner_id, f.status, f.manual_unlock_until, f.invite_limit_override_until,
             private.subscription_state(f.owner_id) as subscription_state,
             (select count(*) from public.flat_members fm where fm.flat_id=f.id and fm.status='active') as member_count,
             (select count(*) from public.invite_codes ic where ic.flat_id=f.id) as invite_count
      from public.flats f
      order by f.created_at desc
      limit 100
    ) x), '[]'::jsonb),
    'invite_usage', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_month desc, x.generated_count desc) from (
      select ic.created_by, ic.created_month, count(*) as generated_count, count(*) filter (where ic.status='active') as active_count
      from public.invite_codes ic
      group by ic.created_by, ic.created_month
      order by ic.created_month desc, generated_count desc
      limit 100
    ) x), '[]'::jsonb),
    'viewer', v_user
  );
end;
$$;

revoke all on function private.admin_dashboard_snapshot() from public;
grant execute on function private.admin_dashboard_snapshot() to authenticated;

create or replace function public.admin_extend_subscription(p_user_id uuid, p_days integer default 30)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := private.assert_platform_admin(); begin
  if p_days < 1 or p_days > 365 then raise exception 'invalid_extension_days'; end if;
  update public.subscriptions
  set status='active',
      current_period_start = case when current_period_end > now() then current_period_start else now() end,
      current_period_end = case when current_period_end > now() then current_period_end + make_interval(days => p_days) else now() + make_interval(days => p_days) end,
      cancel_at_period_end=false,
      updated_at=now()
  where user_id=p_user_id and plan='manager_monthly';
  if not found then raise exception 'subscription_not_found'; end if;
  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  select f.id, v_admin, 'admin.subscription_extended', 'subscription', s.id, jsonb_build_object('days',p_days)
  from public.subscriptions s join public.flats f on f.owner_id=s.user_id
  where s.user_id=p_user_id and s.plan='manager_monthly'
  order by f.created_at desc limit 1;
end; $$;

grant execute on function public.admin_extend_subscription(uuid, integer) to authenticated;

create or replace function public.admin_cancel_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := private.assert_platform_admin(); begin
  update public.subscriptions set status='canceled', cancel_at_period_end=true, updated_at=now() where user_id=p_user_id and plan='manager_monthly';
  if not found then raise exception 'subscription_not_found'; end if;
  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  select f.id, v_admin, 'admin.subscription_canceled', 'subscription', s.id, '{}'::jsonb
  from public.subscriptions s join public.flats f on f.owner_id=s.user_id
  where s.user_id=p_user_id and s.plan='manager_monthly'
  order by f.created_at desc limit 1;
end; $$;

grant execute on function public.admin_cancel_subscription(uuid) to authenticated;

create or replace function public.admin_unlock_flat(p_flat_id uuid, p_days integer default 7)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := private.assert_platform_admin(); begin
  if p_days < 1 or p_days > 30 then raise exception 'invalid_unlock_days'; end if;
  update public.flats set manual_unlock_until = now() + make_interval(days => p_days) where id=p_flat_id;
  if not found then raise exception 'flat_not_found'; end if;
  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values(p_flat_id,v_admin,'admin.flat_unlocked','flat',p_flat_id,jsonb_build_object('days',p_days));
end; $$;

grant execute on function public.admin_unlock_flat(uuid, integer) to authenticated;

create or replace function public.admin_override_invite_limit(p_flat_id uuid, p_days integer default 31)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := private.assert_platform_admin(); begin
  if p_days < 1 or p_days > 90 then raise exception 'invalid_override_days'; end if;
  update public.flats set invite_limit_override_until = now() + make_interval(days => p_days) where id=p_flat_id;
  if not found then raise exception 'flat_not_found'; end if;
  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values(p_flat_id,v_admin,'admin.invite_limit_overridden','flat',p_flat_id,jsonb_build_object('days',p_days));
end; $$;

grant execute on function public.admin_override_invite_limit(uuid, integer) to authenticated;

-- The monthly invite cap is bypassed only while the platform-admin override is active.
create or replace function private.invite_limit_overridden(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.flats where id=p_flat_id and invite_limit_override_until > now());
$$;

grant execute on function private.invite_limit_overridden(uuid) to authenticated;
