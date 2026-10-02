import { createClient } from '@/lib/supabase/server'
import { VariationsMasterView } from '@/components/variations/VariationsMasterView'
import { ContractVariation } from '@/lib/types/variations'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VariationsPage() {
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
            <span className="text-slate-900 font-semibold">Variations &amp; Deviations (Clause 12)</span>
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
              href="/claims"
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              Claims &amp; Disputes &rarr;
            </Link>
          </div>
        </div>

        <VariationsMasterView
          initialVariations={[]}
          projects={[]}
          contracts={[]}
          boqItems={[]}
          selectedProjectId="all"
        />
      </div>
    )
  }

  // 2. Fetch variations data strictly scoped to project IDs
  const [
    { data: contractsData },
    { data: boqData },
    { data: variationsData },
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
      .from('contract_variations')
      .select('*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)')
      .in('project_id', projectIds)
      .order('instruction_date', { ascending: false }),
  ])

  const projectIdSet = new Set(projectIds)

  const contracts: ContractRecord[] = Array.isArray(contractsData)
    ? (contractsData as ContractRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const boqItems: BOQItem[] = Array.isArray(boqData)
    ? (boqData as BOQItem[]).filter(b => projectIdSet.has(b.project_id))
    : []
  const variations: ContractVariation[] = Array.isArray(variationsData)
    ? (variationsData as ContractVariation[]).filter(v => projectIdSet.has(v.project_id))
    : []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/hindrances" className="hover:text-blue-600 transition-colors">
            Contract Defense
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Variations &amp; Deviations (Clause 12)</span>
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
            href="/measurement"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            e-Measurement Book &rarr;
          </Link>
        </div>
      </div>

      <VariationsMasterView
        initialVariations={variations}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        selectedProjectId="all"
      />
    </div>
  )
}
