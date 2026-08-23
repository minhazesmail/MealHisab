import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) return new NextResponse('Supabase is not configured', { status: 500 })

  const supabase = createAdminClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.rpc('generate_meal_reminders')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, created: Number(data ?? 0) })
}
