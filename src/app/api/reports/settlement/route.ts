import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WHATSAPP_BODY_LIMIT = 1800

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json({ error: 'cycleId is required' }, { status: 400 })
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership, error: membershipError } = await supabase
    .from('flat_members')
    .select('flat_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 })
  if (!membership) return NextResponse.json({ error: 'No active flat' }, { status: 403 })

  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select('id,flat_id,start_date,end_date,status')
    .eq('id', cycleId)
    .eq('flat_id', membership.flat_id)
    .maybeSingle()
  if (cycleError) return NextResponse.json({ error: cycleError.message }, { status: 500 })
  if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
  if (cycle.status !== 'closed') {
    return NextResponse.json({ error: 'Settlement report is available after the cycle is closed' }, { status: 409 })
  }

  const { data: settlements, error: settlementError } = await supabase
    .from('settlements')
    .select('total_meals,meal_cost,total_contribution,balance,opening_balance,user_id')
    .eq('cycle_id', cycle.id)
  if (settlementError) return NextResponse.json({ error: settlementError.message }, { status: 500 })

  const summary = (settlements ?? []).map((s) => ({ ...s, is_self: s.user_id === user.id }))
  const body = [
    'MealHisab BD',
    `${cycle.start_date} → ${cycle.end_date}`,
    '',
    ...summary.map(
      (s) =>
        `${s.is_self ? 'You' : 'Member'}: ${s.total_meals} meals | meal cost ৳${Number(s.meal_cost).toFixed(2)} | contribution ৳${Number(s.total_contribution).toFixed(2)} | balance ৳${Number(s.balance).toFixed(2)}`,
    ),
  ].join('\n')

  const encodedBodyLength = encodeURIComponent(body).length
  const whatsappUrl = encodedBodyLength <= WHATSAPP_BODY_LIMIT ? `https://wa.me/?text=${encodeURIComponent(body)}` : null

  return NextResponse.json({
    cycle,
    settlements: summary,
    shareText: body,
    whatsappUrl,
    exportFallback: whatsappUrl ? null : 'share-or-clipboard',
  })
}
