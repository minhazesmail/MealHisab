-- Canonical premium entitlement state helper.
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

-- Premium access gate: both active and grace retain manager capabilities.
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

-- Manager/admin authority is governed by the subscription helper, never by frontend state.
create or replace function private.is_flat_manager(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.subscription_state((select auth.uid())) in ('active', 'grace')
     and exists (
       select 1
       from public.flat_members fm
       where fm.flat_id = p_flat_id
         and fm.user_id = (select auth.uid())
         and fm.status = 'active'
         and fm.role in ('admin', 'manager')
     );
$$;

create or replace function private.is_flat_admin(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.subscription_state((select auth.uid())) in ('active', 'grace')
     and exists (
       select 1
       from public.flat_members fm
       where fm.flat_id = p_flat_id
         and fm.user_id = (select auth.uid())
         and fm.status = 'active'
         and fm.role = 'admin'
     );
$$;

grant execute on function private.is_flat_manager(uuid) to authenticated;
grant execute on function private.is_flat_admin(uuid) to authenticated;
