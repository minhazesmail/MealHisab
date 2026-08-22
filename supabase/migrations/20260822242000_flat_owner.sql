-- Canonical flat ownership.
-- Every flat has exactly one owner/manager account.

alter table public.flats
  add column if not exists owner_id uuid references auth.users(id) on delete restrict;

update public.flats
   set owner_id = created_by
 where owner_id is null;

-- The historical created_by column remains for compatibility with older reports/audit data;
-- owner_id is now the canonical ownership field.
alter table public.flats
  alter column owner_id set not null;

create unique index if not exists flats_one_flat_per_owner
  on public.flats(owner_id);

create index if not exists flats_owner_id_idx
  on public.flats(owner_id);

-- Keep ownership immutable from ordinary clients. Flat creation assigns it in the trusted RPC.
drop policy if exists flats_update_owner_protected on public.flats;
create policy flats_update_owner_protected
on public.flats
for update to authenticated
using (private.is_flat_admin(id))
with check (owner_id = (select owner_id from public.flats where id = flats.id));

create or replace function public.create_flat(
  p_name text,
  p_address text default null,
  p_month_start_day integer default 1,
  p_meal_policy text default 'opt_out'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_start date;
  v_end date;
  v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not private.has_active_manager_plan(v_user) then raise exception 'manager_plan_required'; end if;
  if exists(select 1 from public.flats where owner_id = v_user) then raise exception 'manager_flat_limit_reached'; end if;
  if p_month_start_day < 1 or p_month_start_day > 28 then raise exception 'invalid_month_start_day'; end if;
  if p_meal_policy not in ('opt_in','opt_out') then raise exception 'invalid_meal_policy'; end if;

  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));

  insert into public.flats(name,address,month_start_day,meal_policy,invite_code,created_by,owner_id)
  values (trim(p_name), nullif(trim(p_address),''), p_month_start_day, p_meal_policy, v_code, v_user, v_user)
  returning id into v_flat;

  insert into public.invite_codes(flat_id,code,created_by,expires_at)
  values(v_flat,v_code,v_user,now() + interval '7 days');

  insert into public.flat_members(flat_id,user_id,role,status)
  values (v_flat,v_user,'admin','active');

  v_start := case when extract(day from current_date) >= p_month_start_day
    then make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day)
    else (make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day) - interval '1 month')::date end;
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  insert into public.cycles(flat_id,start_date,end_date,status)
  values (v_flat,v_start,v_end,'open');

  insert into public.cycle_members(cycle_id,user_id,active_from)
  select c.id,v_user,greatest(v_start,fm.joined_at)
    from public.cycles c
    join public.flat_members fm on fm.flat_id=c.flat_id and fm.user_id=v_user
   where c.id=(select id from public.cycles where flat_id=v_flat and status='open' order by created_at desc limit 1);

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_flat,v_user,'flat.created','flat',v_flat,jsonb_build_object('name',p_name,'owner_id',v_user,'plan','manager_99_bdt'));

  return v_flat;
end;
$$;

revoke all on function public.create_flat(text,text,integer,text) from public;
grant execute on function public.create_flat(text,text,integer,text) to authenticated;
