import { SupabaseClient } from '@supabase/supabase-js'

export interface ProjectContractContext {
  project: {
    id: string
    name: string
    agency_name: string | null
    advertised_cost: number | null
    awarded_amount: number | null
    start_date: string | null
    end_date: string | null
    status: string | null
  } | null
  contract: {
    id: string
    contract_number: string
    agreement_number: string
    work_name: string
    authority_name: string | null
    contract_type: string | null
    contract_value: number
    stipulated_start_date: string | null
    stipulated_completion_date: string | null
    actual_completion_date: string | null
    dlp_months: number | null
    performance_security_amount: number | null
    eot_clause: string | null
    variation_clause: string | null
    escalation_clause: string | null
    status: string | null
  } | null
  clauses: Array<{
    id: string
    clause_number: string
    clause_title: string
    clause_text: string
    category: string
    notice_period_days: number | null
    source_document_title: string | null
    source_page_ref: string | null
    eot_relevance: boolean
    variation_relevance: boolean
    claim_relevance: boolean
    status: string
  }>
  hindrances: Array<{
    id: string
    hindrance_number: number
    hindrance_code: string | null
    description: string
    category: string | null
    start_date: string
    end_date: string | null
    duration_days: number | null
    net_delay_days: number | null
    delay_type: string | null
    status: string | null
    standard_status: string | null
    notice_served: boolean
    notice_date: string | null
    notice_reference_no: string | null
    location_chainage: string | null
    affected_work: string | null
    affected_boq_items: string[] | null
    remarks: string | null
  }>
  contractEvents: Array<{
    id: string
    event_number: string
    event_type: string
    title: string
    description: string
    cause: string | null
    responsible_party: string | null
    event_date: string
    start_date: string
    end_date: string | null
    status: string
    estimated_delay_days: number | null
    actual_delay_days: number | null
    financial_impact: number | null
    eot_relevance: boolean
    claim_relevance: boolean
  }>
  boqSummary: {
    totalItems: number
    sampleItems: Array<{
      id: string
      item_number: string
      description: string
      unit: string
      tender_quantity: number
      awarded_rate: number
      total_amount: number
    }>
  }
  raBills: Array<{
    id: string
    bill_number: string
    submission_date: string | null
    work_certified_amount: number
    retention_amount: number
    net_payable_amount: number
    amount_received: number
    outstanding_balance: number
    status: string
  }>
  eotCases: Array<{
    id: string
    eot_reference: string
    cause: string
    start_date: string
    end_date: string | null
    claimed_days: number
    approved_days: number
    pending_days: number
    submission_date: string
    current_completion_date: string
    revised_completion_date: string
    sanction_authority: string | null
    sanction_order_number: string | null
    status: string
  }>
  variations: Array<{
    id: string
    reference_number: string
    type: string
    instruction_date: string
    instruction_authority: string
    proposed_item_description: string
    proposed_quantity: number
    difference_quantity: number
    proposed_amount: number
    approved_amount: number
    status: string
  }>
  claims: Array<{
    id: string
    claim_number: string
    claim_type: string
    title: string
    claim_date: string
    description: string
    basis_of_claim: string | null
    claimed_amount: number
    approved_amount: number
    paid_amount: number
    outstanding_amount: number
    status: string
  }>
  correspondence: Array<{
    id: string
    reference_number: string
    letter_number: string
    direction: string
    category: string
    status: string
    subject: string
    date: string
    sender: string
    recipient: string
    response_deadline: string | null
    tracking_consignment_number: string | null
  }>
  evidenceSummary: {
    totalItems: number
    items: Array<{
      id: string
      evidence_number: string
      type: string
      title: string
      document_date: string
      related_hindrance_id: string | null
      related_contract_event_id: string | null
      related_ra_bill_id: string | null
    }>
  }
  knownRecordIds: string[]
}

/**
 * Deterministic SQL context aggregator (Layer 1 of the Zero-Hallucination Shield).
 * Fetches verified PostgreSQL rows using the active user's RLS session.
 * Aligns strictly with real Supabase schema without non-existent columns.
 */
export async function getProjectContractContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectContractContext> {
  // 1. Fetch Project details (Supabase schema: id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status)
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status')
    .eq('id', projectId)
    .maybeSingle()

  // 2. Fetch associated Contract Master (public.contracts schema from migration 051)
  const { data: contract } = await supabase
    .from('contracts')
    .select(
      'id, agreement_number, work_order_number, nit_number, contract_title, employer_name, contracting_authority, contract_type, awarded_amount, estimated_cost, work_commencement_date, original_completion_date, current_completion_date, dlp_months, performance_security_amount, security_deposit_amount, retention_percentage, eot_clause, eot_notice_days, variation_clause, variation_limit_percent, escalation_clause, escalation_applicable, status'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contractId = contract?.id

  // 3. Fetch Contract Clauses (public.contract_clauses from migration 058)
  let clauses: any[] = []
  if (contractId) {
    const { data: clauseRows } = await supabase
      .from('contract_clauses')
      .select(
        'id, clause_number, clause_title, clause_text, category, notice_period_days, source_document_title, source_page_ref, eot_relevance, variation_relevance, claim_relevance, status'
      )
      .eq('contract_id', contractId)
      .limit(60)
    clauses = clauseRows || []
  }

  // 4. Fetch Hindrances (public.hindrances from migrations 040 & 055)
  const { data: hindrances } = await supabase
    .from('hindrances')
    .select(
      'id, hindrance_number, hindrance_code, category, description, location_chainage, start_date, end_date, status, delay_type, net_delay_days, duration_days, notice_served, notice_date, notice_reference_no, officer_acknowledged_by, officer_designation, affected_work, affected_boq_items, standard_status, remarks'
    )
    .eq('project_id', projectId)
    .order('start_date', { ascending: false })
    .limit(40)

  // 5. Fetch Contract Events (public.contract_events from migration 055)
  const { data: contractEvents } = await supabase
    .from('contract_events')
    .select(
      'id, event_number, event_type, event_date, start_date, end_date, location, description, cause, responsible_party, impact, estimated_delay_days, actual_delay_days, financial_impact, eot_relevance, eot_clause, claim_relevance, status, remarks'
    )
    .eq('project_id', projectId)
    .order('event_date', { ascending: false })
    .limit(40)

  // 6. Fetch BOQ Items (public.boq_items from migration 037)
  const { data: boqItems, count: boqCount } = await supabase
    .from('boq_items')
    .select('id, item_number, description, unit, tender_quantity, awarded_rate, total_amount', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .order('item_number', { ascending: true })
    .limit(30)

  // 7. Fetch RA Bills (public.ra_bills from migration 008)
  const { data: raBills } = await supabase
    .from('ra_bills')
    .select(
      'id, bill_number, submission_date, work_certified_amount, retention_amount, net_payable_amount, amount_received, date_received, outstanding_balance, status'
    )
    .eq('project_id', projectId)
    .order('submission_date', { ascending: false })
    .limit(20)

  // 8. Fetch EOT Cases (public.contract_eot_cases from migration 059)
  const { data: eotCases } = await supabase
    .from('contract_eot_cases')
    .select(
      'id, eot_reference, cause, start_date, end_date, claimed_days, approved_days, pending_days, submission_date, current_completion_date, revised_completion_date, sanction_authority, sanction_order_number, status'
    )
    .eq('project_id', projectId)
    .order('submission_date', { ascending: false })
    .limit(20)

  // 9. Fetch Variations & Extra Items (public.contract_variations from migration 060)
  const { data: variations } = await supabase
    .from('contract_variations')
    .select(
      'id, reference_number, type, instruction_date, instruction_authority, proposed_item_description, proposed_quantity, difference_quantity, proposed_amount, approved_amount, status'
    )
    .eq('project_id', projectId)
    .order('instruction_date', { ascending: false })
    .limit(25)

  // 10. Fetch Claims (public.contract_claims from migration 061)
  const { data: claims } = await supabase
    .from('contract_claims')
    .select(
      'id, claim_number, claim_type, title, claim_date, description, basis_of_claim, claimed_amount, approved_amount, paid_amount, outstanding_amount, status'
    )
    .eq('project_id', projectId)
    .order('claim_date', { ascending: false })
    .limit(20)

  // 11. Fetch Correspondence & Notices (public.contract_correspondence from migration 057)
  const { data: correspondence } = await supabase
    .from('contract_correspondence')
    .select(
      'id, reference_number, letter_number, date, direction, category, sender, recipient, subject, description, status, response_deadline, tracking_consignment_number'
    )
    .eq('project_id', projectId)
    .order('date', { ascending: false })
    .limit(30)

  // 12. Fetch Evidence Vault Items (public.evidence_vault from migration 056)
  const { data: evidenceItems, count: evidenceCount } = await supabase
    .from('evidence_vault')
    .select(
      'id, evidence_number, type, title, description, document_date, related_hindrance_id, related_contract_event_id, related_ra_bill_id',
      { count: 'exact' }
    )
    .eq('project_id', projectId)
    .order('document_date', { ascending: false })
    .limit(30)

  // Collect all known real database IDs to empower Layer 4 verification guard
  const knownRecordIds: string[] = []
  if (project?.id) knownRecordIds.push(project.id)
  if (contract?.id) knownRecordIds.push(contract.id)
  clauses.forEach((c) => c.id && knownRecordIds.push(c.id))
  ;(hindrances || []).forEach((h) => h.id && knownRecordIds.push(h.id))
  ;(contractEvents || []).forEach((e) => e.id && knownRecordIds.push(e.id))
  ;(boqItems || []).forEach((b) => b.id && knownRecordIds.push(b.id))
  ;(raBills || []).forEach((r) => r.id && knownRecordIds.push(r.id))
  ;(eotCases || []).forEach((e) => e.id && knownRecordIds.push(e.id))
  ;(variations || []).forEach((v) => v.id && knownRecordIds.push(v.id))
  ;(claims || []).forEach((c) => c.id && knownRecordIds.push(c.id))
  ;(correspondence || []).forEach((cr) => cr.id && knownRecordIds.push(cr.id))
  ;(evidenceItems || []).forEach((ev) => ev.id && knownRecordIds.push(ev.id))

  return {
    project: project
      ? {
          id: project.id,
          name: project.name,
          agency_name: project.agency_name,
          advertised_cost: project.advertised_cost ? Number(project.advertised_cost) : null,
          awarded_amount: project.awarded_amount ? Number(project.awarded_amount) : null,
          start_date: project.start_date,
          end_date: project.end_date,
          status: project.status,
        }
      : null,
    contract: contract
      ? {
          id: contract.id,
          contract_number: contract.agreement_number || contract.work_order_number || '',
          agreement_number: contract.agreement_number || '',
          work_name: contract.contract_title || '',
          authority_name: contract.employer_name || contract.contracting_authority || '',
          contract_type: contract.contract_type,
          contract_value: Number(contract.awarded_amount || 0),
          stipulated_start_date: contract.work_commencement_date,
          stipulated_completion_date: contract.original_completion_date,
          actual_completion_date: contract.current_completion_date,
          dlp_months: contract.dlp_months,
          performance_security_amount: Number(contract.performance_security_amount || 0),
          eot_clause: contract.eot_clause,
          variation_clause: contract.variation_clause,
          escalation_clause: contract.escalation_clause,
          status: contract.status,
        }
      : null,
    clauses: clauses.map((c) => ({
      id: c.id,
      clause_number: c.clause_number,
      clause_title: c.clause_title,
      clause_text: c.clause_text,
      category: c.category,
      notice_period_days: c.notice_period_days,
      source_document_title: c.source_document_title,
      source_page_ref: c.source_page_ref,
      eot_relevance: Boolean(c.eot_relevance),
      variation_relevance: Boolean(c.variation_relevance),
      claim_relevance: Boolean(c.claim_relevance),
      status: c.status,
    })),
    hindrances: (hindrances || []).map((h) => ({
      id: h.id,
      hindrance_number: h.hindrance_number,
      hindrance_code: h.hindrance_code || (h.hindrance_number ? `H-${h.hindrance_number}` : null),
      description: h.description,
      category: h.category,
      start_date: h.start_date,
      end_date: h.end_date,
      duration_days: Number(h.duration_days ?? h.net_delay_days ?? 0),
      net_delay_days: Number(h.net_delay_days ?? 0),
      delay_type: h.delay_type,
      status: h.status,
      standard_status: h.standard_status || h.status,
      notice_served: Boolean(h.notice_served),
      notice_date: h.notice_date,
      notice_reference_no: h.notice_reference_no,
      location_chainage: h.location_chainage,
      affected_work: h.affected_work,
      affected_boq_items: h.affected_boq_items || [],
      remarks: h.remarks,
    })),
    contractEvents: (contractEvents || []).map((e) => ({
      id: e.id,
      event_number: e.event_number,
      event_type: e.event_type,
      title: `${e.event_number}: ${e.event_type}`,
      description: e.description,
      cause: e.cause,
      responsible_party: e.responsible_party,
      event_date: e.event_date,
      start_date: e.start_date,
      end_date: e.end_date,
      status: e.status,
      estimated_delay_days: e.estimated_delay_days ? Number(e.estimated_delay_days) : null,
      actual_delay_days: e.actual_delay_days ? Number(e.actual_delay_days) : null,
      financial_impact: e.financial_impact ? Number(e.financial_impact) : null,
      eot_relevance: Boolean(e.eot_relevance),
      claim_relevance: Boolean(e.claim_relevance),
    })),
    boqSummary: {
      totalItems: boqCount || 0,
      sampleItems: (boqItems || []).map((b) => ({
        id: b.id,
        item_number: b.item_number,
        description: b.description,
        unit: b.unit,
        tender_quantity: Number(b.tender_quantity || 0),
        awarded_rate: Number(b.awarded_rate || 0),
        total_amount: Number(b.total_amount || 0),
      })),
    },
    raBills: (raBills || []).map((r) => ({
      id: r.id,
      bill_number: r.bill_number,
      submission_date: r.submission_date,
      work_certified_amount: Number(r.work_certified_amount || 0),
      retention_amount: Number(r.retention_amount || 0),
      net_payable_amount: Number(r.net_payable_amount || 0),
      amount_received: Number(r.amount_received || 0),
      outstanding_balance: Number(r.outstanding_balance || 0),
      status: r.status,
    })),
    eotCases: (eotCases || []).map((e) => ({
      id: e.id,
      eot_reference: e.eot_reference,
      cause: e.cause,
      start_date: e.start_date,
      end_date: e.end_date,
      claimed_days: Number(e.claimed_days || 0),
      approved_days: Number(e.approved_days || 0),
      pending_days: Number(e.pending_days || 0),
      submission_date: e.submission_date,
      current_completion_date: e.current_completion_date,
      revised_completion_date: e.revised_completion_date,
      sanction_authority: e.sanction_authority,
      sanction_order_number: e.sanction_order_number,
      status: e.status,
    })),
    variations: (variations || []).map((v) => ({
      id: v.id,
      reference_number: v.reference_number,
      type: v.type,
      instruction_date: v.instruction_date,
      instruction_authority: v.instruction_authority,
      proposed_item_description: v.proposed_item_description,
      proposed_quantity: Number(v.proposed_quantity || 0),
      difference_quantity: Number(v.difference_quantity || 0),
      proposed_amount: Number(v.proposed_amount || 0),
      approved_amount: Number(v.approved_amount || 0),
      status: v.status,
    })),
    claims: (claims || []).map((c) => ({
      id: c.id,
      claim_number: c.claim_number,
      claim_type: c.claim_type,
      title: c.title,
      claim_date: c.claim_date,
      description: c.description,
      basis_of_claim: c.basis_of_claim,
      claimed_amount: Number(c.claimed_amount || 0),
      approved_amount: Number(c.approved_amount || 0),
      paid_amount: Number(c.paid_amount || 0),
      outstanding_amount: Number(c.outstanding_amount || 0),
      status: c.status,
    })),
    correspondence: (correspondence || []).map((cr) => ({
      id: cr.id,
      reference_number: cr.reference_number,
      letter_number: cr.letter_number,
      direction: cr.direction,
      category: cr.category,
      status: cr.status,
      subject: cr.subject,
      date: cr.date,
      sender: cr.sender,
      recipient: cr.recipient,
      response_deadline: cr.response_deadline,
      tracking_consignment_number: cr.tracking_consignment_number,
    })),
    evidenceSummary: {
      totalItems: evidenceCount || 0,
      items: (evidenceItems || []).map((ev) => ({
        id: ev.id,
        evidence_number: ev.evidence_number,
        type: ev.type,
        title: ev.title,
        document_date: ev.document_date,
        related_hindrance_id: ev.related_hindrance_id,
        related_contract_event_id: ev.related_contract_event_id,
        related_ra_bill_id: ev.related_ra_bill_id,
      })),
    },
    knownRecordIds,
  }
}
