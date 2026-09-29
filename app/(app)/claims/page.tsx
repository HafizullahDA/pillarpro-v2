import { createClient } from '@/lib/supabase/server'
import { ClaimsMasterView } from '@/components/claims/ClaimsMasterView'
import { ContractClaim } from '@/lib/types/claims'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EOTCase } from '@/lib/types/eot'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { BOQItem } from '@/lib/types/boq'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClaimsPage() {
  const supabase = createClient()

  const [
    { data: projectsData },
    { data: contractsData },
    { data: contractEventsData },
    { data: hindrancesData },
    { data: eotCasesData },
    { data: evidenceData },
    { data: correspondenceData },
    { data: boqData },
    { data: claimsData },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, organization_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_events')
      .select('*, projects(name, agency_name), contracts(agreement_number, contract_title)')
      .order('event_date', { ascending: false }),
    supabase
      .from('hindrances')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_eot_cases')
      .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('evidence_vault')
      .select('*, projects(name), contracts(agreement_number, contract_title)')
      .order('document_date', { ascending: false }),
    supabase
      .from('contract_correspondence')
      .select('*')
      .order('date', { ascending: false }),
    supabase
      .from('boq_items')
      .select('*')
      .order('item_number', { ascending: true }),
    supabase
      .from('contract_claims')
      .select('*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title)')
      .order('claim_date', { ascending: false }),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const contracts: ContractRecord[] = Array.isArray(contractsData) ? contractsData : []
  const contractEvents: ContractEvent[] = Array.isArray(contractEventsData)
    ? (contractEventsData as ContractEvent[])
    : []
  const hindrances: DetailedHindrance[] = Array.isArray(hindrancesData)
    ? (hindrancesData as DetailedHindrance[])
    : []
  const eotCases: EOTCase[] = Array.isArray(eotCasesData) ? (eotCasesData as EOTCase[]) : []
  const evidenceList: EvidenceRecord[] = Array.isArray(evidenceData)
    ? (evidenceData as EvidenceRecord[])
    : []
  const correspondenceList: CorrespondenceRecord[] = Array.isArray(correspondenceData)
    ? (correspondenceData as CorrespondenceRecord[])
    : []
  const boqItems: BOQItem[] = Array.isArray(boqData) ? boqData : []
  const claims: ContractClaim[] = Array.isArray(claimsData)
    ? (claimsData as ContractClaim[])
    : []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/hindrances" className="hover:text-blue-600 transition-colors">
            Contract Defense
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Contractual Claims &amp; Disputes</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/hindrances"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            &larr; Contract Defense
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/eot"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            Extension of Time (EOT) &rarr;
          </Link>
        </div>
      </div>

      <ClaimsMasterView
        initialClaims={claims}
        projects={projects}
        contracts={contracts}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotCases={eotCases}
        evidenceList={evidenceList}
        correspondenceList={correspondenceList}
        boqItems={boqItems}
        selectedProjectId="all"
      />
    </div>
  )
}
