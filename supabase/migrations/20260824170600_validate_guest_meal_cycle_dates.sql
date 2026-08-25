create or replace function public.record_guest_meal(p_cycle_id uuid, p_meal_date date, p_meal_type text, p_guest_count integer, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_pending boolean;
  v_id uuid;
  v_start date;
  v_end date;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id,start_date,end_date into v_flat,v_start,v_end from public.cycles where id=p_cycle_id and status='open';
  if v_flat is null then raise exception 'open_cycle_not_found'; end if;
  if p_meal_date<v_start or p_meal_date>v_end then raise exception 'guest_meal_date_outside_cycle'; end if;
  if not exists(select 1 from public.flat_members where flat_id=v_flat and user_id=v_user and status='active') then raise exception 'not_active_member'; end if;
  if p_guest_count<1 or p_guest_count>100 then raise exception 'invalid_guest_count'; end if;
  if p_meal_type not in('lunch','dinner') then raise exception 'invalid_guest_meal_type'; end if;
  v_pending:=coalesce((select guest_approval_required from public.flats where id=v_flat),false);
  insert into public.guest_meals(flat_id,cycle_id,host_user_id,meal_date,meal_type,guest_count,note,status,created_by,approved_by,approved_at)
  values(v_flat,p_cycle_id,v_user,p_meal_date,p_meal_type,p_guest_count,nullif(trim(p_note),''),case when v_pending then 'pending' else 'approved' end,v_user,case when v_pending then null else v_user end,case when v_pending then null else now() end)
  on conflict(cycle_id,host_user_id,meal_date,meal_type)
  do update set guest_count=excluded.guest_count,note=excluded.note,status=excluded.status,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.record_guest_meal(uuid,date,text,integer,text) from public, anon;
grant execute on function public.record_guest_meal(uuid,date,text,integer,text) to authenticated;
