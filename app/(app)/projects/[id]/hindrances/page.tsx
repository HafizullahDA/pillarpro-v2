import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { HindranceClient } from './HindranceClient'
import { HindranceItem } from '@/lib/calculations/hindrance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectHindrancePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // 1. Fetch project details, role, and organization profile concurrently
  const [
    { data: project },
    { data: userRole },
    { data: orgProfile },
    { data: hindrancesData, error: hErr },
    { data: eotData, error: eErr },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status')
      .eq('id', params.id)
      .single(),
    supabase.rpc('get_user_role'),
    supabase.rpc('get_organization_profile'),
    supabase
      .from('hindrances')
      .select('*')
      .eq('project_id', params.id)
      .order('hindrance_number', { ascending: true }),
    supabase
      .from('eot_applications')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  // Fallback gracefully if database migration hasn't been applied to remote yet
  const hindrances: HindranceItem[] = Array.isArray(hindrancesData)
    ? (hindrancesData as HindranceItem[])
    : []

  const eotApplications = Array.isArray(eotData) ? eotData : []

  return (
    <HindranceClient
      project={project}
      userRole={userRole || 'owner'}
      orgProfile={orgProfile || {}}
      initialHindrances={hindrances}
      initialEOTApplications={eotApplications}
    />
  )
}

