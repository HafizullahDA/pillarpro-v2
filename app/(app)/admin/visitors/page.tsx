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

  // Strict Platform Superadmin Guard
  const hasAccess = await isPlatformAdmin(supabase, user.email)
  if (!hasAccess) {
    // Regular contractors and unauthorized users cannot view this page
    redirect('/dashboard')
  }

  // Fetch recent visitor sessions
  let sessions: any[] = []
  try {
    const { data: sessionRows } = await supabase
      .from('visitor_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(300)

    sessions = sessionRows || []
  } catch (err) {
    console.warn('Could not fetch visitor sessions:', err)
  }

  // Fetch delegated platform admins
  let delegatedAdmins: any[] = []
  try {
    const { data: adminRows } = await supabase
      .from('platform_admins')
      .select('*')
      .order('created_at', { ascending: false })

    delegatedAdmins = adminRows || []
  } catch (err) {
    console.warn('Could not fetch platform admins:', err)
  }

  return (
    <VisitorsClient
      currentUserEmail={user.email || ''}
      initialSessions={sessions}
      initialDelegatedAdmins={delegatedAdmins}
    />
  )
}
