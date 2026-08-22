import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const target = new URL('/onboarding?billing=success', url.origin)
  return NextResponse.redirect(target)
}
