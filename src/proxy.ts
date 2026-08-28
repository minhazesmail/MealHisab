import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const NONCE_ROUTE_PREFIXES = [
  '/activity',
  '/admin',
  '/billing',
  '/calendar',
  '/contributions',
  '/dashboard',
  '/expenses',
  '/invites',
  '/manager',
  '/meals',
  '/onboarding',
  '/reports',
  '/settings',
  '/settlements',
]

function needsNonce(pathname: string) {
  return NONCE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function createNonce() {
  return btoa(crypto.randomUUID())
}

function contentSecurityPolicy(nonce?: string) {
  const development = process.env.NODE_ENV !== 'production'
  const scriptSources = nonce
    ? ["'self'", `'nonce-${nonce}'`, ...(development ? ["'unsafe-eval'"] : [])]
    : ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])]

  const connectSources = ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']
  if (development) {
    connectSources.push('http://localhost:*', 'ws://localhost:*', 'http://127.0.0.1:*', 'ws://127.0.0.1:*')
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.sslcommerz.com https://*.sslcommerz.com.bd",
    "frame-ancestors 'none'",
  ]

  if (!development) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = needsNonce(request.nextUrl.pathname) ? createNonce() : undefined
  const csp = contentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)

  // Next.js reads the request CSP to apply the nonce to framework-generated
  // scripts on dynamically rendered authenticated routes.
  requestHeaders.set('Content-Security-Policy', csp)
  if (nonce) requestHeaders.set('x-nonce', nonce)

  const response = await updateSession(request, requestHeaders)
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)'],
}
