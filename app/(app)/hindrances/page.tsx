import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AllHindrancesClient } from './AllHindrancesClient'
import { HindranceItem } from '@/lib/calculations/hindrance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AllHindrancesPage() {
  const supabase = createClient()

  const [
    { data: projectsData },
    { data: userRole },
    { data: orgProfile },
    { data: hindrancesData },
    { data: eotData },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, organization_id')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_user_role'),
    supabase.rpc('get_organization_profile'),
    supabase
      .from('hindrances')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('eot_applications')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const hindrances: HindranceItem[] = Array.isArray(hindrancesData)
    ? (hindrancesData as HindranceItem[])
    : []
  const eotApplications = Array.isArray(eotData) ? eotData : []

  return (
    <AllHindrancesClient
      projects={projects}
      userRole={userRole || 'owner'}
      orgProfile={orgProfile || {}}
      initialHindrances={hindrances}
      initialEOTApplications={eotApplications}
    />
  )
}

