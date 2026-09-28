import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContractDetailClient } from './ContractDetailClient'
import { ContractRecord, ContractDocument } from '@/lib/types/contract'
import { ContractClause, ContractObligation } from '@/lib/types/contractClauses'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // 1. Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, agency_name, status, advertised_cost, awarded_amount, start_date, end_date')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  // 2. Fetch contract, documents, clauses & obligations in parallel
  const [
    { data: userRole },
    { data: contractData },
    { data: documentsData },
    { data: clausesData },
    { data: obligationsData },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('contracts')
      .select('*')
      .eq('project_id', params.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .maybeSingle(),
    supabase
      .from('contract_documents')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_clauses')
      .select('*, contract_documents(id, title, document_type)')
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_obligations')
      .select('*, contract_clauses(id, clause_number, clause_title, category)')
      .order('due_date', { ascending: true }),
  ])

  // Fallback initial contract if table hasn't been migrated or seeded yet
  let contract: ContractRecord | null = contractData as ContractRecord | null

  if (!contract) {
    contract = {
      id: '',
      organization_id: '',
      project_id: project.id,
      is_primary: true,
      employer_name: project.agency_name || 'Government Department / Agency',
      division: '',
      circle: '',
      contracting_authority: 'Executive Engineer',
      contractor_name: 'Contractor Agency',
      agreement_number: `AGR/${project.name.slice(0, 3).toUpperCase()}/${project.id.slice(0, 6)}`,
      work_order_number: '',
      nit_number: '',
      contract_title: project.name,
      contract_type: 'Item Rate',
      tender_type: 'Open Tender',
      estimated_cost: project.advertised_cost || 0,
      awarded_amount: project.awarded_amount || 0,
      award_date: null,
      agreement_date: null,
      work_commencement_date: project.start_date || null,
      original_completion_date: project.end_date || null,
      current_completion_date: project.end_date || null,
      original_contract_period_months: 12,
      original_contract_period_days: 365,
      dlp_months: 12,
      dlp_start_date: null,
      dlp_end_date: null,
      earnest_money_deposit: 0,
      performance_security_amount: Math.round(((project.awarded_amount || 0) * 0.05) * 100) / 100,
      performance_security_percent: 5,
      security_deposit_amount: Math.round(((project.awarded_amount || 0) * 0.025) * 100) / 100,
      security_deposit_percent: 2.5,
      retention_percentage: 5,
      contractor_gstin: '',
      employer_gstin: '',
      gst_rate_percent: 18,
      gst_treatment: 'exclusive',
      liquidated_damages_percent_per_week: 0.5,
      liquidated_damages_max_cap_percent: 10,
      ld_provisions_notes: '',
      eot_clause: 'Clause 5 CPWD / PWD GCC',
      eot_notice_days: 14,
      eot_provisions_notes: '',
      escalation_applicable: false,
      escalation_clause: 'Clause 10CC / 10CA',
      escalation_notes: '',
      variation_limit_percent: 25,
      variation_clause: 'Clause 12 CPWD / PWD GCC',
      variation_notes: '',
      payment_terms_frequency: 'monthly',
      payment_terms_notes: '',
      gcc_type: 'CPWD GCC 2020 / 2024',
      gcc_edition: '',
      scc_notes: '',
      status: 'active',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const documents: ContractDocument[] = (documentsData as ContractDocument[]) || []
  const clauses: ContractClause[] = Array.isArray(clausesData)
    ? (clausesData as ContractClause[]).filter(c => !contract?.id || c.contract_id === contract.id)
    : []
  const obligations: ContractObligation[] = Array.isArray(obligationsData)
    ? (obligationsData as ContractObligation[]).filter(o => !contract?.id || o.contract_id === contract.id)
    : []

  return (
    <ContractDetailClient
      project={project}
      initialContract={contract}
      initialDocuments={documents}
      initialClauses={clauses}
      initialObligations={obligations}
      userRole={userRole as string | null}
    />
  )
}
