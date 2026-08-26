-- Change the Manager Plan price for new manual Bangladesh payment requests to ৳49 BDT.
-- Existing payment requests keep their original amount and remain reviewable.

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
  v_sub uuid;
  v_payment uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_payment_method not in ('bkash','nagad','rocket') then raise exception 'invalid_payment_method'; end if;
  if nullif(trim(p_sender_number),'') is null then raise exception 'sender_number_required'; end if;
  if nullif(trim(p_transaction_id),'') is null then raise exception 'transaction_id_required'; end if;

  insert into public.subscriptions(user_id,plan,status,payment_provider)
  values(v_user,'manager_monthly','inactive','manual_bd')
  on conflict(user_id,plan) do nothing;

  select id into v_sub
  from public.subscriptions
  where user_id=v_user and plan='manager_monthly'
  for update;

  if exists(
    select 1 from public.payment_requests
    where transaction_id=trim(p_transaction_id)
  ) then
    raise exception 'payment_transaction_already_submitted';
  end if;

  insert into public.payment_requests(
    user_id,subscription_id,plan,amount,currency,
    payment_method,sender_number,transaction_id,note,status,payment_provider
  ) values(
    v_user,v_sub,'manager_monthly',49,'BDT',
    p_payment_method,trim(p_sender_number),trim(p_transaction_id),nullif(trim(p_note),''),'pending','manual_bd'
  ) returning id into v_payment;

  return v_payment;
end;
$$;
