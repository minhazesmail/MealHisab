-- Verify contribution.date migration status
-- Run in Supabase SQL Editor → expect one row with ok indicators

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contributions'
      and column_name = 'date'
  ) as column_exists,
  (
    select is_nullable = 'NO'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contributions'
      and column_name = 'date'
  ) as is_not_null,
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contributions'
      and column_name = 'date'
  ) as column_default,
  (
    select count(*)::int
    from public.contributions
    where date is null
  ) as rows_missing_date,
  (
    select count(*)::int
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_contributions_cycle_date'
  ) as index_exists;

-- Summary: all good when column_exists=true, is_not_null=true, rows_missing_date=0, index_exists>=1
