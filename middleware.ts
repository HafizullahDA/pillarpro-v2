import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'


/**
 * Middleware runs on every request (except static files).
 *
 * Rules:
 *  - No session + accessing protected route → /sign-in
 *  - Session but status='pending' → /pending  (unless already there)
 *  - Session + status='active' + on auth route → /dashboard
 *  - Everything else passes through
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  const { pathname } = request.nextUrl

  const AUTH_ROUTES    = ['/sign-in', '/sign-up']
  const PENDING_ROUTES = ['/pending']
  const LEGAL_ROUTES   = ['/terms', '/privacy', '/robots.txt', '/sitemap.xml']
  const PWA_ROUTES     = ['/sw.js', '/manifest.json', '/offline']
  const PUBLIC_ROUTES  = [...AUTH_ROUTES, ...PENDING_ROUTES, ...LEGAL_ROUTES, ...PWA_ROUTES]

  // Public API routes with explicit justifications:
  // - /api/health: Public synthetic health check for uptime monitors (BetterUptime, Datadog)
  // - /api/auth/rate-limit: Public rate limiter guarding unauthenticated sign-in and sign-up attempts
  // - /api/log-error: Public error telemetry endpoint to capture client exceptions even when auth is broken
  const PUBLIC_API_ROUTES = [
    '/api/health',
    '/api/auth/rate-limit',
    '/api/log-error',
  ]

  const isApiRoute = pathname.startsWith('/api/')
  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname === r || pathname.startsWith(r))
  const isPublicRoute = pathname === '/' || PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r))

  // ── Unauthenticated ──────────────────────────────────────
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

  // ── Authenticated: check profile status ─────────────────
  // Using RPC (SECURITY DEFINER) to bypass RLS and always read the real status.
  const { data: userStatus } = await supabase.rpc('get_user_status')

  const isPending = !userStatus || userStatus === 'pending'


  if (isPending) {
    // Pending users may access /pending or public legal & PWA routes
    const allowedForPending = [...PENDING_ROUTES, ...LEGAL_ROUTES, ...PWA_ROUTES]
    if (!allowedForPending.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── Active user: redirect away from auth/pending routes ──
  if ([...AUTH_ROUTES, ...PENDING_ROUTES].some(r => pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
