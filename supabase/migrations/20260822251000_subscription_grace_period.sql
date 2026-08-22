-- Canonical 3-state subscription helper: active, grace, expired.
create schema if not exists private;

create or replace function private.subscription_state(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when exists (
        select 1
        from public.subscriptions s
        where s.user_id = p_user
          and s.status in ('active', 'trialing')
          and s.current_period_end > now()
      ) then 'active'

      when exists (
        select 1
        from public.subscriptions s
        where s.user_id = p_user
          and s.status in ('active', 'trialing', 'past_due')
          and s.current_period_end <= now()
          and s.current_period_end > now() - interval '7 days'
      ) then 'grace'

      else 'expired'
    end;
$$;

revoke all on function private.subscription_state(uuid) from public;
grant execute on function private.subscription_state(uuid) to authenticated;

-- Premium access continues during the seven-day payment grace period.
create or replace function private.has_active_manager_plan(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.subscription_state(p_user_id) in ('active', 'grace');
$$;

grant execute on function private.has_active_manager_plan(uuid) to authenticated;

-- Return the number of whole days remaining in the grace window, when applicable.
create or replace function private.subscription_grace_days_remaining(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    ceil(extract(epoch from (
      (select max(s.current_period_end)
         from public.subscriptions s
        where s.user_id = p_user
          and s.status in ('active', 'trialing', 'past_due')
          and s.current_period_end <= now()
          and s.current_period_end > now() - interval '7 days')
      + interval '7 days' - now()
    )) / 86400)::integer
  );
$$;

grant execute on function private.subscription_grace_days_remaining(uuid) to authenticated;

-- Expiry enforcement hook: subscriptions past the seven-day grace window become expired.
create or replace function public.expire_grace_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where status in ('active', 'trialing', 'past_due')
     and current_period_end is not null
     and current_period_end <= now() - interval '7 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_grace_subscriptions() to service_role;
