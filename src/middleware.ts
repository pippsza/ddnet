import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, type Locale } from './i18n/config'

const PUBLIC_PATHS = new Set(['', 'about', 'privacy', 'rules', 'terms'])

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale
  }

  const acceptLang = request.headers.get('accept-language')
  if (acceptLang) {
    for (const part of acceptLang.split(',')) {
      const lang = part.split(';')[0].trim().split('-')[0]
      if (locales.includes(lang as Locale)) {
        return lang as Locale
      }
    }
  }

  return defaultLocale
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /app/* routes — inject x-pathname header (existing behavior)
  if (pathname.startsWith('/app/') || pathname === '/app') {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  // Check if path starts with a valid locale prefix
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  if (firstSegment && locales.includes(firstSegment as Locale)) {
    // Locale-prefixed route — set x-locale header and pass through
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', firstSegment)
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  // Bare public paths → redirect to /{locale}{path}
  const pathSegment = segments[0] || ''
  if (PUBLIC_PATHS.has(pathSegment)) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    return withSecurityHeaders(NextResponse.redirect(url, 307))
  }

  // Everything else (login, register, support, api, etc.) — pass through
  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
