import { NextResponse } from 'next/server'

function redirectToOnboarding(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/onboarding?billing=success', url.origin))
}

export async function GET(request: Request) {
  return redirectToOnboarding(request)
}

export async function POST(request: Request) {
  return redirectToOnboarding(request)
}
