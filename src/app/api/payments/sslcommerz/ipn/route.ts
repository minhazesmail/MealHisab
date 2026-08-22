import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateSslcommerzTransaction } from '@/lib/sslcommerz'

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export async function POST(request: Request) {
  const form = await request.formData()
  const payload = Object.fromEntries(form.entries())
  const tranId = String(payload.tran_id || '')
  const valId = String(payload.val_id || '')
  if (!tranId || !valId) return NextResponse.json({ error: 'Invalid payment notification' }, { status: 400 })

  const service = createServiceClient()
  const { data: payment } = await service.from('manager_payments')
    .select('id,user_id,amount,status,tran_id')
    .eq('tran_id', tranId)
    .maybeSingle()
  if (!payment) return NextResponse.json({ error: 'Unknown transaction' }, { status: 404 })
  if (payment.status === 'success') return NextResponse.json({ received: true })

  try {
    const validation = await validateSslcommerzTransaction(valId)
    const valid = validation.status === 'VALID' || validation.status === 'VALIDATED'
    const amountMatches = Number(validation.amount ?? 0).toFixed(2) === Number(payment.amount).toFixed(2)
    const currencyMatches = String(validation.currency || '').toUpperCase() === 'BDT'
    const tranMatches = String(validation.tran_id || '') === tranId

    if (!valid || !amountMatches || !currencyMatches || !tranMatches) {
      await service.rpc('apply_manager_payment', {
        p_tran_id: tranId,
        p_status: 'failed',
        p_val_id: valId,
        p_bank_tran_id: String(validation.bank_tran_id || payload.bank_tran_id || ''),
        p_card_type: String(validation.card_type || payload.card_type || ''),
        p_gateway_response: asRecord(validation),
      })
      return NextResponse.json({ error: 'Payment validation failed' }, { status: 400 })
    }

    const { error } = await service.rpc('apply_manager_payment', {
      p_tran_id: tranId,
      p_status: 'success',
      p_val_id: valId,
      p_bank_tran_id: String(validation.bank_tran_id || payload.bank_tran_id || ''),
      p_card_type: String(validation.card_type || payload.card_type || ''),
      p_gateway_response: asRecord(validation),
    })
    if (error) throw error

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[sslcommerz-ipn] processing failed', error)
    return NextResponse.json({ error: 'Could not process payment notification' }, { status: 500 })
  }
}
