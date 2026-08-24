-- Route flat settings through an authenticated, manager-authorized RPC.
create or replace function private.update_flat_settings_internal(
  p_flat_id uuid,
  p_name text,
  p_address text,
  p_month_start_day integer,
  p_meal_policy text,
  p_guest_meal_policy text,
  p_guest_free_limit integer,
  p_guest_approval_required boolean,
  p_allow_partial_settlement_payments boolean,
  p_allow_settlement_overpayments boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_admin(p_flat_id) then raise exception 'forbidden'; end if;
  if p_name is null or length(trim(p_name)) < 2 or length(trim(p_name)) > 100 then raise exception 'invalid_flat_name'; end if;
  if p_month_start_day < 1 or p_month_start_day > 28 then raise exception 'invalid_month_start_day'; end if;
  if p_meal_policy not in ('opt_in','opt_out') then raise exception 'invalid_meal_policy'; end if;
  if p_guest_meal_policy not in ('host_pays','shared_equal','shared_by_meals','free_limit') then raise exception 'invalid_guest_meal_policy'; end if;
  if p_guest_free_limit < 0 or p_guest_free_limit > 1000 then raise exception 'invalid_guest_free_limit'; end if;

  update public.flats
  set name=trim(p_name),
      address=nullif(trim(coalesce(p_address,'')),''),
      month_start_day=p_month_start_day,
      meal_policy=p_meal_policy,
      guest_meal_policy=p_guest_meal_policy,
      guest_free_limit=case when p_guest_meal_policy='free_limit' then p_guest_free_limit else 0 end,
      guest_approval_required=p_guest_approval_required,
      allow_partial_settlement_payments=p_allow_partial_settlement_payments,
      allow_settlement_overpayments=p_allow_settlement_overpayments,
      updated_at=now()
  where id=p_flat_id;
end;
$$;

create or replace function public.update_flat_settings(
  p_flat_id uuid,
  p_name text,
  p_address text,
  p_month_start_day integer,
  p_meal_policy text,
  p_guest_meal_policy text,
  p_guest_free_limit integer,
  p_guest_approval_required boolean,
  p_allow_partial_settlement_payments boolean,
  p_allow_settlement_overpayments boolean
)
returns void
language sql
set search_path = ''
as $$
  select private.update_flat_settings_internal(
    p_flat_id,
    p_name,
    p_address,
    p_month_start_day,
    p_meal_policy,
    p_guest_meal_policy,
    p_guest_free_limit,
    p_guest_approval_required,
    p_allow_partial_settlement_payments,
    p_allow_settlement_overpayments
  )
$$;

revoke all on function public.update_flat_settings(uuid,text,text,integer,text,text,integer,boolean,boolean,boolean) from public;
grant execute on function public.update_flat_settings(uuid,text,text,integer,text,text,integer,boolean,boolean,boolean) to authenticated;

-- No direct client writes to flats; create_flat() and update_flat_settings() are the controlled paths.
drop policy if exists flats_creator_insert on public.flats;
drop policy if exists flats_creator_update on public.flats;
