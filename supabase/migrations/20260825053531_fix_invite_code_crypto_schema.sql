-- private.generate_invite_code() uses an empty search_path, so extension functions
-- must be schema-qualified. Without this, create_flat fails before onboarding completes.
create or replace function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_raw bytea;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i integer;
  v_pos integer;
begin
  v_raw := extensions.gen_random_bytes(8);
  for i in 0..7 loop
    v_pos := (get_byte(v_raw, i) % length(v_alphabet)) + 1;
    v_code := v_code || substr(v_alphabet, v_pos, 1);
  end loop;
  return v_code;
end;
$$;

revoke all on function private.generate_invite_code() from public;
