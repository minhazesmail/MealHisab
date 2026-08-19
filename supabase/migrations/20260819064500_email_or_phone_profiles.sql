-- Allow profiles to be created for email-only auth users.
-- Phone remains unique when present, while email users store NULL.
alter table public.profiles
  alter column phone drop not null;

update public.profiles
set phone = null
where phone = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_name text;
begin
  v_phone := nullif(trim(coalesce(new.phone, '')), '');
  v_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
    'MealHisab User'
  );

  insert into public.profiles (id, full_name, phone)
  values (new.id, v_name, v_phone)
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to postgres, service_role;
