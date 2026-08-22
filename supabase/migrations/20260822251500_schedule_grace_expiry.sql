-- Run regularly (via Supabase pg_cron or an external scheduler) to materialize
-- subscriptions.expired after the seven-day grace window.
-- The helper itself remains time-based, so access is correct even between runs.
create extension if not exists pg_cron;

select cron.schedule(
  'mealhisab-expire-manager-grace',
  '15 * * * *',
  $$select public.expire_grace_subscriptions();$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'mealhisab-expire-manager-grace'
);
