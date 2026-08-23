'use server'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

const rateLimits: Record<string, Ratelimit> | null = redis
  ? {
      joinFlat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:join-flat', ephemeralCache: new Map() }),
      joinFlatWithCode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:join-flat-code', ephemeralCache: new Map() }),
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
      requestVacation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:request-vacation', ephemeralCache: new Map() }),
      managerSetVacation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'mealhisab:manager-vacation', ephemeralCache: new Map() }),
      approveVacation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:approve-vacation', ephemeralCache: new Map() }),
      cancelVacation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:cancel-vacation', ephemeralCache: new Map() }),
      adminAction: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'mealhisab:admin', ephemeralCache: new Map() }),
      updateAuditVisibility: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'mealhisab:audit-visibility', ephemeralCache: new Map() }),
      submitManualManagerPayment: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:manager-payment', ephemeralCache: new Map() }),
      submitManagerPaymentRequest: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:manager-payment-request', ephemeralCache: new Map() }),
      renewSubscription: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:renew', ephemeralCache: new Map() }),
      cancelSubscription: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:cancel-subscription', ephemeralCache: new Map() }),
      archiveFlat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'mealhisab:archive-flat', ephemeralCache: new Map() }),
      generateInviteCode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:generate-invite', ephemeralCache: new Map() }),
      revokeInviteCode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:revoke-invite', ephemeralCache: new Map() }),
      recordGuestMeal: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:record-guest-meal', ephemeralCache: new Map() }),
      approveGuestMeal: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:approve-guest-meal', ephemeralCache: new Map() }),
      cancelGuestMeal: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'mealhisab:cancel-guest-meal', ephemeralCache: new Map() }),
      updateGuestMealPolicy: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'mealhisab:guest-policy', ephemeralCache: new Map() }),
      configureCycleMode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'mealhisab:festival-cycle', ephemeralCache: new Map() }),
      flatRecovery: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'mealhisab:flat-recovery', ephemeralCache: new Map() }),
    }
  : null

async function clientIp() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')
  return requestHeaders.get('x-real-ip') ?? requestHeaders.get('x-vercel-forwarded-for') ?? forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

type RateLimitName = string

export async function enforceRateLimit(name: RateLimitName, identifier?: string) {
  if (!rateLimits) {
    if (process.env.NODE_ENV !== 'production') return
    throw new Error('Rate limiting is not configured on the server')
  }
  const limiter = rateLimits[name]
  if (!limiter) throw new Error(`Rate limiter '${name}' is not configured`) 
  const key = identifier ?? (await clientIp())
  const result = await limiter.limit(key)
  if (result.success) return
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`)
}

export async function enforceIpRateLimit(name: RateLimitName) {
  return enforceRateLimit(name, await clientIp())
}
