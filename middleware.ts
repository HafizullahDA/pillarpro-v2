import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware runs on every request (except static files).
 *
 * Rules:
 *  - /api/cron/* → requires valid Bearer CRON_SECRET authorization header
 *  - No session + accessing protected route → /sign-in (or 401 for API)
 *  - Public routes / public APIs → pass through without blocking on status RPC
 *  - Session but status='pending' → /pending (unless already there, or 403 for API)
 *  - Session + status='active' + on auth route → /dashboard
 *  - Everything else passes through
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  // ── Intercept Auth Redirects Landing on Root ──────────────────
  if (pathname === '/') {
    const searchParams = request.nextUrl.searchParams
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDesc = searchParams.get('error_description')
    const code = searchParams.get('code')

    // Case 1: Supabase redirected an auth error (e.g. otp_expired) to root
    if (error || errorCode) {
      const url = request.nextUrl.clone()
      url.pathname = '/forgot-password'
      url.search = ''
      url.searchParams.set(
        'error',
        errorCode === 'otp_expired'
          ? 'Your password reset link has expired because a newer link was requested or time limit reached. Please request a fresh reset link below.'
          : errorDesc || 'Unable to verify email link. Please request a fresh recovery link.'
      )
      return NextResponse.redirect(url)
    }

    // Case 2: Supabase redirected a PKCE auth/recovery code to root
    if (code) {
      const url = request.nextUrl.clone()
      url.pathname = '/reset-password'
      return NextResponse.redirect(url)
    }
  }

  // ── 1. Cron API Route Authentication Guard ───────────────────
  // Strictly enforce Bearer CRON_SECRET before proceeding to cron routes
  if (pathname.startsWith('/api/cron')) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized cron trigger. Valid CRON_SECRET Bearer token required.',
          },
        },
        { status: 401 }
      )
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const AUTH_ROUTES     = ['/sign-in', '/sign-up', '/forgot-password']
  const RESET_ROUTES    = ['/reset-password']
  const CALLBACK_ROUTES = ['/auth/callback']
  const PENDING_ROUTES  = ['/pending']
  const PUBLIC_PAGES    = ['/pricing', '/terms', '/privacy', '/robots.txt', '/sitemap.xml']
  const PWA_ROUTES      = ['/sw.js', '/manifest.json', '/offline', '/.well-known']
  const PUBLIC_ROUTES   = [...AUTH_ROUTES, ...RESET_ROUTES, ...CALLBACK_ROUTES, ...PENDING_ROUTES, ...PUBLIC_PAGES, ...PWA_ROUTES]

  // Public API routes with explicit justifications:
  // - /api/health: Public synthetic health check for uptime monitors (BetterUptime, Datadog)
  // - /api/auth/rate-limit: Public rate limiter guarding unauthenticated sign-in and sign-up attempts
  // - /api/log-error: Public error telemetry endpoint to capture client exceptions even when auth is broken
  // - /api/analytics/track: Platform visitor telemetry & stay duration tracking for anonymous & authenticated visitors
  // - /api/cron: Protected above by CRON_SECRET bearer token check
  const PUBLIC_API_ROUTES = [
    '/api/health',
    '/api/auth/rate-limit',
    '/api/log-error',
    '/api/assetlinks',
    '/api/analytics/track',
    '/api/cron',
  ]

  const isApiRoute = pathname.startsWith('/api/')
  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname === r || pathname.startsWith(r))
  const isPublicRoute = pathname === '/' || pathname.startsWith('/google') || PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r))

  // ── 2. Unauthenticated Access ────────────────────────────
  if (!user) {
    if (isApiRoute) {
      if (!isPublicApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required. Please sign in to access this API route.',
            },
          },
          { status: 401 }
        )
      }
      return supabaseResponse
    }

    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/sign-in'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── 3. Authenticated: Fast Path for Public Routes & APIs ──
  // Do not block on supabase.rpc('get_user_status') for public APIs (e.g. /api/health, /api/analytics/track)
  // or public marketing/legal/PWA routes (excluding auth pages which redirect active users to dashboard)
  if (isPublicApi) {
    return supabaseResponse
  }

  const isAuthRoute = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r))
  const isPendingRoute = PENDING_ROUTES.some(r => pathname === r || pathname.startsWith(r))

  if (isPublicRoute && !isAuthRoute && !isPendingRoute) {
    return supabaseResponse
  }

  // ── 4. Authenticated: Check Profile Status for Protected Routes ──
  // Using RPC (SECURITY DEFINER) to bypass RLS and always read the real status.
  const { data: userStatus } = await supabase.rpc('get_user_status')

  const isPending = !userStatus || userStatus === 'pending'

  if (isPending) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Account pending approval. You do not have permission to access this resource.',
          },
        },
        { status: 403 }
      )
    }

    // Pending users may access /pending or public marketing, legal & PWA routes
    const allowedForPending = [...PENDING_ROUTES, ...PUBLIC_PAGES, ...PWA_ROUTES]
    if (!allowedForPending.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── 5. Active user: redirect away from auth/pending routes ──
  if ([...AUTH_ROUTES, ...PENDING_ROUTES].some(r => pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/forgot-password' ? '/reset-password' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|json)$).*)',
  ],
}
