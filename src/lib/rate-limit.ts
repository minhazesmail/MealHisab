'use server'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

const rateLimits = redis
  ? {
      joinFlat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:join-flat', ephemeralCache: new Map() }),
      saveMeal: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'mealhisab:save-meal', ephemeralCache: new Map() }),
      closeCycle: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:close-cycle', ephemeralCache: new Map() }),
      createFlat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:create-flat', ephemeralCache: new Map() }),
      saveExpense: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'mealhisab:save-expense', ephemeralCache: new Map() }),
      saveContribution: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'mealhisab:save-contribution', ephemeralCache: new Map() }),
      leaveFlat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:leave-flat', ephemeralCache: new Map() }),
      setCycleClosedDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'mealhisab:set-closed-day', ephemeralCache: new Map() }),
      removeCycleClosedDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'mealhisab:remove-closed-day', ephemeralCache: new Map() }),
      recordSettlementPayment: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'mealhisab:settlement-payment', ephemeralCache: new Map() }),
      markNotificationRead: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'), prefix: 'mealhisab:notification-read', ephemeralCache: new Map() }),
      sendOtp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'mealhisab:send-otp', ephemeralCache: new Map() }),
    }
  : null

async function clientIp() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')
  return requestHeaders.get('x-real-ip') ?? requestHeaders.get('x-vercel-forwarded-for') ?? forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

type RateLimitName = keyof NonNullable<typeof rateLimits>

export async function enforceRateLimit(name: RateLimitName, identifier?: string) {
  if (!rateLimits) {
    if (process.env.NODE_ENV !== 'production') return
    throw new Error('Rate limiting is not configured on the server')
  }
  const key = identifier ?? (await clientIp())
  const result = await rateLimits[name].limit(key)
  if (result.success) return
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`)
}

export async function enforceIpRateLimit(name: RateLimitName) {
  return enforceRateLimit(name, await clientIp())
}
