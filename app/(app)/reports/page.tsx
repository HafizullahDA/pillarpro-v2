import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { normalizeRole } from '@/lib/permissions'
import { fetchReportData } from '@/lib/reports/reportGenerators'
import { ReportsClient } from './ReportsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Professional Construction Reporting Engine | PillarPro',
  description: 'Standardized Indian Government civil contractor reports, registers, and abstracts.',
}

export default async function ReportsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: userRole } = await supabase.rpc('get_user_role')
  const canonicalRole = normalizeRole(userRole)

  // Fetch user profile for metadata
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const currentUser = {
    displayName: profile?.display_name || user.email?.split('@')[0] || 'Staff Member',
    email: user.email || '',
    role: canonicalRole || 'viewer',
  }

  // Fetch active projects for filter dropdown
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name, agency_name')
    .eq('archived', false)
    .order('name')

  const projects = projectsData || []

  // Pre-generate the initial default report (Measurement Book)
  const initialReport = await fetchReportData(
    supabase,
    {
      reportKey: 'MEASUREMENT_BOOK',
      projectId: projects[0]?.id || undefined,
    },
    currentUser
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <ReportsClient
        initialReport={initialReport}
        projects={projects}
        currentUser={currentUser}
      />
    </div>
  )
}
