-- Run reminder generation every 30 minutes using Supabase pg_cron.
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'mealhisab-meal-reminders') then
    perform cron.schedule('mealhisab-meal-reminders', '*/30 * * * *', 'select public.generate_meal_reminders();');
  end if;
end
$$;
