-- Manual Bangladesh payment MVP.
-- Platform administrators approve or reject payment proofs; managers never self-approve.

create or replace function private.is_platform_admin(p_user uuid default (select auth.uid()))
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin', false)
     and p_user = (select auth.uid());
$$;

revoke all on function private.is_platform_admin(uuid) from public;
grant execute on function private.is_platform_admin(uuid) to authenticated;

-- Manual submission RPC. The fixed Manager Plan amount is always ৳99 BDT.
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

  if private.subscription_state(v_user) not in ('expired','grace') then
    raise exception 'subscription_still_active';
  end if;

  insert into public.subscriptions(user_id, plan, status, payment_provider)
  values(v_user, 'manager_monthly', 'inactive', 'manual_bd')
  on conflict(user_id) do nothing;

  select id into v_subscription
  from public.subscriptions
  where user_id = v_user
  for update;

  if exists (
    select 1 from public.payment_requests
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

-- Replace the previous self-review rule: only a platform admin can approve/reject.
create or replace function public.review_manager_payment_request(
  p_payment_request_id uuid,
  p_decision text,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := auth.uid();
  v_payment public.payment_requests%rowtype;
  v_subscription uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_reviewer is null then raise exception 'not_authenticated'; end if;
  if not private.is_platform_admin(v_reviewer) then raise exception 'platform_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision'; end if;

  select * into v_payment
  from public.payment_requests
  where id = p_payment_request_id
  for update;

  if v_payment.id is null then raise exception 'payment_request_not_found'; end if;
  if v_payment.status <> 'pending' then raise exception 'payment_request_already_reviewed'; end if;
  if v_payment.amount <> 99.00 or v_payment.currency <> 'BDT' or v_payment.plan <> 'manager_monthly' then
    raise exception 'invalid_manager_payment';
  end if;

  if p_decision = 'rejected' then
    update public.payment_requests
    set status = 'rejected',
        reviewed_by = v_reviewer,
        reviewed_at = now(),
        reject_reason = nullif(trim(p_reject_reason), ''),
        updated_at = now()
    where id = p_payment_request_id;
    return;
  end if;

  select id into v_subscription
  from public.subscriptions
  where id = v_payment.subscription_id
  for update;

  if v_subscription is null then raise exception 'subscription_not_found'; end if;

  v_start := case
    when (select current_period_end from public.subscriptions where id=v_subscription) is not null
      and (select current_period_end from public.subscriptions where id=v_subscription) > now()
      then (select current_period_end from public.subscriptions where id=v_subscription)
    else now()
  end;
  v_end := v_start + interval '30 days';

  update public.payment_requests
  set status = 'approved',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      reject_reason = null,
      updated_at = now()
  where id = p_payment_request_id;

  update public.subscriptions
  set status = 'active',
      current_period_start = v_start,
      current_period_end = v_end,
      cancel_at_period_end = false,
      payment_provider = 'manual_bd',
      updated_at = now()
  where id = v_subscription;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  select f.id, v_reviewer, 'manager_payment.approved', 'payment_request', v_payment.id,
         jsonb_build_object('user_id', v_payment.user_id, 'amount', v_payment.amount, 'payment_method', v_payment.payment_method, 'transaction_id', v_payment.transaction_id)
  from public.flats f
  where f.owner_id = v_payment.user_id;
end;
$$;

revoke all on function public.review_manager_payment_request(uuid,text,text) from public;
grant execute on function public.review_manager_payment_request(uuid,text,text) to authenticated;

-- Payment-request RLS: users see only their own submissions; platform admins can review all.
alter table public.payment_requests enable row level security;

drop policy if exists payment_requests_select_self on public.payment_requests;
drop policy if exists payment_requests_admin_select on public.payment_requests;
create policy payment_requests_select_self
on public.payment_requests for select to authenticated
using (user_id = (select auth.uid()));

create policy payment_requests_admin_select
on public.payment_requests for select to authenticated
using (private.is_platform_admin((select auth.uid())));

revoke insert, update, delete on public.payment_requests from authenticated;
