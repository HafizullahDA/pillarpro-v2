export type VariationType =
  | 'DEVIATION'
  | 'VARIATION'
  | 'EXTRA_ITEM'
  | 'SUBSTITUTED_ITEM'

export type VariationStatus =
  | 'PROPOSED'
  | 'UNDER_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'BILLED'
  | 'CLOSED'

export interface ContractVariation {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null

  // Identification
  reference_number: string
  type: VariationType

  // Instruction & Authority
  instruction_date: string
  instruction_authority: string

  // BOQ Item Links
  original_boq_item_id?: string | null
  proposed_item_code?: string | null
  proposed_item_description: string
  proposed_unit: string

  // Quantities & Differences
  original_quantity: number
  proposed_quantity: number
  difference_quantity: number

  // Rates & Financial Amounts
  original_rate: number
  proposed_rate: number
  proposed_amount: number

  // Deletion / Scope Reduction
  is_deletion: boolean
  deleted_work_amount: number

  // Justification & Documentation
  reason: string
  supporting_document_url?: string | null
  evidence_vault_id?: string | null
  site_instruction_reference?: string | null
  correspondence_id?: string | null

  // Sanction / Approval
  status: VariationStatus
  approval_date?: string | null
  approved_authority?: string | null
  approved_order_number?: string | null
  approved_quantity: number
  approved_rate: number
  approved_amount: number

  // Execution & Realization
  executed_quantity: number
  billed_quantity: number
  paid_amount: number

  // Relational Links
  related_measurement_ids?: string[]
  related_ra_bill_ids?: string[]
  remarks?: string | null

  created_at: string
  updated_at: string
  created_by?: string | null

  // Joined relations
  projects?: {
    id?: string
    name: string
    agency_name?: string | null
    awarded_amount?: number | null
  } | null
  contracts?: {
    id?: string
    agreement_number?: string | null
    contract_title?: string | null
    awarded_amount?: number | null
  } | null
  boq_items?: {
    id?: string
    item_number: string
    description: string
    unit: string
    tender_quantity: number
    awarded_rate: number
  } | null
}

export interface VariationContractSummary {
  originalContractValue: number
  proposedVariations: number
  approvedVariations: number
  approvedExtraItems: number
  deletedWork: number
  currentContractValue: number
  executedValue: number
  billedValue: number
  paidValue: number
  totalCount: number
  approvedCount: number
  proposedCount: number
  underApprovalCount: number
  rejectedCount: number
}

export const VARIATION_TYPE_CONFIG: Record<
  VariationType,
  {
    label: string
    clauseRef: string
    description: string
    badgeClass: string
    borderClass: string
    bgClass: string
  }
> = {
  DEVIATION: {
    label: 'Deviation (Qty Limit)',
    clauseRef: 'Clause 12.2',
    description: 'Quantity variation on existing BOQ item beyond tender limits',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderClass: 'border-indigo-300',
    bgClass: 'bg-indigo-50/60',
  },
  VARIATION: {
    label: 'Variation Order',
    clauseRef: 'Clause 12.1',
    description: 'Scope or specification modification ordered by the Engineer',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    borderClass: 'border-purple-300',
    bgClass: 'bg-purple-50/60',
  },
  EXTRA_ITEM: {
    label: 'Extra Item (New)',
    clauseRef: 'Clause 12.3',
    description: 'New work item not part of the original tender schedule of quantities',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50/60',
  },
  SUBSTITUTED_ITEM: {
    label: 'Substituted Item',
    clauseRef: 'Clause 12.4',
    description: 'Replaces an original BOQ item with modified materials/specifications',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-300',
    bgClass: 'bg-amber-50/60',
  },
}

export const VARIATION_STATUS_CONFIG: Record<
  VariationStatus,
  {
    label: string
    description: string
    badgeClass: string
  }
> = {
  PROPOSED: {
    label: 'Proposed (Unapproved)',
    description: 'Contractor proposal submitted to Department for scrutiny',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  UNDER_APPROVAL: {
    label: 'Under Approval',
    description: 'Under technical sanction / rate analysis review by EE/SE',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  APPROVED: {
    label: 'Approved (Sanctioned)',
    description: 'Formally sanctioned under Variation Order / Clause 12',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  REJECTED: {
    label: 'Disallowed / Rejected',
    description: 'Declined or omitted by the Contracting Authority',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  EXECUTED: {
    label: 'Executed (Site Measured)',
    description: 'Physically measured in e-Measurement Book',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
  },
  BILLED: {
    label: 'Billed in RA Bill',
    description: 'Included and claimed in Running Account Bill',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  },
  CLOSED: {
    label: 'Settled & Closed',
    description: 'Fully accounted and settled in Final Bill',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
}
