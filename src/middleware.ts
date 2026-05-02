import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BLOCKED_PATHS = [
  'wp-includes',
  'xmlrpc.php',
  '_ignition',
  'wp-json/gravity',
]

const BLOCKED_EXACT = ['/.git/config', '/.env', '/.env.local', '/.env.production']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (BLOCKED_EXACT.includes(path) || BLOCKED_PATHS.some(p => path.includes(p))) {
    return new NextResponse(null, { status: 403 })
  }
}

export const config = {
  matcher: '/:path*',
}
