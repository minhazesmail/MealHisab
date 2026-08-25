begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

create temporary table fixture_ids(key text primary key, id uuid) on commit drop;

insert into auth.users (id, email, phone, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'manager-a@example.test', '+8801700000001', '{"full_name":"Manager A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'member-a@example.test',  '+8801700000002', '{"full_name":"Member A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'manager-b@example.test', '+8801700000003', '{"full_name":"Manager B"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, phone, full_name)
values
  ('00000000-0000-0000-0000-000000000001', '+8801700000001', 'Manager A'),
  ('00000000-0000-0000-0000-000000000002', '+8801700000002', 'Member A'),
  ('00000000-0000-0000-0000-000000000003', '+8801700000003', 'Manager B')
on conflict (id) do update set phone = excluded.phone, full_name = excluded.full_name;

insert into public.subscriptions(user_id, plan, status, current_period_start, current_period_end)
values
  ('00000000-0000-0000-0000-000000000001', 'manager_monthly', 'active', now(), now() + interval '30 days'),
  ('00000000-0000-0000-0000-000000000003', 'manager_monthly', 'active', now(), now() + interval '30 days');

-- Create both tenants through the same RPC the application uses. This verifies
-- invite generation and first-admin bootstrapping before any RLS assertions run.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
insert into fixture_ids(key, id)
select 'flat_a', public.create_flat('Tenant A', null, 1, 'opt_in');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
insert into fixture_ids(key, id)
select 'flat_b', public.create_flat('Tenant B', null, 1, 'opt_in');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
insert into public.flat_members(flat_id, user_id, role, status)
select id, '00000000-0000-0000-0000-000000000002', 'member', 'active'
from fixture_ids where key = 'flat_a';

insert into fixture_ids(key, id)
select 'cycle_a_open', c.id
from public.cycles c join fixture_ids f on f.key='flat_a' and f.id=c.flat_id
where c.status='open' limit 1;

insert into fixture_ids(key, id)
select 'cycle_b_open', c.id
from public.cycles c join fixture_ids f on f.key='flat_b' and f.id=c.flat_id
where c.status='open' limit 1;

insert into public.cycles(id, flat_id, start_date, end_date, status)
select '20000000-0000-0000-0000-000000000002', id, '2026-07-01', '2026-07-31', 'closed'
from fixture_ids where key='flat_a';

insert into public.meal_logs (id, flat_id, cycle_id, user_id, date, meal_type, count, created_by)
select '30000000-0000-0000-0000-000000000001', fa.id, ca.id, '00000000-0000-0000-0000-000000000002', '2026-08-10', 'lunch', 1, '00000000-0000-0000-0000-000000000002'
from fixture_ids fa, fixture_ids ca where fa.key='flat_a' and ca.key='cycle_a_open'
union all
select '30000000-0000-0000-0000-000000000002', fa.id, ca.id, '00000000-0000-0000-0000-000000000001', '2026-08-11', 'lunch', 1, '00000000-0000-0000-0000-000000000001'
from fixture_ids fa, fixture_ids ca where fa.key='flat_a' and ca.key='cycle_a_open'
union all
select '30000000-0000-0000-0000-000000000003', fa.id, '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2026-07-10', 'lunch', 1, '00000000-0000-0000-0000-000000000002'
from fixture_ids fa where fa.key='flat_a'
union all
select '30000000-0000-0000-0000-000000000004', fb.id, cb.id, '00000000-0000-0000-0000-000000000003', '2026-08-10', 'lunch', 1, '00000000-0000-0000-0000-000000000003'
from fixture_ids fb, fixture_ids cb where fb.key='flat_b' and cb.key='cycle_b_open';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select results_eq(
  $$select count(*)::bigint from public.flats$$,
  array[1::bigint],
  'manager sees only their own tenant'
);

select results_eq(
  $$select count(*)::bigint from public.meal_logs$$,
  array[3::bigint],
  'tenant A manager cannot read tenant B meal rows'
);

select results_eq(
  $$with changed as (
      update public.meal_logs
         set count = 2
       where id = '30000000-0000-0000-0000-000000000001'
       returning id
    ) select count(*)::bigint from changed$$,
  array[1::bigint],
  'manager can edit another member meal in an open cycle'
);

select results_eq(
  $$with changed as (
      update public.meal_logs
         set count = 2
       where id = '30000000-0000-0000-0000-000000000003'
       returning id
    ) select count(*)::bigint from changed$$,
  array[0::bigint],
  'closed-cycle meal rows are immutable'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

select results_eq(
  $$with changed as (
      update public.meal_logs
         set count = 3
       where id = '30000000-0000-0000-0000-000000000002'
       returning id
    ) select count(*)::bigint from changed$$,
  array[0::bigint],
  'member cannot edit another members meal'
);

select results_eq(
  $$with changed as (
      update public.meal_logs
         set count = 3
       where id = '30000000-0000-0000-0000-000000000001'
       returning id
    ) select count(*)::bigint from changed$$,
  array[1::bigint],
  'member can edit their own meal in an open cycle'
);

reset role;
select like(
  pg_get_functiondef('private.close_cycle_internal(uuid)'::regprocedure),
  '%opening_balance+contribution-meal_cost-guest_charge%',
  'guest charges reduce closing balance in cycle close'
);

select * from finish();
rollback;
