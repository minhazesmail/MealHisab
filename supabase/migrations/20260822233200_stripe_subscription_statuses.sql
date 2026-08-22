-- Keep the subscription status enum aligned with Stripe's current subscription lifecycle.
alter table public.manager_subscriptions
  drop constraint if exists manager_subscriptions_status_check;

alter table public.manager_subscriptions
  add constraint manager_subscriptions_status_check
  check (status in ('inactive','trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'));
