import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platformAdmin'
import { redirect } from 'next/navigation'
import { VisitorsClient } from './VisitorsClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Visitor Telemetry & Stay Duration | Platform Owner',
}

export default async function VisitorsAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Strict Platform Owner Guard: Strictly exclusive to pillarprojk@gmail.com
  const userEmail = (user.email || '').trim().toLowerCase()
  if (userEmail !== 'pillarprojk@gmail.com') {
    redirect('/dashboard')
  }

  // Fetch recent visitor sessions ordered by most recently active
  let sessions: any[] = []
  try {
    const { data: sessionRows, error: fetchErr } = await supabase
      .from('visitor_sessions')
      .select('*')
      .order('last_active_at', { ascending: false })
      .limit(300)

    if (fetchErr) {
      console.warn('Could not fetch visitor sessions:', fetchErr.message)
    }

    sessions = (sessionRows || []).map((row: any) => ({
      id: row.id,
      session_id: row.session_id,
      visitor_id: row.visitor_id,
      user_id: row.user_id || null,
      user_email: row.user_email || null,
      user_name: row.user_name || null,
      organization_name: row.org_name || null,
      ip_address: row.ip_address || null,
      city: row.city || null,
      country: row.country || null,
      device_type: row.device_type || 'desktop',
      browser: row.browser || null,
      os: row.os || null,
      referrer: row.referrer || null,
      entry_path: row.entry_path || '/',
      last_path: row.last_path || '/',
      pages_viewed: Array.isArray(row.journey) ? row.journey : [],
      duration_seconds: Number(row.duration_seconds) || 0,
      pageview_count: Number(row.pageviews) || 1,
      started_at: row.started_at,
      last_heartbeat_at: row.last_active_at || row.started_at,
    }))
  } catch (err) {
    console.warn('Could not fetch visitor sessions:', err)
  }

  return (
    <VisitorsClient
      currentUserEmail={userEmail}
      initialSessions={sessions}
    />
  )
}
