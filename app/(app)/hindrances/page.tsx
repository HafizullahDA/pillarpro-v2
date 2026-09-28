import { createClient } from '@/lib/supabase/server'
import { AllHindrancesClient } from './AllHindrancesClient'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'

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
    { data: contractsData },
    { data: boqData },
    { data: contractEventsData },
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
    supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('boq_items')
      .select('*')
      .order('item_number', { ascending: true }),
    supabase
      .from('contract_events')
      .select('*, projects(name, agency_name), contracts(agreement_number, contract_title)')
      .order('event_date', { ascending: false }),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const hindrances: DetailedHindrance[] = Array.isArray(hindrancesData)
    ? (hindrancesData as DetailedHindrance[])
    : []
  const eotApplications = Array.isArray(eotData) ? eotData : []
  const contracts: ContractRecord[] = Array.isArray(contractsData) ? contractsData : []
  const boqItems: BOQItem[] = Array.isArray(boqData) ? boqData : []
  const contractEvents: ContractEvent[] = Array.isArray(contractEventsData)
    ? (contractEventsData as ContractEvent[])
    : []

  return (
    <AllHindrancesClient
      projects={projects}
      contracts={contracts}
      boqItems={boqItems}
      initialContractEvents={contractEvents}
      initialHindrances={hindrances}
      initialEOTApplications={eotApplications}
      userRole={userRole || 'owner'}
      orgProfile={orgProfile || {}}
    />
  )
}
