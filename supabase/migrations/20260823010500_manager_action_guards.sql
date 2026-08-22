-- Canonical manager lifecycle RPCs used by Next.js Server Actions.

create or replace function public.cancel_manager_subscription()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  update public.subscriptions
  set cancel_at_period_end = true,
      updated_at = now()
  where user_id = v_user
    and plan = 'manager_monthly'
    and current_period_end > now();

  if not found then raise exception 'subscription_not_active'; end if;
end;
$$;

revoke all on function public.cancel_manager_subscription() from public;
grant execute on function public.cancel_manager_subscription() to authenticated;

create or replace function public.archive_flat(p_flat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat public.flats%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_flat
  from public.flats
  where id = p_flat_id
    and owner_id = v_user
  for update;

  if v_flat.id is null then raise exception 'forbidden'; end if;

  -- Archiving is intentionally soft: preserve all historical accounting data.
  begin
    execute 'update public.flats set status = $1 where id = $2' using 'archived', p_flat_id;
  exception when undefined_column then
    raise exception 'flat_archive_not_supported';
  end;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_flat_id, v_user, 'flat.archived', 'flat', p_flat_id, jsonb_build_object('name', v_flat.name));
end;
$$;

revoke all on function public.archive_flat(uuid) from public;
grant execute on function public.archive_flat(uuid) to authenticated;
