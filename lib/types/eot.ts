export type EOTStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED'

export interface EOTCase {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null

  // Case Identification
  eot_reference: string
  cause: string

  // Delay Period Claimed
  start_date: string
  end_date?: string | null
  claimed_days: number
  approved_days: number
  pending_days: number

  // Milestone Dates
  submission_date: string
  department_response_date?: string | null
  current_completion_date: string
  revised_completion_date: string

  // Sanction Details
  sanction_authority?: string | null
  sanction_order_number?: string | null

  // Status & Notes
  status: EOTStatus
  remarks?: string | null

  // Relational Links (Array of foreign keys for fast access)
  event_ids: string[]
  hindrance_ids: string[]
  evidence_ids: string[]
  correspondence_ids: string[]

  // System Audit
  created_at: string
  updated_at: string
  created_by?: string | null

  // Joined Relations
  projects?: {
    id: string
    name: string
    agency_name?: string | null
  } | null
  contracts?: {
    id: string
    agreement_number: string
    contract_title?: string | null
  } | null
}

export interface EOTMetrics {
  totalCases: number
  totalClaimedDays: number
  totalApprovedDays: number
  totalPendingDays: number
  draftCount: number
  submittedCount: number
  underReviewCount: number
  partiallyApprovedCount: number
  approvedCount: number
  rejectedCount: number
}

export const EOT_STATUS_CONFIG: Record<
  EOTStatus,
  { label: string; badgeColor: string; description: string; factualTerm: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Initial internal delay compilation',
    factualTerm: 'Draft Case',
  },
  PREPARING: {
    label: 'Preparing Dossier',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Compiling contemporaneous proofs, letters and joint records',
    factualTerm: 'Dossier in Preparation',
  },
  SUBMITTED: {
    label: 'Submitted to Dept',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Formal Form 27 dispatched to Executive Engineer',
    factualTerm: 'Dispatched to Employer',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'Under technical scrutiny by EE / SE / Consultant',
    factualTerm: 'Pending Decision',
  },
  PARTIALLY_APPROVED: {
    label: 'Partially Approved',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    description: 'Department approved partial extension of time',
    factualTerm: 'Partial Days Approved',
  },
  APPROVED: {
    label: 'Sanctioned / Approved',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Full extension granted by competent authority without LD',
    factualTerm: 'Days Approved',
  },
  REJECTED: {
    label: 'Rejected by Dept',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Extension disallowed; preserves dispute reservation',
    factualTerm: 'Disallowed by Employer',
  },
  CLOSED: {
    label: 'Closed',
    badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    description: 'Concluded upon project handover or final bill settlement',
    factualTerm: 'Concluded Case',
  },
}
