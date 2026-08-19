-- Explicit contribution date (defaults to local calendar day via application; DB default for backfill)
alter table public.contributions
  add column if not exists date date;

-- Backfill from created_at in Asia/Dhaka when possible
update public.contributions
set date = (created_at at time zone 'Asia/Dhaka')::date
where date is null;

alter table public.contributions
  alter column date set default (timezone('Asia/Dhaka', now()))::date;

alter table public.contributions
  alter column date set not null;

create index if not exists idx_contributions_cycle_date
  on public.contributions (cycle_id, date desc);
