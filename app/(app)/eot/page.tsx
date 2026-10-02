import { createClient } from '@/lib/supabase/server'
import { EOTMasterView } from '@/components/eot/EOTMasterView'
import { EOTCase } from '@/lib/types/eot'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EOTPage() {
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
            <span className="text-slate-900 font-semibold">Extension of Time (EOT)</span>
          </div>
          <Link
            href="/hindrances"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            &larr; Back to Contract Defense
          </Link>
        </div>

        <EOTWorkbenchView
          projects={[]}
          contracts={[]}
          contractEvents={[]}
          hindrances={[]}
          evidence={[]}
          correspondence={[]}
          initialCases={[]}
        />
      </div>
    )
  }

  // 2. Fetch EOT data strictly scoped to project IDs
  const [
    { data: contractsData },
    { data: contractEventsData },
    { data: hindrancesData },
    { data: evidenceData },
    { data: correspondenceData },
    { data: eotCasesData },
  ] = await Promise.all([
    supabase
      .from('contracts')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
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
      .from('evidence_vault')
      .select('*, projects(name), contracts(agreement_number, contract_title)')
      .in('project_id', projectIds)
      .order('document_date', { ascending: false }),
    supabase
      .from('contract_correspondence')
      .select('*')
      .in('project_id', projectIds)
      .order('date', { ascending: false }),
    supabase
      .from('contract_eot_cases')
      .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
  ])

  const projectIdSet = new Set(projectIds)

  const contracts: ContractRecord[] = Array.isArray(contractsData)
    ? (contractsData as ContractRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const contractEvents: ContractEvent[] = Array.isArray(contractEventsData)
    ? (contractEventsData as ContractEvent[]).filter(ce => projectIdSet.has(ce.project_id))
    : []
  const hindrances: DetailedHindrance[] = Array.isArray(hindrancesData)
    ? (hindrancesData as DetailedHindrance[]).filter(h => projectIdSet.has(h.project_id))
    : []
  const evidenceList: EvidenceRecord[] = Array.isArray(evidenceData)
    ? (evidenceData as EvidenceRecord[]).filter(ev => projectIdSet.has(ev.project_id))
    : []
  const correspondenceList: CorrespondenceRecord[] = Array.isArray(correspondenceData)
    ? (correspondenceData as CorrespondenceRecord[]).filter(co => projectIdSet.has(co.project_id))
    : []
  const eotCases: EOTCase[] = Array.isArray(eotCasesData)
    ? (eotCasesData as EOTCase[]).filter(ec => projectIdSet.has(ec.project_id))
    : []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/hindrances" className="hover:text-blue-600 transition-colors">
            Contract Defense
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Extension of Time (EOT)</span>
        </div>
        <Link
          href="/hindrances"
          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
        >
          &larr; Back to Contract Defense
        </Link>
      </div>

      <EOTMasterView
        initialCases={eotCases}
        projects={projects}
        contracts={contracts}
        contractEvents={contractEvents}
        hindrances={hindrances}
        evidenceList={evidenceList}
        correspondenceList={correspondenceList}
        selectedProjectId="all"
      />
    </div>
  )
}
