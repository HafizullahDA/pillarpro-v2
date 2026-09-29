export type ClaimType =
  | 'DELAY_RELATED'
  | 'PROLONGATION'
  | 'IDLE_LABOUR'
  | 'IDLE_MACHINERY'
  | 'ADDITIONAL_MATERIAL'
  | 'ADDITIONAL_TRANSPORTATION'
  | 'VARIATION'
  | 'ESCALATION'
  | 'PAYMENT_RELATED'
  | 'OTHER'

export type ClaimStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CLOSED'

export interface ContractClaim {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null

  // Identification & Classification
  claim_number: string
  claim_type: ClaimType
  title: string
  claim_date: string

  // Factual Narrative & Clause Basis
  description: string
  basis_of_claim?: string | null

  // Financial Realization (Claimed vs Approved vs Paid vs Outstanding)
  claimed_amount: number
  approved_amount: number
  paid_amount: number
  outstanding_amount: number

  // Adjudication & Determination
  status: ClaimStatus
  submission_date?: string | null
  adjudication_date?: string | null
  adjudication_authority?: string | null
  order_reference_number?: string | null
  remarks?: string | null

  // Relational Array Links to Existing Business Records
  event_ids: string[]
  hindrance_ids: string[]
  eot_case_ids: string[]
  evidence_ids: string[]
  correspondence_ids: string[]
  boq_item_ids: string[]
  measurement_ids: string[]
  ra_bill_ids: string[]
  labour_record_ids: string[]
  machinery_log_ids: string[]
  expense_ids: string[]

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
}

export interface ClaimFinancialSummary {
  totalClaimed: number
  totalApproved: number
  totalPaid: number
  totalOutstanding: number
  totalCount: number
  approvedCount: number
  underReviewCount: number
  rejectedCount: number
  paidCount: number
  draftCount: number
}

export const CLAIM_TYPE_CONFIG: Record<
  ClaimType,
  {
    label: string
    clauseRef: string
    description: string
    badgeClass: string
    icon: string
  }
> = {
  DELAY_RELATED: {
    label: 'Delay-related Damages',
    clauseRef: 'Clause 2 / Delay',
    description: 'Damages resulting directly from employer-caused critical delays',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '⏱️',
  },
  PROLONGATION: {
    label: 'Prolongation & Head-Office Overheads',
    clauseRef: 'Hudson / Emden Formula',
    description: 'Extended stay site prelims and unabsorbed head-office overheads',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🏢',
  },
  IDLE_LABOUR: {
    label: 'Idle Labour Standing Charges',
    clauseRef: 'Standing Wages',
    description: 'Compensation for mobilized labour kept unutilized due to hindrances',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '👷',
  },
  IDLE_MACHINERY: {
    label: 'Idle Machinery & Plant Hire',
    clauseRef: 'Machinery Hire Charges',
    description: 'Losses for idle cranes, excavators, transit mixers, and batching plants',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: '🚜',
  },
  ADDITIONAL_MATERIAL: {
    label: 'Additional Material & Wastage',
    clauseRef: 'Material Cost Differential',
    description: 'Material deterioration, extra handling, or enforced specification revisions',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '🧱',
  },
  ADDITIONAL_TRANSPORTATION: {
    label: 'Additional Transportation & Lead',
    clauseRef: 'Extra Lead / Royalty',
    description: 'Enforced quarry changes, additional transport distance, and royalty increases',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🚛',
  },
  VARIATION: {
    label: 'Variation & Scope Impact',
    clauseRef: 'Clause 12 Deviation / Extra Item',
    description: 'Financial compensation for extra non-schedule items or substantial deviations',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: '📑',
  },
  ESCALATION: {
    label: 'Price Escalation (Materials/Labour/POL)',
    clauseRef: 'Clause 10CA / 10CC',
    description: 'Statutory price adjustment for cement, steel, POL, and labour cost indices',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: '📈',
  },
  PAYMENT_RELATED: {
    label: 'Payment Delay & Interest',
    clauseRef: 'Interest / Retention Release',
    description: 'Interest on delayed RA bill payments and unjustified retention withholding',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '💳',
  },
  OTHER: {
    label: 'Other Contractual Claim',
    clauseRef: 'General Conditions of Contract',
    description: 'Miscellaneous damages or contractual remedies under Indian Contract Act',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: '⚖️',
  },
}

export const CLAIM_STATUS_CONFIG: Record<
  ClaimStatus,
  {
    label: string
    description: string
    badgeClass: string
  }
> = {
  DRAFT: {
    label: 'Draft Memorial',
    description: 'Draft claim compilation in preparation by contractor',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  PREPARING: {
    label: 'Compiling Evidence',
    description: 'Attaching contemporaneous site logs, letters and proof records',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  SUBMITTED: {
    label: 'Dispatched to Employer',
    description: 'Formal statement of claim dispatched under contract notice rules',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  UNDER_REVIEW: {
    label: 'Under Adjudication / Review',
    description: 'Under active scrutiny by Superintending Engineer / DRB / Arbitrator',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  PARTIALLY_APPROVED: {
    label: 'Partially Approved',
    description: 'Partial quantum sanctioned by the deciding authority',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
  },
  APPROVED: {
    label: 'Approved / Awarded',
    description: 'Formally sanctioned by Department order or Arbitral Award',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  REJECTED: {
    label: 'Disallowed / Declined',
    description: 'Disallowed by the deciding authority or time-barred under notice clauses',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  PAID: {
    label: 'Disbursed / Realized',
    description: 'Claim amount paid and cleared through department treasury',
    badgeClass: 'bg-emerald-200 text-emerald-950 border-emerald-400 font-bold',
  },
  CLOSED: {
    label: 'Concluded & Settled',
    description: 'Claim formally concluded with no pending legal recourse',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
  },
}
