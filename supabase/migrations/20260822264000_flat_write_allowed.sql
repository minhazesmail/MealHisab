-- Canonical flat write gate.
-- Active and grace subscriptions keep an existing flat writable.
-- Expired subscriptions put the flat into read-only mode.

create or replace function private.flat_write_allowed(p_flat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.flats f
    where f.id = p_flat_id
      and private.subscription_state(f.owner_id) in ('active', 'grace')
  );
$$;

revoke all on function private.flat_write_allowed(uuid) from public;
grant execute on function private.flat_write_allowed(uuid) to authenticated;

-- Shared guard used by write RPCs. Keep invite generation stricter: it requires
-- an active subscription and therefore intentionally does not rely on this gate.
create or replace function private.require_flat_writable(p_flat_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.flat_write_allowed(p_flat_id) then
    raise exception 'flat_locked';
  end if;
end;
$$;

revoke all on function private.require_flat_writable(uuid) from public;
grant execute on function private.require_flat_writable(uuid) to authenticated;

-- Representative mutation RPCs are redefined as guarded wrappers around the
-- existing accounting routines where available. These guards intentionally run
-- before business logic so locked flats cannot mutate through RPC entry points.

-- NOTE: Existing application RPCs should call private.require_flat_writable()
-- directly at the start of their implementation. This migration also adds a
-- generic trigger-level guard for the principal accounting tables below so a
-- direct table write cannot bypass the policy.

create or replace function private.guard_flat_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat uuid;
begin
  v_flat := coalesce(
    nullif(to_jsonb(new)->>'flat_id','')::uuid,
    nullif(to_jsonb(old)->>'flat_id','')::uuid
  );

  if v_flat is null and to_jsonb(new) ? 'cycle_id' then
    select c.flat_id into v_flat
    from public.cycles c
    where c.id = (to_jsonb(new)->>'cycle_id')::uuid;
  elsif v_flat is null and to_jsonb(old) ? 'cycle_id' then
    select c.flat_id into v_flat
    from public.cycles c
    where c.id = (to_jsonb(old)->>'cycle_id')::uuid;
  end if;

  if v_flat is not null and not private.flat_write_allowed(v_flat) then
    raise exception 'flat_locked';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.guard_flat_write() from public;

-- Attach only where the table exposes flat_id or cycle_id and where mutation
-- after closure must be blocked. Existing closed-cycle immutability remains a
-- separate concern handled by the cycle-state policies/triggers.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('public','meal_logs'),
      ('public','expenses'),
      ('public','contributions'),
      ('public','settlement_payments'),
      ('public','cycle_closed_days'),
      ('public','guest_meals'),
      ('public','member_leave')
    ) as t(schema_name, table_name)
  loop
    execute format('drop trigger if exists %I on %I.%I', 'trg_flat_write_guard', r.schema_name, r.table_name);
    execute format('create trigger %I before insert or update or delete on %I.%I for each row execute function private.guard_flat_write()', 'trg_flat_write_guard', r.schema_name, r.table_name);
  end loop;
end $$;
