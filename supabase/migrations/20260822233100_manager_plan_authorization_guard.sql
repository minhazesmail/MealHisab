-- Make manager/admin authority contingent on a paid Manager Plan.
create or replace function private.is_flat_manager(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_manager_plan((select auth.uid()))
     and exists (
       select 1 from public.flat_members fm
        where fm.flat_id = p_flat_id
          and fm.user_id = (select auth.uid())
          and fm.status = 'active'
          and fm.role in ('admin','manager')
     );
$$;

create or replace function private.is_flat_admin(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_manager_plan((select auth.uid()))
     and exists (
       select 1 from public.flat_members fm
        where fm.flat_id = p_flat_id
          and fm.user_id = (select auth.uid())
          and fm.status = 'active'
          and fm.role = 'admin'
     );
$$;

grant execute on function private.is_flat_manager(uuid) to authenticated;
grant execute on function private.is_flat_admin(uuid) to authenticated;
