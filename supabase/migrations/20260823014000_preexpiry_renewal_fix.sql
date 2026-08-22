-- Managers may submit the next ৳99 renewal before expiry, during grace,
-- or later after a prolonged lapse. Approval applies the canonical activation rule:
-- active period -> +30 days; expired/grace/inactive -> now +30 days.
create or replace function public.create_manual_manager_payment(
  p_payment_method text,
  p_sender_number text,
  p_transaction_id text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_subscription uuid;
  v_payment uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_payment_method not in ('bkash','nagad','rocket') then raise exception 'invalid_payment_method'; end if;
  if nullif(trim(p_sender_number), '') is null then raise exception 'sender_number_required'; end if;
  if nullif(trim(p_transaction_id), '') is null then raise exception 'transaction_id_required'; end if;

  insert into public.subscriptions(user_id, plan, status, payment_provider)
  values(v_user, 'manager_monthly', 'inactive', 'manual_bd')
  on conflict(user_id, plan) do nothing;

  select id into v_subscription
  from public.subscriptions
  where user_id = v_user and plan = 'manager_monthly'
  for update;

  if exists (
    select 1
    from public.payment_requests
    where transaction_id = trim(p_transaction_id)
      and status = 'pending'
  ) then
    raise exception 'payment_transaction_already_submitted';
  end if;

  insert into public.payment_requests(
    user_id, subscription_id, plan, amount, currency,
    payment_method, sender_number, transaction_id, note,
    status, payment_provider
  )
  values(
    v_user, v_subscription, 'manager_monthly', 99.00, 'BDT',
    p_payment_method, trim(p_sender_number), trim(p_transaction_id), nullif(trim(p_note), ''),
    'pending', 'manual_bd'
  )
  returning id into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.create_manual_manager_payment(text,text,text,text) from public;
grant execute on function public.create_manual_manager_payment(text,text,text,text) to authenticated;

-- The admin approval path continues to use private.activate_manager_subscription(),
-- which extends an active period by 30 days and restarts an expired period from now().
