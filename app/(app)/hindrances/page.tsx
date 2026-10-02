import { createClient } from '@/lib/supabase/server'
import { AllHindrancesClient } from './AllHindrancesClient'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord, ContractNoticeRule } from '@/lib/types/correspondence'
import { EOTCase } from '@/lib/types/eot'
import { ContractVariation } from '@/lib/types/variations'
import { ContractClaim } from '@/lib/types/claims'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AllHindrancesPage() {
  const supabase = createClient()

  // 1. Fetch user projects, role, and profile first
  const [
    { data: projectsData },
    { data: userRole },
    { data: orgProfile },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, organization_id')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_user_role'),
    supabase.rpc('get_organization_profile'),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const projectIds = projects.map(p => p.id)

  if (projectIds.length === 0) {
    return (
      <AllHindrancesClient
        projects={[]}
        contracts={[]}
        boqItems={[]}
        initialContractEvents={[]}
        initialHindrances={[]}
        initialEOTApplications={[]}
        initialEvidence={[]}
        initialCorrespondence={[]}
        noticeRules={[]}
        initialEOTCases={[]}
        initialVariations={[]}
        initialClaims={[]}
        userRole={userRole || 'owner'}
        orgProfile={orgProfile || {}}
      />
    )
  }

  // 2. Fetch records strictly scoped to project IDs
  const [
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
    { data: claimsData },
  ] = await Promise.all([
    supabase
      .from('hindrances')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('eot_applications')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('boq_items')
      .select('*')
      .in('project_id', projectIds)
      .order('item_number', { ascending: true }),
    supabase
      .from('contract_events')
      .select('*, projects(name, agency_name), contracts(agreement_number, contract_title)')
      .in('project_id', projectIds)
      .order('event_date', { ascending: false }),
    supabase
      .from('evidence_vault')
      .select('*, projects(name), contracts(agreement_number, contract_title), contract_events(event_number, description, event_type), hindrances(hindrance_number, description), boq_items(item_number, description), measurement_entries(entry_number, calculated_quantity), ra_bills(bill_number), eot_applications(application_number), versions:evidence_versions(*)')
      .in('project_id', projectIds)
      .order('document_date', { ascending: false }),
    supabase
      .from('contract_correspondence')
      .select('*, projects(name), contracts(agreement_number, contract_title), contract_events(event_number, description), hindrances(hindrance_number, description), boq_items(item_number, description), ra_bills(bill_number), eot_applications(application_number)')
      .in('project_id', projectIds)
      .order('date', { ascending: false }),
    supabase
      .from('contract_notice_rules')
      .select('*')
      .order('clause_number', { ascending: true }),
    supabase
      .from('contract_eot_cases')
      .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_variations')
      .select('*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)')
      .in('project_id', projectIds)
      .order('instruction_date', { ascending: false }),
    supabase
      .from('contract_claims')
      .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
      .in('project_id', projectIds)
      .order('claim_date', { ascending: false }),
  ])

  // In-memory tenant isolation assertion: Filter out any record not belonging to the user's projects
  const projectIdSet = new Set(projectIds)

  const hindrances: DetailedHindrance[] = Array.isArray(hindrancesData)
    ? (hindrancesData as DetailedHindrance[]).filter(h => projectIdSet.has(h.project_id))
    : []
  const eotApplications = Array.isArray(eotData)
    ? eotData.filter((e: any) => projectIdSet.has(e.project_id))
    : []
  const contracts: ContractRecord[] = Array.isArray(contractsData)
    ? (contractsData as ContractRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const boqItems: BOQItem[] = Array.isArray(boqData)
    ? (boqData as BOQItem[]).filter(b => projectIdSet.has(b.project_id))
    : []
  const contractEvents: ContractEvent[] = Array.isArray(contractEventsData)
    ? (contractEventsData as ContractEvent[]).filter(ce => projectIdSet.has(ce.project_id))
    : []
  const evidence: EvidenceRecord[] = Array.isArray(evidenceData)
    ? (evidenceData as EvidenceRecord[]).filter(ev => projectIdSet.has(ev.project_id))
    : []
  const correspondence: CorrespondenceRecord[] = Array.isArray(correspondenceData)
    ? (correspondenceData as CorrespondenceRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const noticeRules: ContractNoticeRule[] = Array.isArray(noticeRulesData)
    ? (noticeRulesData as ContractNoticeRule[])
    : []
  const eotCases: EOTCase[] = Array.isArray(eotCasesData)
    ? (eotCasesData as EOTCase[]).filter(ec => projectIdSet.has(ec.project_id))
    : []
  const variations: ContractVariation[] = Array.isArray(variationsData)
    ? (variationsData as ContractVariation[]).filter(v => projectIdSet.has(v.project_id))
    : []
  const claims: ContractClaim[] = Array.isArray(claimsData)
    ? (claimsData as ContractClaim[]).filter(cl => projectIdSet.has(cl.project_id))
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
      initialClaims={claims}
      userRole={userRole || 'owner'}
      orgProfile={orgProfile || {}}
    />
  )
}
