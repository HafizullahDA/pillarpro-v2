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
  const PUBLIC_ROUTES  = [...AUTH_ROUTES, ...PENDING_ROUTES]

  // ── Unauthenticated ──────────────────────────────────────
  if (!user) {
    if (!PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
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
    // Pending users may only be on /pending
    if (!PENDING_ROUTES.some(r => pathname.startsWith(r))) {
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
