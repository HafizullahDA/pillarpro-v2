import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlertSettingsClient } from './AlertSettingsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Alert Control Center & WhatsApp Preferences | PillarPro',
}

export default async function AlertSettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [{ data: userRole }, { data: orgId }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.rpc('get_user_organization_id'),
  ])

  if (!orgId) {
    redirect('/dashboard')
  }

  // Fetch initial preferences
  let { data: preferences } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!preferences) {
    const { data: created } = await supabase
      .from('alert_preferences')
      .insert({
        organization_id: orgId,
        primary_phone: process.env.WHATSAPP_ALERT_RECIPIENT_PHONE || null,
      })
      .select()
      .single()

    preferences = created
  }

  // Fetch initial 50 dispatch logs
  const { data: logs, count } = await supabase
    .from('alert_dispatch_logs')
    .select('id, organization_id, project_id, entity_type, entity_id, entity_reference, milestone_key, channel, recipient_phone, status, error_message, meta_message_id, dispatched_at, payload_snapshot', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('dispatched_at', { ascending: false })
    .limit(50)

  return (
    <AlertSettingsClient
      initialPreferences={preferences}
      initialLogs={logs || []}
      totalLogs={count || 0}
      userRole={userRole as string}
      orgId={orgId as string}
    />
  )
}
