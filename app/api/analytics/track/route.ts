import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.session_id || !body.visitor_id) {
      return NextResponse.json({ ok: false, error: 'Missing session or visitor ID' }, { status: 400 })
    }

    const city = request.headers.get('x-vercel-ip-city') || request.headers.get('cf-ipcity') || null
    const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || null
    const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userName: string | null = null
    let orgName: string | null = null

    if (user) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, organizations(name)')
          .eq('id', user.id)
          .maybeSingle()

        userName = profile?.display_name || user.email?.split('@')[0] || null
        orgName = (profile?.organizations as { name?: string } | null)?.name || null
      } catch {
        // Continue even if profile lookup is skipped
      }
    }

    const { error: rpcError } = await supabase.rpc('track_visitor_session', {
      p_session_id: String(body.session_id),
      p_visitor_id: String(body.visitor_id),
      p_path: String(body.path || '/'),
      p_referrer: body.referrer ? String(body.referrer).slice(0, 500) : null,
      p_device_type: String(body.device_type || 'desktop'),
      p_browser: body.browser ? String(body.browser) : null,
      p_os: body.os ? String(body.os) : null,
      p_city: city ? decodeURIComponent(city) : null,
      p_country: country || null,
      p_ip_address: rawIp || null,
      p_user_email: user?.email || null,
      p_user_name: userName,
      p_org_name: orgName,
      p_duration_increment: Math.max(0, Math.min(3600, Number(body.duration_increment) || 0)),
      p_is_heartbeat: Boolean(body.is_heartbeat),
    })

    if (rpcError) {
      console.warn('[Visitor Analytics] RPC notice:', rpcError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[Visitor Analytics] Tracking exception:', err)
    return NextResponse.json({ ok: true })
  }
}
