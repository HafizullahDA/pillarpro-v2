import { createClient } from '@/lib/supabase/server'
import { EvidenceVaultView } from '@/components/evidence/EvidenceVaultView'
import { EvidenceRecord } from '@/lib/types/evidence'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EvidenceVaultPage() {
  const supabase = createClient()

  // 1. Fetch user projects first
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, organization_id')
    .order('created_at', { ascending: false })

  const projects = Array.isArray(projectsData) ? projectsData : []
  const projectIds = projects.map(p => p.id)

  if (projectIds.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link href="/hindrances" className="hover:text-blue-600 transition-colors">
              Contract Defense
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Evidence Vault</span>
          </div>
          <Link
            href="/hindrances"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            &larr; Back to Contract Defense Register
          </Link>
        </div>

        <EvidenceVaultView
          initialEvidence={[]}
          projects={[]}
          contracts={[]}
          boqItems={[]}
          contractEvents={[]}
          hindrances={[]}
          eotApplications={[]}
          selectedProjectId="all"
        />
      </div>
    )
  }

  // 2. Fetch evidence data strictly scoped to project IDs
  const [
    { data: contractsData },
    { data: boqData },
    { data: contractEventsData },
    { data: hindrancesData },
    { data: eotData },
    { data: evidenceData },
  ] = await Promise.all([
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
      .from('evidence_vault')
      .select('*, projects(name), contracts(agreement_number, contract_title), contract_events(event_number, description, event_type), hindrances(hindrance_number, description), boq_items(item_number, description), measurement_entries(entry_number, calculated_quantity), ra_bills(bill_number), eot_applications(application_number), versions:evidence_versions(*)')
      .in('project_id', projectIds)
      .order('document_date', { ascending: false }),
  ])

  const projectIdSet = new Set(projectIds)

  const contracts: ContractRecord[] = Array.isArray(contractsData)
    ? (contractsData as ContractRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const boqItems: BOQItem[] = Array.isArray(boqData)
    ? (boqData as BOQItem[]).filter(b => projectIdSet.has(b.project_id))
    : []
  const contractEvents: ContractEvent[] = Array.isArray(contractEventsData)
    ? (contractEventsData as ContractEvent[]).filter(ce => projectIdSet.has(ce.project_id))
    : []
  const hindrances: DetailedHindrance[] = Array.isArray(hindrancesData)
    ? (hindrancesData as DetailedHindrance[]).filter(h => projectIdSet.has(h.project_id))
    : []
  const eotApplications = Array.isArray(eotData)
    ? eotData.filter((e: any) => projectIdSet.has(e.project_id))
    : []
  const evidence: EvidenceRecord[] = Array.isArray(evidenceData)
    ? (evidenceData as EvidenceRecord[]).filter(ev => projectIdSet.has(ev.project_id))
    : []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/hindrances" className="hover:text-blue-600 transition-colors">
            Contract Defense
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Evidence Vault</span>
        </div>
        <Link
          href="/hindrances"
          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
        >
          &larr; Back to Contract Defense Register
        </Link>
      </div>

      <EvidenceVaultView
        initialEvidence={evidence}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotApplications={eotApplications}
        selectedProjectId="all"
      />
    </div>
  )
}
