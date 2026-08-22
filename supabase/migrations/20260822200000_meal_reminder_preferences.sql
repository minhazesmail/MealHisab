-- Meal reminder preferences + scheduled in-app reminder generation.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  meal_reminders_enabled boolean not null default true,
  reminder_mode text not null default 'when_not_logged' check (reminder_mode in ('daily','when_not_logged')),
  reminder_time time not null default '11:00',
  quiet_hours_enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  language text not null default 'en' check (language in ('en','bn')),
  updated_at timestamptz not null default now()
);

create or replace function public.ensure_notification_preferences()
returns public.notification_preferences
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.notification_preferences;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  insert into public.notification_preferences(user_id) values(v_user)
    on conflict (user_id) do nothing;
  select * into v_row from public.notification_preferences where user_id=v_user;
  return v_row;
end;
$$;

create or replace function public.update_notification_preferences(
  p_meal_reminders_enabled boolean,
  p_reminder_mode text,
  p_reminder_time time,
  p_quiet_hours_enabled boolean,
  p_quiet_start time,
  p_quiet_end time,
  p_language text
)
returns public.notification_preferences
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.notification_preferences;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_reminder_mode not in ('daily','when_not_logged') then raise exception 'invalid_reminder_mode'; end if;
  if p_language not in ('en','bn') then raise exception 'invalid_notification_language'; end if;
  insert into public.notification_preferences(user_id) values(v_user) on conflict(user_id) do nothing;
  update public.notification_preferences
     set meal_reminders_enabled=p_meal_reminders_enabled,
         reminder_mode=p_reminder_mode,
         reminder_time=p_reminder_time,
         quiet_hours_enabled=p_quiet_hours_enabled,
         quiet_start=p_quiet_start,
         quiet_end=p_quiet_end,
         language=p_language,
         updated_at=now()
   where user_id=v_user
   returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update public.notifications set read_at=now()
   where id=p_notification_id and user_id=v_user;
end;
$$;

create or replace function public.generate_meal_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_local timestamp := v_now at time zone 'Asia/Dhaka';
  v_today date := v_local::date;
  v_time time := v_local::time;
  v_created integer := 0;
  r record;
  v_cycle record;
  v_lunch_logged boolean;
  v_dinner_logged boolean;
  v_title text;
  v_body text;
  v_type text;
  v_key text;
begin
  for r in
    select fm.user_id, fm.flat_id, coalesce(np.meal_reminders_enabled,true) enabled,
           coalesce(np.reminder_mode,'when_not_logged') reminder_mode,
           coalesce(np.reminder_time,'11:00'::time) reminder_time,
           coalesce(np.quiet_hours_enabled,false) quiet_enabled,
           coalesce(np.quiet_start,'22:00'::time) quiet_start,
           coalesce(np.quiet_end,'07:00'::time) quiet_end,
           coalesce(np.language,'en') language,
           f.meal_policy, c.id cycle_id
      from public.flat_members fm
      join public.flats f on f.id=fm.flat_id
      join public.cycles c on c.flat_id=fm.flat_id and c.status='open'
      left join public.notification_preferences np on np.user_id=fm.user_id
     where fm.status='active'
  loop
    if not r.enabled then continue; end if;
    if r.quiet_enabled and (
      (r.quiet_start < r.quiet_end and v_time >= r.quiet_start and v_time < r.quiet_end) or
      (r.quiet_start > r.quiet_end and (v_time >= r.quiet_start or v_time < r.quiet_end))
    ) then continue; end if;

    select exists(select 1 from public.meal_logs ml where ml.cycle_id=r.cycle_id and ml.user_id=r.user_id and ml.date=v_today and ml.meal_type='lunch' and ml.count>0) into v_lunch_logged;
    select exists(select 1 from public.meal_logs ml where ml.cycle_id=r.cycle_id and ml.user_id=r.user_id and ml.date=v_today and ml.meal_type='dinner' and ml.count>0) into v_dinner_logged;

    -- Lunch reminder window: 10:30-11:30 Dhaka. Dinner reminder window: 17:30-18:30.
    if r.reminder_mode='daily' or (r.reminder_mode='when_not_logged' and not v_lunch_logged) then
      if v_time between time '10:30' and time '11:30' then
        v_type := 'meal_reminder';
        v_key := 'lunch:' || v_today::text;
        if r.language='bn' then
          v_title := 'দুপুরের খাবারের রিমাইন্ডার';
          v_body := 'আজকের দুপুরের খাবার ১১টার আগে লগ করুন। খাচ্ছেন?';
        else
          v_title := 'Lunch reminder';
          v_body := 'Log today’s lunch before 11:00 AM.';
        end if;
        insert into public.notifications(flat_id,user_id,type,title,body)
        select r.flat_id,r.user_id,v_type,v_title,v_body
        where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.type=v_type and n.created_at::date=v_today and n.body=v_body);
        if found then v_created := v_created + 1; end if;
      end if;
    end if;

    if r.reminder_mode='daily' or (r.reminder_mode='when_not_logged' and not v_dinner_logged) then
      if v_time between time '17:30' and time '18:30' then
        v_type := 'meal_reminder';
        if r.language='bn' then
          v_title := 'রাতের খাবারের রিমাইন্ডার';
          v_body := 'আপনার আজকের ডিনার এখনো লগ হয়নি। খাবেন?';
        else
          v_title := 'Dinner reminder';
          v_body := 'You have not logged dinner. Are you eating?';
        end if;
        insert into public.notifications(flat_id,user_id,type,title,body)
        select r.flat_id,r.user_id,v_type,v_title,v_body
        where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.type=v_type and n.created_at::date=v_today and n.body=v_body);
        if found then v_created := v_created + 1; end if;
      end if;
    end if;

    -- Daily balance reminder is generated once per day when the current cycle balance is negative.
    if v_time between time '20:00' and time '20:30' then
      if exists (
        select 1 from public.cycle_members cm
         where cm.cycle_id=r.cycle_id and cm.user_id=r.user_id and cm.opening_balance < 0
      ) then
        if r.language='bn' then
          v_title := 'আপনার ব্যালেন্স ঋণাত্মক';
          v_body := 'আপনার ব্যালেন্স ঋণাত্মক। অনুগ্রহ করে প্রয়োজনীয় কন্ট্রিবিউশন দিন।';
        else
          v_title := 'Your balance is negative';
          v_body := 'Your balance is negative. Please contribute to the mess.';
        end if;
        insert into public.notifications(flat_id,user_id,type,title,body)
        select r.flat_id,r.user_id,'system',v_title,v_body
        where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.created_at::date=v_today and n.title=v_title);
        if found then v_created := v_created + 1; end if;
      end if;
    end if;
  end loop;
  return v_created;
end;
$$;

alter table public.notification_preferences enable row level security;
grant select, insert, update on public.notification_preferences to authenticated;
drop policy if exists notification_preferences_self_select on public.notification_preferences;
create policy notification_preferences_self_select on public.notification_preferences for select to authenticated using (user_id=auth.uid());
drop policy if exists notification_preferences_self_insert on public.notification_preferences;
create policy notification_preferences_self_insert on public.notification_preferences for insert to authenticated with check (user_id=auth.uid());
drop policy if exists notification_preferences_self_update on public.notification_preferences;
create policy notification_preferences_self_update on public.notification_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

grant execute on function public.ensure_notification_preferences() to authenticated;
grant execute on function public.update_notification_preferences(boolean,text,time,boolean,time,time,text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
