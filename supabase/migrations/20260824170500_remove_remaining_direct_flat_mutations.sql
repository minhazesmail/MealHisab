-- Keep flats readable to authenticated members, but remove direct client mutation paths.
drop policy if exists flats_manager_update on public.flats;
drop policy if exists flats_admin_delete on public.flats;
