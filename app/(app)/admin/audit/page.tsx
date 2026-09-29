import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { normalizeRole } from '@/lib/permissions'
import { AuditTrailClient } from './AuditTrailClient'
import { AuditLogEntry } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Immutable Audit Trail & Enterprise RBAC | PillarPro',
}

export default async function AdminAuditPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: userRole } = await supabase.rpc('get_user_role')
  const canonicalRole = normalizeRole(userRole)

  // Disallow low-level data entry or site supervisors from accessing global firm audit trails
  if (!canonicalRole || ['site_supervisor', 'data_entry', 'store_manager'].includes(canonicalRole)) {
    redirect('/dashboard')
  }

  // Fetch recent audit logs within the user's organization
  const { data: rawLogs, error: logsError } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (logsError) {
    console.error('AUDIT LOGS FETCH ERROR:', logsError.message)
  }

  // Fetch active projects for filtering
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('archived', false)
    .order('name')

  const auditLogs: AuditLogEntry[] = (rawLogs ?? []).map((row: any) => ({
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    user_id: row.user_id,
    user_email: row.user_email,
    user_name: row.user_name,
    user_role: row.user_role,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_identifier: row.entity_identifier,
    previous_values: row.previous_values ?? {},
    new_values: row.new_values ?? {},
    diff_summary: row.diff_summary ?? {},
    notes: row.notes,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  }))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <AuditTrailClient
        initialLogs={auditLogs}
        projects={projects ?? []}
        currentUserRole={canonicalRole}
      />
    </div>
  )
}
