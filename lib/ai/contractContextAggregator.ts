import { SupabaseClient } from '@supabase/supabase-js'

export interface ProjectContractContext {
  project: {
    id: string
    name: string
    code: string | null
    status: string | null
  } | null
  contract: {
    id: string
    contract_number: string
    work_name: string
    authority_name: string | null
    contract_value: number
    stipulated_start_date: string | null
    stipulated_completion_date: string | null
    actual_completion_date: string | null
    dlp_months: number | null
    performance_security_amount: number | null
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
    status: string
  }>
  hindrances: Array<{
    id: string
    hindrance_code: string | null
    description: string
    category: string | null
    cause_of_delay: string | null
    delay_attributed_to: string | null
    start_date: string
    end_date: string | null
    duration_days: number | null
    status: string | null
    standard_status: string | null
    is_critical_path: boolean
    affected_work: string | null
    affected_boq_items: string[] | null
  }>
  contractEvents: Array<{
    id: string
    event_type: string
    category: string
    title: string
    description: string
    event_date: string
    notified_date: string | null
    status: string
    time_impact_days: number | null
    cost_impact: number | null
  }>
  boqSummary: {
    totalItems: number
    sampleItems: Array<{
      id: string
      item_number: string
      description: string
      unit: string
      estimated_quantity: number
      rate: number
      amount: number
    }>
  }
  raBills: Array<{
    id: string
    bill_number: string
    submission_date: string | null
    gross_amount: number
    work_certified_amount: number | null
    net_payable_amount: number | null
    status: string
    payment_status: string | null
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
    status: string
  }>
  variations: Array<{
    id: string
    reference_number: string
    type: string
    instruction_date: string
    instruction_authority: string
    proposed_item_description: string
    difference_amount: number
    status: string
  }>
  claims: Array<{
    id: string
    claim_number: string
    claim_type: string
    title: string
    claim_date: string
    description: string
    total_claimed_amount: number
    status: string
  }>
  correspondence: Array<{
    id: string
    reference_number: string
    direction: string
    category: string
    status: string
    subject: string
    letter_date: string
    sender: string
    recipient: string
    postal_tracking_number: string | null
    response_due_date: string | null
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
 * Never invents, guesses, or hallucinates data.
 */
export async function getProjectContractContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectContractContext> {
  // 1. Fetch Project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, code, status')
    .eq('id', projectId)
    .maybeSingle()

  // 2. Fetch associated Contract Master
  const { data: contract } = await supabase
    .from('contracts')
    .select(
      'id, contract_number, work_name, authority_name, contract_value, stipulated_start_date, stipulated_completion_date, actual_completion_date, defect_liability_period_months, performance_security_amount, status'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contractId = contract?.id

  // 3. Fetch Contract Clauses
  let clauses: any[] = []
  if (contractId) {
    const { data: clauseRows } = await supabase
      .from('contract_clauses')
      .select(
        'id, clause_number, clause_title, clause_text, category, notice_period_days, source_document_title, source_page_ref, status'
      )
      .eq('contract_id', contractId)
      .limit(60)
    clauses = clauseRows || []
  }

  // 4. Fetch Hindrances
  const { data: hindrances } = await supabase
    .from('hindrances')
    .select(
      'id, hindrance_code, description, category, cause_of_delay, delay_attributed_to, start_date, end_date, duration_days, status, standard_status, is_critical_path, affected_work, affected_boq_items'
    )
    .eq('project_id', projectId)
    .order('start_date', { ascending: false })
    .limit(40)

  // 5. Fetch Contract Events
  const { data: contractEvents } = await supabase
    .from('contract_events')
    .select(
      'id, event_type, category, title, description, event_date, notified_date, status, time_impact_days, cost_impact'
    )
    .eq('project_id', projectId)
    .order('event_date', { ascending: false })
    .limit(40)

  // 6. Fetch BOQ Items
  const { data: boqItems, count: boqCount } = await supabase
    .from('boq_items')
    .select('id, item_number, description, unit, estimated_quantity, rate, amount', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .order('item_number', { ascending: true })
    .limit(30)

  // 7. Fetch RA Bills
  const { data: raBills } = await supabase
    .from('ra_bills')
    .select(
      'id, bill_number, submission_date, gross_amount, work_certified_amount, net_payable_amount, status, payment_status'
    )
    .eq('project_id', projectId)
    .order('submission_date', { ascending: false })
    .limit(20)

  // 8. Fetch EOT Cases
  const { data: eotCases } = await supabase
    .from('contract_eot_cases')
    .select(
      'id, eot_reference, cause, start_date, end_date, claimed_days, approved_days, pending_days, submission_date, current_completion_date, revised_completion_date, sanction_authority, status'
    )
    .eq('project_id', projectId)
    .order('submission_date', { ascending: false })
    .limit(20)

  // 9. Fetch Variations & Extra Items
  const { data: variations } = await supabase
    .from('contract_variations')
    .select(
      'id, reference_number, type, instruction_date, instruction_authority, proposed_item_description, difference_amount, status'
    )
    .eq('project_id', projectId)
    .order('instruction_date', { ascending: false })
    .limit(25)

  // 10. Fetch Claims
  const { data: claims } = await supabase
    .from('contract_claims')
    .select('id, claim_number, claim_type, title, claim_date, description, total_claimed_amount, status')
    .eq('project_id', projectId)
    .order('claim_date', { ascending: false })
    .limit(20)

  // 11. Fetch Correspondence & Notices
  const { data: correspondence } = await supabase
    .from('contract_correspondence')
    .select(
      'id, reference_number, direction, category, status, subject, letter_date, sender, recipient, postal_tracking_number, response_due_date'
    )
    .eq('project_id', projectId)
    .order('letter_date', { ascending: false })
    .limit(30)

  // 12. Fetch Evidence Vault Items
  const { data: evidenceItems, count: evidenceCount } = await supabase
    .from('evidence_vault')
    .select(
      'id, evidence_number, type, title, document_date, related_hindrance_id, related_contract_event_id, related_ra_bill_id',
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
          code: project.code,
          status: project.status,
        }
      : null,
    contract: contract
      ? {
          id: contract.id,
          contract_number: contract.contract_number,
          work_name: contract.work_name,
          authority_name: contract.authority_name,
          contract_value: Number(contract.contract_value || 0),
          stipulated_start_date: contract.stipulated_start_date,
          stipulated_completion_date: contract.stipulated_completion_date,
          actual_completion_date: contract.actual_completion_date,
          dlp_months: contract.defect_liability_period_months,
          performance_security_amount: Number(contract.performance_security_amount || 0),
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
      status: c.status,
    })),
    hindrances: (hindrances || []).map((h) => ({
      id: h.id,
      hindrance_code: h.hindrance_code,
      description: h.description,
      category: h.category,
      cause_of_delay: h.cause_of_delay,
      delay_attributed_to: h.delay_attributed_to,
      start_date: h.start_date,
      end_date: h.end_date,
      duration_days: h.duration_days,
      status: h.status,
      standard_status: h.standard_status,
      is_critical_path: Boolean(h.is_critical_path),
      affected_work: h.affected_work,
      affected_boq_items: h.affected_boq_items,
    })),
    contractEvents: (contractEvents || []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      category: e.category,
      title: e.title,
      description: e.description,
      event_date: e.event_date,
      notified_date: e.notified_date,
      status: e.status,
      time_impact_days: e.time_impact_days,
      cost_impact: e.cost_impact ? Number(e.cost_impact) : null,
    })),
    boqSummary: {
      totalItems: boqCount || 0,
      sampleItems: (boqItems || []).map((b) => ({
        id: b.id,
        item_number: b.item_number,
        description: b.description,
        unit: b.unit,
        estimated_quantity: Number(b.estimated_quantity || 0),
        rate: Number(b.rate || 0),
        amount: Number(b.amount || 0),
      })),
    },
    raBills: (raBills || []).map((r) => ({
      id: r.id,
      bill_number: r.bill_number,
      submission_date: r.submission_date,
      gross_amount: Number(r.gross_amount || 0),
      work_certified_amount: r.work_certified_amount ? Number(r.work_certified_amount) : null,
      net_payable_amount: r.net_payable_amount ? Number(r.net_payable_amount) : null,
      status: r.status,
      payment_status: r.payment_status,
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
      status: e.status,
    })),
    variations: (variations || []).map((v) => ({
      id: v.id,
      reference_number: v.reference_number,
      type: v.type,
      instruction_date: v.instruction_date,
      instruction_authority: v.instruction_authority,
      proposed_item_description: v.proposed_item_description,
      difference_amount: Number(v.difference_amount || 0),
      status: v.status,
    })),
    claims: (claims || []).map((c) => ({
      id: c.id,
      claim_number: c.claim_number,
      claim_type: c.claim_type,
      title: c.title,
      claim_date: c.claim_date,
      description: c.description,
      total_claimed_amount: Number(c.total_claimed_amount || 0),
      status: c.status,
    })),
    correspondence: (correspondence || []).map((cr) => ({
      id: cr.id,
      reference_number: cr.reference_number,
      direction: cr.direction,
      category: cr.category,
      status: cr.status,
      subject: cr.subject,
      letter_date: cr.letter_date,
      sender: cr.sender,
      recipient: cr.recipient,
      postal_tracking_number: cr.postal_tracking_number,
      response_due_date: cr.response_due_date,
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
