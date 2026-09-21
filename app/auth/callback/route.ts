import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      try {
        // Check if user already has an active organization and profile
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('organization_id, status')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!userProfile?.organization_id || userProfile?.status !== 'active') {
          const meta = data.user.user_metadata || {}
          if (meta.join_code) {
            await supabase.rpc('join_organization', {
              p_join_code: meta.join_code,
              p_display_name: meta.display_name || data.user.email?.split('@')[0],
              p_role: 'site_supervisor',
            })
          } else {
            await supabase.rpc('onboard_contractor', {
              p_firm_name: meta.firm_name || 'My Contracting Firm',
              p_display_name: meta.display_name || data.user.email?.split('@')[0],
              p_seed_starter: meta.seed_starter !== false,
            })
          }
        }
      } catch (provisionErr) {
        console.warn('Callback auto-provision notice:', provisionErr)
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If code exchange failed or expired, redirect to sign-in with clear feedback
  return NextResponse.redirect(
    `${requestUrl.origin}/sign-in?error=${encodeURIComponent(
      'Email verification link was invalid or expired. Please sign in or resend a new confirmation email.'
    )}`
  )
}

