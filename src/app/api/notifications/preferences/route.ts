import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULTS = {
  meal_reminders_enabled: true,
  reminder_mode: 'when_not_logged',
  reminder_time: '11:00',
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  language: 'en',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase.rpc('ensure_notification_preferences')
  if (error) return NextResponse.json({ error: 'Could not load reminder preferences.' }, { status: 500 })
  return NextResponse.json(data ?? DEFAULTS)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase.rpc('update_notification_preferences', {
    p_meal_reminders_enabled: Boolean(body.meal_reminders_enabled),
    p_reminder_mode: body.reminder_mode === 'daily' ? 'daily' : 'when_not_logged',
    p_reminder_time: body.reminder_time || '11:00',
    p_quiet_hours_enabled: Boolean(body.quiet_hours_enabled),
    p_quiet_start: body.quiet_start || '22:00',
    p_quiet_end: body.quiet_end || '07:00',
    p_language: body.language === 'bn' ? 'bn' : 'en',
  })
  if (error) return NextResponse.json({ error: 'Could not save reminder preferences.' }, { status: 400 })
  return NextResponse.json(data)
}
