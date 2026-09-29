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

  const [
    { data: projectsData },
    { data: contractsData },
    { data: boqData },
    { data: variationsData },
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
      .from('boq_items')
      .select('*')
      .order('item_number', { ascending: true }),
    supabase
      .from('contract_variations')
      .select('*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)')
      .order('instruction_date', { ascending: false }),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const contracts: ContractRecord[] = Array.isArray(contractsData) ? contractsData : []
  const boqItems: BOQItem[] = Array.isArray(boqData) ? boqData : []
  const variations: ContractVariation[] = Array.isArray(variationsData)
    ? (variationsData as ContractVariation[])
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
