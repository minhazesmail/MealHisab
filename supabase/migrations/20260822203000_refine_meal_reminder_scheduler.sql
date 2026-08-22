-- Refine reminder timing and negative-balance detection.
create or replace function public.generate_meal_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_local timestamp := now() at time zone 'Asia/Dhaka';
  v_today date := v_local::date;
  v_time time := v_local::time;
  v_created integer := 0;
  r record;
  v_lunch_logged boolean;
  v_dinner_logged boolean;
  v_balance numeric(14,2);
  v_title text;
  v_body text;
  v_should_send boolean;
begin
  for r in
    select fm.user_id, fm.flat_id,
           coalesce(np.meal_reminders_enabled,true) enabled,
           coalesce(np.reminder_mode,'when_not_logged') reminder_mode,
           coalesce(np.reminder_time,'11:00'::time) reminder_time,
           coalesce(np.quiet_hours_enabled,false) quiet_enabled,
           coalesce(np.quiet_start,'22:00'::time) quiet_start,
           coalesce(np.quiet_end,'07:00'::time) quiet_end,
           coalesce(np.language,'en') language,
           c.id cycle_id, c.end_date
      from public.flat_members fm
      join public.cycles c on c.flat_id=fm.flat_id and c.status='open'
      left join public.notification_preferences np on np.user_id=fm.user_id
     where fm.status='active'
  loop
    if not r.enabled then continue; end if;
    if r.quiet_enabled and (
      (r.quiet_start < r.quiet_end and v_time >= r.quiet_start and v_time < r.quiet_end) or
      (r.quiet_start > r.quiet_end and (v_time >= r.quiet_start or v_time < r.quiet_end))
    ) then continue; end if;

    select exists(select 1 from public.meal_logs where cycle_id=r.cycle_id and user_id=r.user_id and date=v_today and meal_type='lunch' and count>0) into v_lunch_logged;
    select exists(select 1 from public.meal_logs where cycle_id=r.cycle_id and user_id=r.user_id and date=v_today and meal_type='dinner' and count>0) into v_dinner_logged;

    -- "Every day" means one reminder at the user's selected time.
    if r.reminder_mode='daily' and v_time between r.reminder_time - interval '15 minutes' and r.reminder_time + interval '15 minutes' then
      if r.language='bn' then
        v_title := 'আজকের খাবার লগ করুন';
        v_body := 'আজকের লাঞ্চ ও ডিনার লগ করতে MealHisab খুলুন।';
      else
        v_title := 'Log today’s meals';
        v_body := 'Open MealHisab and log today’s lunch and dinner.';
      end if;
      insert into public.notifications(flat_id,user_id,type,title,body)
      select r.flat_id,r.user_id,'meal_reminder',v_title,v_body
      where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.type='meal_reminder' and n.created_at::date=v_today and n.title=v_title);
      if found then v_created := v_created + 1; end if;
    end if;

    -- "Only when not logged" uses natural meal-specific windows so the reminder remains actionable.
    if r.reminder_mode='when_not_logged' and v_time between time '10:30' and time '11:30' and not v_lunch_logged then
      if r.language='bn' then v_title := 'দুপুরের খাবারের রিমাইন্ডার'; v_body := 'আজকের দুপুরের খাবার ১১টার আগে লগ করুন। খাচ্ছেন?';
      else v_title := 'Lunch reminder'; v_body := 'Log today’s lunch before 11:00 AM.'; end if;
      insert into public.notifications(flat_id,user_id,type,title,body)
      select r.flat_id,r.user_id,'meal_reminder',v_title,v_body
      where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.type='meal_reminder' and n.created_at::date=v_today and n.title=v_title);
      if found then v_created := v_created + 1; end if;
    end if;

    if r.reminder_mode='when_not_logged' and v_time between time '17:30' and time '18:30' and not v_dinner_logged then
      if r.language='bn' then v_title := 'রাতের খাবারের রিমাইন্ডার'; v_body := 'আপনার আজকের ডিনার এখনো লগ হয়নি। খাবেন?';
      else v_title := 'Dinner reminder'; v_body := 'You have not logged dinner. Are you eating?'; end if;
      insert into public.notifications(flat_id,user_id,type,title,body)
      select r.flat_id,r.user_id,'meal_reminder',v_title,v_body
      where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.type='meal_reminder' and n.created_at::date=v_today and n.title=v_title);
      if found then v_created := v_created + 1; end if;
    end if;

    -- Closing reminder: notify two days before the cycle ends.
    if r.end_date - v_today between 0 and 2 and v_time between time '20:00' and time '20:30' then
      if r.language='bn' then v_title := 'মাস শেষ হচ্ছে'; v_body := 'মেস ম্যানেজার শিগগিরই মাস বন্ধ করবেন। আপনার খাবারের হিসাব দেখে নিন।';
      else v_title := 'Mess manager is closing the month'; v_body := 'Please check your meals before the current cycle is closed.'; end if;
      insert into public.notifications(flat_id,user_id,type,title,body)
      select r.flat_id,r.user_id,'system',v_title,v_body
      where not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.flat_id=r.flat_id and n.created_at::date=v_today and n.title=v_title);
      if found then v_created := v_created + 1; end if;
    end if;

    -- Current-balance reminder uses the same balance helper used by the leave-with-debt guard.
    if v_time between time '20:00' and time '20:30' then
      begin
        v_balance := private.current_open_cycle_member_balance(r.flat_id, r.user_id);
      exception when undefined_function then
        v_balance := 0;
      end;
      if coalesce(v_balance,0) < -1.00 then
        if r.language='bn' then v_title := 'আপনার ব্যালেন্স ঋণাত্মক'; v_body := 'আপনার ব্যালেন্স ঋণাত্মক। অনুগ্রহ করে প্রয়োজনীয় কন্ট্রিবিউশন দিন।';
        else v_title := 'Your balance is negative'; v_body := 'Your balance is negative. Please contribute to the mess.'; end if;
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
