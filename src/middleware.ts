import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BLOCKED_PATHS = [
  'wp-includes',
  'xmlrpc.php',
  '_ignition',
  'wp-json/gravity',
]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path === '/.git/config' || BLOCKED_PATHS.some(p => path.includes(p))) {
    return new NextResponse(null, { status: 403 })
  }
}

export const config = {
  matcher: '/:path*',
}
