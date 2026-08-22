import { NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit, enforceIpRateLimit } from '@/lib/rate-limit'

const schema = z.object({ key: z.string().trim().min(5).max(320) })

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    await enforceIpRateLimit('sendOtp')
    await enforceRateLimit('sendOtp', body.key.toLowerCase())
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Too many OTP requests. Please try again later.'
    const status = message.startsWith('Too many requests') ? 429 : 400
    return NextResponse.json({ ok: false, message }, { status })
  }
}
