begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

-- Stable fixtures: two tenants, one manager + one member in tenant A,
-- and one manager in tenant B. All IDs are deterministic for readable failures.
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

insert into public.flats (id, name, invite_code, created_by, owner_id)
values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A', 'TENANTA001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Tenant B', 'TENANTB001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003');

insert into public.flat_members (flat_id, user_id, role, status)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'admin', 'active');

insert into public.cycles (id, flat_id, start_date, end_date, status)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-08-01', '2026-08-31', 'open'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-07-01', '2026-07-31', 'closed'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '2026-08-01', '2026-08-31', 'open');

insert into public.meal_logs (id, flat_id, cycle_id, user_id, date, meal_type, count, created_by)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-08-10', 'lunch', 1, '00000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-08-11', 'lunch', 1, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2026-07-10', 'lunch', 1, '00000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '2026-08-10', 'lunch', 1, '00000000-0000-0000-0000-000000000003');

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

select like(
  pg_get_functiondef('private.close_cycle_internal(uuid)'::regprocedure),
  '%opening_balance+contribution-meal_cost-guest_charge%',
  'guest charges reduce closing balance in cycle close'
);

reset role;
select * from finish();
rollback;
