-- 4.5 Invite-code monthly bucket + 4.6 Bangladesh manual payment requests.

-- Keep created_month authoritative at the database layer using Asia/Dhaka.
create or replace function public.set_invite_code_month()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(trim(new.code));
  new.created_month := date_trunc(
    'month',
    (coalesce(new.created_at, now()) at time zone 'Asia/Dhaka')::date
  )::date;
  return new;
end;
$$;

drop trigger if exists invite_codes_set_month on public.invite_codes;
create trigger invite_codes_set_month
before insert on public.invite_codes
for each row
execute function public.set_invite_code_month();

-- Backfill existing rows before making the month bucket authoritative.
update public.invite_codes
set created_month = date_trunc(
  'month',
  (created_at at time zone 'Asia/Dhaka')::date
)::date
where created_month is null;

alter table public.invite_codes
  alter column created_month set not null;

-- 4.6 Manual Bangladesh payment verification.
-- These fields intentionally support bKash, Nagad and Rocket proof submission.
alter table public.payment_requests
  add column if not exists payment_method text,
  add column if not exists sender_number text,
  add column if not exists transaction_id text,
  add column if not exists note text,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reject_reason text,
  add column if not exists created_at timestamptz;

update public.payment_requests
set created_at = coalesce(created_at, requested_at, now())
where created_at is null;

alter table public.payment_requests
  alter column created_at set default now(),
  alter column created_at set not null;

-- Remove the gateway-only lifecycle and replace it with manual review states.
alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;
alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('pending','approved','rejected'));

-- Existing gateway fields remain available for future automated gateways.
-- New manual fields are the canonical user-facing payment proof.
alter table public.payment_requests
  drop constraint if exists payment_requests_payment_provider_check;

alter table public.payment_requests
  add constraint payment_requests_payment_method_check
  check (payment_method is null or payment_method in ('bkash','nagad','rocket','card','bank'));

create index if not exists payment_requests_user_idx
  on public.payment_requests(user_id);

create index if not exists payment_requests_status_idx
  on public.payment_requests(status);

-- Transaction IDs are unique when supplied, preventing duplicate payment proof.
create unique index if not exists payment_requests_transaction_id_uidx
  on public.payment_requests(transaction_id)
  where transaction_id is not null;

-- Canonical manual proof submission RPC. The amount remains fixed at ৳99 for the Manager Plan.
create or replace function public.create_manager_payment_request(
  p_payment_method text,
  p_sender_number text,
  p_transaction_id text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_subscription uuid;
  v_payment uuid;
  v_method text := lower(trim(p_payment_method));
  v_sender text := nullif(trim(p_sender_number), '');
  v_tx text := upper(nullif(trim(p_transaction_id), ''));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if v_method not in ('bkash','nagad','rocket') then raise exception 'invalid_payment_method'; end if;
  if v_sender is null then raise exception 'sender_number_required'; end if;
  if v_tx is null then raise exception 'transaction_id_required'; end if;

  insert into public.subscriptions(user_id, plan, status, payment_provider)
  values(v_user, 'manager_monthly', 'inactive', 'manual_bd')
  on conflict(user_id) do nothing;

  select id into v_subscription
  from public.subscriptions
  where user_id = v_user;

  insert into public.payment_requests(
    user_id,
    subscription_id,
    plan,
    amount,
    currency,
    payment_method,
    sender_number,
    transaction_id,
    note,
    status,
    payment_provider,
    requested_at,
    created_at,
    updated_at
  ) values (
    v_user,
    v_subscription,
    'manager_monthly',
    99.00,
    'BDT',
    v_method,
    v_sender,
    v_tx,
    nullif(trim(p_note), ''),
    'pending',
    'manual_bd',
    now(),
    now(),
    now()
  ) returning id into v_payment;

  return v_payment;
exception
  when unique_violation then
    raise exception 'payment_transaction_already_submitted';
end;
$$;

grant execute on function public.create_manager_payment_request(text,text,text,text) to authenticated;

-- Manager/admin review RPC. Approval activates the subscription for 30 days;
-- rejection records an explicit reason without changing entitlement.
create or replace function public.review_manager_payment_request(
  p_payment_request_id uuid,
  p_decision text,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = '' as $$
declare
  v_reviewer uuid := auth.uid();
  v_payment public.payment_requests%rowtype;
  v_subscription uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_reviewer is null then raise exception 'not_authenticated'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision'; end if;

  select pr.* into v_payment
  from public.payment_requests pr
  join public.flats f on f.owner_id = v_reviewer
  where pr.id = p_payment_request_id
  for update;

  if v_payment.id is null then raise exception 'payment_request_not_found'; end if;
  if v_payment.status <> 'pending' then raise exception 'payment_request_already_reviewed'; end if;

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
end;
$$;

grant execute on function public.review_manager_payment_request(uuid,text,text) to authenticated;

revoke all on function public.create_manager_payment_request(text,text,text,text) from public;
grant execute on function public.create_manager_payment_request(text,text,text,text) to authenticated;
revoke all on function public.review_manager_payment_request(uuid,text,text) from public;
grant execute on function public.review_manager_payment_request(uuid,text,text) to authenticated;
