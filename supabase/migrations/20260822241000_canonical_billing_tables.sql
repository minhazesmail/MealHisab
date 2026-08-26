-- Canonical billing model for MealHisab.
-- subscriptions = entitlement state; payment_requests = individual gateway attempts/results.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'manager_monthly' check (plan = 'manager_monthly'),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_status_end_idx
  on public.subscriptions(status, current_period_end);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan text not null default 'manager_monthly' check (plan = 'manager_monthly'),
  amount numeric(12,2) not null default 99.00 check (amount = 99.00),
  currency text not null default 'BDT' check (currency = 'BDT'),
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled','expired')),
  payment_provider text not null default 'sslcommerz',
  transaction_id text unique not null,
  validation_id text unique,
  gateway_response jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists payment_requests_user_idx
  on public.payment_requests(user_id, requested_at desc);

create index if not exists payment_requests_status_idx
  on public.payment_requests(status, requested_at desc);

alter table public.subscriptions enable row level security;
alter table public.payment_requests enable row level security;

revoke all on public.subscriptions from public;
revoke all on public.payment_requests from public;
grant select on public.subscriptions to authenticated;
grant select on public.payment_requests to authenticated;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self
on public.subscriptions for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists payment_requests_select_self on public.payment_requests;
create policy payment_requests_select_self
on public.payment_requests for select to authenticated
using (user_id = (select auth.uid()));

-- Backfill the canonical subscription row from the legacy entitlement table when present.
insert into public.subscriptions(
  user_id, plan, status, current_period_start, current_period_end,
  cancel_at_period_end, payment_provider, created_at, updated_at
)
select
  ms.user_id,
  'manager_monthly',
  case
    when ms.status in ('active','trialing') and (ms.current_period_end is null or ms.current_period_end > now()) then 'active'
    when ms.status in ('past_due','unpaid') then 'past_due'
    when ms.status in ('canceled','incomplete_expired') then 'canceled'
    when ms.current_period_end is not null and ms.current_period_end <= now() then 'expired'
    else 'inactive'
  end,
  null,
  ms.current_period_end,
  coalesce(ms.cancel_at_period_end, false),
  'sslcommerz',
  coalesce(ms.created_at, now()),
  coalesce(ms.updated_at, now())
from public.manager_subscriptions ms
on conflict (user_id) do update set
  status = excluded.status,
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = excluded.cancel_at_period_end,
  payment_provider = 'sslcommerz',
  updated_at = now();

-- Canonical paid-entitlement check. This is the only billing gate used by Manager RBAC.
create or replace function private.has_active_manager_plan(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan = 'manager_monthly'
      and s.status in ('active','trialing')
      and s.current_period_end is not null
      and s.current_period_end > now()
  );
$$;

grant execute on function private.has_active_manager_plan(uuid) to authenticated;

-- The legacy SSLCommerz migration defined this same signature with a text return
-- value. PostgreSQL cannot change a function return type with CREATE OR REPLACE,
-- so retire the legacy implementation before defining the canonical UUID-returning API.
drop function if exists public.create_manager_payment(text,numeric);

-- Create a payment request atomically. Gateway code receives only transaction_id.
create function public.create_manager_payment(
  p_plan_code text default 'manager_monthly',
  p_amount numeric default 99.00
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_subscription uuid;
  v_payment uuid;
  v_transaction text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_plan_code <> 'manager_monthly' then raise exception 'invalid_plan'; end if;
  if p_amount <> 99.00 then raise exception 'invalid_amount'; end if;

  insert into public.subscriptions(user_id, plan, status, payment_provider)
  values(v_user, 'manager_monthly', 'inactive', 'sslcommerz')
  on conflict(user_id) do nothing;

  select id into v_subscription from public.subscriptions where user_id = v_user;

  v_transaction := 'MH' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS') || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  insert into public.payment_requests(
    user_id, subscription_id, plan, amount, currency, status,
    payment_provider, transaction_id
  ) values(
    v_user, v_subscription, 'manager_monthly', 99.00, 'BDT', 'pending',
    'sslcommerz', v_transaction
  ) returning id into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.create_manager_payment(text,numeric) from public;
grant execute on function public.create_manager_payment(text,numeric) to authenticated;

-- Gateway success path: only server-side validated payments may activate entitlement.
create or replace function public.activate_manager_subscription(
  p_payment_request_id uuid,
  p_validation_id text,
  p_gateway_response jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_payment public.payment_requests%rowtype;
  v_now timestamptz := now();
  v_start timestamptz;
  v_end timestamptz;
  v_subscription uuid;
begin
  select * into v_payment
    from public.payment_requests
   where id = p_payment_request_id
   for update;

  if v_payment.id is null then raise exception 'payment_request_not_found'; end if;
  if v_payment.payment_provider <> 'sslcommerz' then raise exception 'invalid_payment_provider'; end if;
  if v_payment.status = 'paid' then return v_payment.subscription_id; end if;

  select id into v_subscription from public.subscriptions where id = v_payment.subscription_id for update;

  v_start := case
    when v_subscription is not null and (select current_period_end from public.subscriptions where id=v_subscription) is not null
         and (select current_period_end from public.subscriptions where id=v_subscription) > v_now
      then (select current_period_end from public.subscriptions where id=v_subscription)
    else v_now
  end;
  v_end := v_start + interval '30 days';

  update public.payment_requests
     set status = 'paid',
         validation_id = p_validation_id,
         gateway_response = coalesce(p_gateway_response, '{}'::jsonb),
         paid_at = coalesce(paid_at, v_now),
         updated_at = v_now
   where id = p_payment_request_id;

  update public.subscriptions
     set status = 'active',
         current_period_start = v_start,
         current_period_end = v_end,
         cancel_at_period_end = false,
         payment_provider = 'sslcommerz',
         updated_at = v_now
   where id = v_subscription;

  return v_subscription;
end;
$$;

revoke all on function public.activate_manager_subscription(uuid,text,jsonb) from public;
grant execute on function public.activate_manager_subscription(uuid,text,jsonb) to service_role;

-- Gateway failure/cancel path.
create or replace function public.fail_manager_payment(
  p_payment_request_id uuid,
  p_status text default 'failed',
  p_gateway_response jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = '' as $$
begin
  if p_status not in ('failed','cancelled','expired') then raise exception 'invalid_payment_status'; end if;
  update public.payment_requests
     set status = p_status,
         gateway_response = coalesce(p_gateway_response, '{}'::jsonb),
         updated_at = now()
   where id = p_payment_request_id
     and status <> 'paid';
end;
$$;

revoke all on function public.fail_manager_payment(uuid,text,jsonb) from public;
grant execute on function public.fail_manager_payment(uuid,text,jsonb) to service_role;
