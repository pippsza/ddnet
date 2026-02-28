import { NextRequest, NextResponse } from 'next/server'

/**
 * Inject the current pathname into request headers so server components
 * (especially the app layout) can read it for page-level permission gating.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/app/:path*'],
}
