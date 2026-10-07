import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isBlockedPath } from './lib/blocked-paths'

export function middleware(request: NextRequest) {
  if (isBlockedPath(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 403 })
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|icon.png).*)',
}
