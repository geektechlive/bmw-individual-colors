import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BLOCKED_SUBSTRINGS = [
  'wp-includes',
  'xmlrpc.php',
  '_ignition',
  'wp-json',
  'phpinfo',
]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname.toLowerCase()

  const isBlocked =
    path.startsWith('/.env') ||
    path.startsWith('/.git') ||
    path.endsWith('.php') ||
    BLOCKED_SUBSTRINGS.some(p => path.includes(p))

  if (isBlocked) {
    return new NextResponse(null, { status: 403 })
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|icon.png).*)',
}
