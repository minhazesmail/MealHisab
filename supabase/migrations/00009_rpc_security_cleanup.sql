-- Keep privileged implementations in the private schema and expose only security-invoker RPC wrappers.
-- This preserves auth/RBAC checks while avoiding public SECURITY DEFINER endpoints.

create or replace function private.leave_flat_internal(p_flat_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_role text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select role into v_role from public.flat_members where flat_id=p_flat_id and user_id=v_user and status='active' for update;
  if v_role is null then raise exception 'not_active_member'; end if;
  if v_role='admin' and not exists(select 1 from public.flat_members where flat_id=p_flat_id and status='active' and role='admin' and user_id<>v_user) then
    raise exception 'admin_must_transfer_admin_role_before_leaving';
  end if;
  update public.flat_members set status='left',left_at=current_date where flat_id=p_flat_id and user_id=v_user;
end;
$$;

create or replace function public.leave_flat(p_flat_id uuid)
returns void language sql security invoker set search_path = '' as $$ select private.leave_flat_internal(p_flat_id) $$;
revoke all on function public.leave_flat(uuid) from public;
grant execute on function public.leave_flat(uuid) to authenticated;
grant execute on function private.leave_flat_internal(uuid) to authenticated;

create or replace function private.set_cycle_closed_day_internal(p_cycle_id uuid,p_date date,p_reason text default 'Mess closed')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_flat uuid; v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id=p_cycle_id and status='open';
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.cycles where id=p_cycle_id and p_date between start_date and end_date) then raise exception 'date_outside_cycle'; end if;
  insert into public.cycle_closed_days(cycle_id,date,reason,created_by)
  values(p_cycle_id,p_date,coalesce(nullif(trim(p_reason),''),'Mess closed'),v_user)
  on conflict(cycle_id,date) do update set reason=excluded.reason,created_by=excluded.created_by returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_cycle_closed_day(p_cycle_id uuid,p_date date,p_reason text default 'Mess closed')
returns uuid language sql security invoker set search_path = '' as $$ select private.set_cycle_closed_day_internal(p_cycle_id,p_date,p_reason) $$;
revoke all on function public.set_cycle_closed_day(uuid,date,text) from public;
grant execute on function public.set_cycle_closed_day(uuid,date,text) to authenticated;
grant execute on function private.set_cycle_closed_day_internal(uuid,date,text) to authenticated;

create or replace function private.remove_cycle_closed_day_internal(p_cycle_id uuid,p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_flat uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id into v_flat from public.cycles where id=p_cycle_id;
  if v_flat is null or not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  delete from public.cycle_closed_days where cycle_id=p_cycle_id and date=p_date;
end;
$$;

create or replace function public.remove_cycle_closed_day(p_cycle_id uuid,p_date date)
returns void language sql security invoker set search_path = '' as $$ select private.remove_cycle_closed_day_internal(p_cycle_id,p_date) $$;
revoke all on function public.remove_cycle_closed_day(uuid,date) from public;
grant execute on function public.remove_cycle_closed_day(uuid,date) to authenticated;
grant execute on function private.remove_cycle_closed_day_internal(uuid,date) to authenticated;

create or replace function private.record_settlement_payment_internal(p_settlement_id uuid,p_amount numeric,p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_settlement record; v_direction text; v_paid numeric(14,2); v_outstanding numeric(14,2); v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_amount<=0 then raise exception 'invalid_payment_amount'; end if;
  select s.* into v_settlement from public.settlements s where s.id=p_settlement_id for update;
  if v_settlement.id is null then raise exception 'settlement_not_found'; end if;
  if not private.is_flat_manager(v_settlement.flat_id) then raise exception 'forbidden'; end if;
  if v_settlement.balance=0 then raise exception 'settlement_already_balanced'; end if;
  v_direction:=case when v_settlement.balance>0 then 'payout' else 'collection' end;
  select coalesce(sum(amount),0)::numeric(14,2) into v_paid from public.settlement_payments where settlement_id=p_settlement_id and direction=v_direction;
  v_outstanding:=round(abs(v_settlement.balance)-v_paid,2);
  if p_amount>v_outstanding then raise exception 'payment_exceeds_outstanding_balance'; end if;
  insert into public.settlement_payments(settlement_id,cycle_id,flat_id,user_id,direction,amount,note,recorded_by)
  values(p_settlement_id,v_settlement.cycle_id,v_settlement.flat_id,v_settlement.user_id,v_direction,round(p_amount,2),nullif(trim(p_note),''),v_user)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_settlement_payment(p_settlement_id uuid,p_amount numeric,p_note text default null)
returns uuid language sql security invoker set search_path = '' as $$ select private.record_settlement_payment_internal(p_settlement_id,p_amount,p_note) $$;
revoke all on function public.record_settlement_payment(uuid,numeric,text) from public;
grant execute on function public.record_settlement_payment(uuid,numeric,text) to authenticated;
grant execute on function private.record_settlement_payment_internal(uuid,numeric,text) to authenticated;
