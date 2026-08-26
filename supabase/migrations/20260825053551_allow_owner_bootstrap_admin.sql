-- Permit only the flat owner to bootstrap themselves as the first admin.
-- All later admin/manager assignments still require an existing flat admin.
create or replace function private.guard_manager_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'member'
       and not private.is_flat_admin(new.flat_id)
       and not (
         new.role = 'admin'
         and new.user_id = auth.uid()
         and exists (
           select 1
           from public.flats f
           where f.id = new.flat_id
             and f.owner_id = auth.uid()
         )
         and not exists (
           select 1
           from public.flat_members fm
           where fm.flat_id = new.flat_id
         )
       ) then
      raise exception 'only_admins_can_assign_admin_or_manager_role';
    end if;
  elsif tg_op = 'UPDATE' then
    if not private.is_flat_admin(new.flat_id) then
      if new.flat_id <> old.flat_id
         or new.user_id <> old.user_id
         or new.role <> old.role
         or new.joined_at <> old.joined_at then
        raise exception 'only_admins_can_change_member_identity_role_or_joined_date';
      end if;
      if old.role = 'admin' and new.status = 'left' then
        raise exception 'only_admins_can_remove_admin';
      end if;
    end if;
  end if;
  return new;
end;
$$;
