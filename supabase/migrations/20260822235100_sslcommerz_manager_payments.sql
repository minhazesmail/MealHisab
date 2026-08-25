-- Replace Stripe-specific billing storage with SSLCOMMERZ transaction records.

alter table public.manager_subscriptions
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id;

alter table public.manager_subscriptions
  drop constraint if exists manager_subscriptions_status_check;
alter table public.manager_subscriptions
  add constraint manager_subscriptions_status_check
  check (status in ('inactive','pending','active','expired','failed'));

create table if not exists public.manager_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null default 'manager_99_bdt' check (plan_code = 'manager_99_bdt'),
  amount numeric(10,2) not null check (amount = 99.00),
  tran_id text not null unique,
  status text not null default 'pending' check (status in ('pending','success','failed','cancelled')),
  val_id text,
  bank_tran_id text,
  card_type text,
  currency text not null default 'BDT' check (currency = 'BDT'),
  gateway_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_manager_payments_user_created on public.manager_payments(user_id, created_at desc);
create index if not exists idx_manager_payments_status on public.manager_payments(status, created_at desc);

alter table public.manager_payments enable row level security;
revoke all on public.manager_payments from public;
grant select on public.manager_payments to authenticated;

drop policy if exists manager_payments_select_self on public.manager_payments;
create policy manager_payments_select_self on public.manager_payments
for select to authenticated using (user_id = auth.uid());

create or replace function public.create_manager_payment(p_plan_code text default 'manager_99_bdt', p_amount numeric default 99)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_tran_id text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_plan_code <> 'manager_99_bdt' or round(p_amount::numeric,2) <> 99.00 then raise exception 'invalid_manager_plan'; end if;

  v_tran_id := 'MH99' || to_char(clock_timestamp(),'YYMMDDHH24MISSMS') || substr(encode(gen_random_bytes(6),'hex'),1,8);
  v_tran_id := substr(v_tran_id,1,30);

  insert into public.manager_payments(user_id,plan_code,amount,tran_id)
  values(v_user,p_plan_code,99.00,v_tran_id);

  insert into public.manager_subscriptions(user_id,plan_code,status,current_period_end)
  values(v_user,p_plan_code,'pending',null)
  on conflict(user_id) do update set plan_code=excluded.plan_code,status='pending',updated_at=now();

  return v_tran_id;
end;
$$;
revoke all on function public.create_manager_payment(text,numeric) from public;
grant execute on function public.create_manager_payment(text,numeric) to authenticated;

create or replace function public.apply_manager_payment(
  p_tran_id text,
  p_status text,
  p_val_id text default null,
  p_bank_tran_id text default null,
  p_card_type text default null,
  p_gateway_response jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.manager_payments%rowtype;
  v_period_end timestamptz;
begin
  select * into v_payment from public.manager_payments where tran_id=p_tran_id for update;
  if not found then raise exception 'manager_payment_not_found'; end if;

  if p_status = 'success' then
    v_period_end := case
      when exists(select 1 from public.manager_subscriptions where user_id=v_payment.user_id and current_period_end is not null and current_period_end > now())
        then (select current_period_end + interval '30 days' from public.manager_subscriptions where user_id=v_payment.user_id)
      else now() + interval '30 days'
    end;

    update public.manager_payments
       set status='success',val_id=p_val_id,bank_tran_id=p_bank_tran_id,card_type=p_card_type,
           gateway_response=coalesce(p_gateway_response,'{}'::jsonb),paid_at=coalesce(paid_at,now())
     where id=v_payment.id and status <> 'success';

    update public.manager_subscriptions
       set status='active',current_period_end=v_period_end,cancel_at_period_end=false,updated_at=now()
     where user_id=v_payment.user_id;
  elsif p_status in ('failed','cancelled') then
    update public.manager_payments
       set status=p_status,val_id=p_val_id,bank_tran_id=p_bank_tran_id,card_type=p_card_type,
           gateway_response=coalesce(p_gateway_response,'{}'::jsonb)
     where id=v_payment.id and status='pending';
    update public.manager_subscriptions
       set status=case when current_period_end is not null and current_period_end > now() then status else 'inactive' end,
           updated_at=now()
     where user_id=v_payment.user_id;
  else
    raise exception 'invalid_payment_status';
  end if;
end;
$$;
revoke all on function public.apply_manager_payment(text,text,text,text,text,jsonb) from public;
grant execute on function public.apply_manager_payment(text,text,text,text,text,jsonb) to service_role;
