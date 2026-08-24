create or replace function private.saas_write_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat uuid;
  v_row jsonb;
begin
  v_row := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_flat := case
    when v_row->>'flat_id' is not null then (v_row->>'flat_id')::uuid
    when v_row->>'cycle_id' is not null then (select c.flat_id from public.cycles c where c.id=(v_row->>'cycle_id')::uuid)
    when v_row->>'settlement_id' is not null then (select s.flat_id from public.settlements s where s.id=(v_row->>'settlement_id')::uuid)
    else null
  end;
  if v_flat is not null and not private.flat_write_allowed(v_flat) then
    raise exception 'flat_locked';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
