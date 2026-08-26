-- Partial settlement payments and configurable overpayment policy.

alter table public.flats
  add column if not exists allow_partial_settlement_payments boolean not null default true,
  add column if not exists allow_settlement_overpayments boolean not null default false;

create or replace function public.update_settlement_payment_settings(
  p_flat_id uuid,
  p_allow_partial boolean,
  p_allow_overpayment boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  update public.flats
     set allow_partial_settlement_payments = p_allow_partial,
         allow_settlement_overpayments = p_allow_overpayment,
         updated_at = now()
   where id = p_flat_id;
end;
$$;

create or replace function private.record_settlement_payment_internal(
  p_settlement_id uuid,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settlement record;
  v_flat record;
  v_direction text;
  v_paid numeric(14,2);
  v_outstanding numeric(14,2);
  v_amount numeric(14,2) := round(p_amount,2);
  v_id uuid;
  v_next_cycle uuid;
  v_next_opening numeric(14,2);
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_payment_amount'; end if;

  select s.* into v_settlement
    from public.settlements s
   where s.id = p_settlement_id
   for update;
  if v_settlement.id is null then raise exception 'settlement_not_found'; end if;
  if not private.is_flat_manager(v_settlement.flat_id) then raise exception 'forbidden'; end if;

  select allow_partial_settlement_payments, allow_settlement_overpayments
    into v_flat
    from public.flats
   where id = v_settlement.flat_id;

  v_direction := case when v_settlement.balance > 0 then 'payout' else 'collection' end;
  select coalesce(sum(amount),0)::numeric(14,2)
    into v_paid
    from public.settlement_payments
   where settlement_id = p_settlement_id and direction = v_direction;

  v_outstanding := round(abs(v_settlement.balance) - v_paid, 2);

  if v_outstanding <= 0 and not v_flat.allow_settlement_overpayments then
    raise exception 'settlement_already_balanced';
  end if;

  if not v_flat.allow_settlement_overpayments and v_amount > greatest(v_outstanding,0) then
    raise exception 'payment_exceeds_outstanding_balance';
  end if;

  if not v_flat.allow_partial_settlement_payments and not v_flat.allow_settlement_overpayments and v_amount <> v_outstanding then
    raise exception 'partial_payment_not_allowed';
  end if;

  if not v_flat.allow_partial_settlement_payments and v_flat.allow_settlement_overpayments and v_amount < greatest(v_outstanding,0) then
    raise exception 'partial_payment_not_allowed';
  end if;

  insert into public.settlement_payments(
    settlement_id,cycle_id,flat_id,user_id,direction,amount,note,recorded_by
  ) values (
    p_settlement_id,v_settlement.cycle_id,v_settlement.flat_id,v_settlement.user_id,v_direction,
    v_amount,nullif(trim(p_note),''),v_user
  ) returning id into v_id;

  -- A settlement payment changes the member's carry-forward balance immediately.
  -- Positive balance = the flat owes the member; payout reduces it.
  -- Negative balance = the member owes the flat; collection reduces the debt.
  select c.id into v_next_cycle
    from public.cycles c
   where c.flat_id = v_settlement.flat_id
     and c.start_date = (select end_date + 1 from public.cycles where id = v_settlement.cycle_id)
     and c.status = 'open'
   limit 1;

  if v_next_cycle is not null then
    v_next_opening := case
      when v_settlement.balance >= 0 then round(v_settlement.balance - (
        select coalesce(sum(amount),0) from public.settlement_payments where settlement_id = p_settlement_id and direction = 'payout'
      ),2)
      else round(v_settlement.balance + (
        select coalesce(sum(amount),0) from public.settlement_payments where settlement_id = p_settlement_id and direction = 'collection'
      ),2)
    end;

    update public.cycle_members
       set opening_balance = v_next_opening
     where cycle_id = v_next_cycle and user_id = v_settlement.user_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.record_settlement_payment(
  p_settlement_id uuid,
  p_amount numeric,
  p_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.record_settlement_payment_internal(p_settlement_id,p_amount,p_note)
$$;

revoke all on function public.record_settlement_payment(uuid,numeric,text) from public;
grant execute on function public.record_settlement_payment(uuid,numeric,text) to authenticated;
revoke all on function public.update_settlement_payment_settings(uuid,boolean,boolean) from public;
grant execute on function public.update_settlement_payment_settings(uuid,boolean,boolean) to authenticated;
