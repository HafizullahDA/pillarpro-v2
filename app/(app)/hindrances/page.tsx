import { createClient } from '@/lib/supabase/server'
import { AllHindrancesClient } from './AllHindrancesClient'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord, ContractNoticeRule } from '@/lib/types/correspondence'
import { EOTCase } from '@/lib/types/eot'
import { ContractVariation } from '@/lib/types/variations'

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
    { data: evidenceData },
    { data: correspondenceData },
    { data: noticeRulesData },
    { data: eotCasesData },
    { data: variationsData },
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
    supabase
      .from('evidence_vault')
      .select('*, projects(name), contracts(agreement_number, contract_title), contract_events(event_number, description, event_type), hindrances(hindrance_number, description), boq_items(item_number, description), measurement_entries(entry_number, calculated_quantity), ra_bills(bill_number), eot_applications(application_number), versions:evidence_versions(*)')
      .order('document_date', { ascending: false }),
    supabase
      .from('contract_correspondence')
      .select('*, projects(name), contracts(agreement_number, contract_title), contract_events(event_number, description), hindrances(hindrance_number, description), boq_items(item_number, description), ra_bills(bill_number), eot_applications(application_number)')
      .order('date', { ascending: false }),
    supabase
      .from('contract_notice_rules')
      .select('*')
      .order('clause_number', { ascending: true }),
    supabase
      .from('contract_eot_cases')
      .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_variations')
      .select('*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)')
      .order('instruction_date', { ascending: false }),
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
  const evidence: EvidenceRecord[] = Array.isArray(evidenceData)
    ? (evidenceData as EvidenceRecord[])
    : []
  const correspondence: CorrespondenceRecord[] = Array.isArray(correspondenceData)
    ? (correspondenceData as CorrespondenceRecord[])
    : []
  const noticeRules: ContractNoticeRule[] = Array.isArray(noticeRulesData)
    ? (noticeRulesData as ContractNoticeRule[])
    : []
  const eotCases: EOTCase[] = Array.isArray(eotCasesData)
    ? (eotCasesData as EOTCase[])
    : []
  const variations: ContractVariation[] = Array.isArray(variationsData)
    ? (variationsData as ContractVariation[])
    : []

  return (
    <AllHindrancesClient
      projects={projects}
      contracts={contracts}
      boqItems={boqItems}
      initialContractEvents={contractEvents}
      initialHindrances={hindrances}
      initialEOTApplications={eotApplications}
      initialEvidence={evidence}
      initialCorrespondence={correspondence}
      noticeRules={noticeRules}
      initialEOTCases={eotCases}
      initialVariations={variations}
      userRole={userRole || 'owner'}
      orgProfile={orgProfile || {}}
    />
  )
}
