export type CorrespondenceDirection = 'INCOMING' | 'OUTGOING'

export type CorrespondenceCategory =
  | 'CORRESPONDENCE'
  | 'SITE_INSTRUCTION'
  | 'NOTICE'
  | 'MINUTES_OF_MEETING'
  | 'ORDER'

export type CorrespondenceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'RESPONSE_REQUIRED'
  | 'RESPONDED'
  | 'CLOSED'

export type DeadlineUrgency =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_7_DAYS'
  | 'UPCOMING'
  | 'RESOLVED'

export interface ContractNoticeRule {
  id: string
  organization_id: string
  contract_id?: string | null
  clause_reference: string
  clause_name: string
  notice_type: string
  notice_period_days: number
  trigger_event: string
  description?: string | null
}

export interface CorrespondenceRecord {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  reference_number: string
  letter_number: string
  date: string
  direction: CorrespondenceDirection
  category: CorrespondenceCategory
  sender: string
  recipient: string
  subject: string
  description?: string | null

  // Relational business links
  related_contract_event_id?: string | null
  related_hindrance_id?: string | null
  related_boq_item_id?: string | null
  related_ra_bill_id?: string | null
  related_eot_id?: string | null
  related_claim_id?: string | null

  // Attachment
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_size_bytes?: number | null

  // Deadline & Response Tracking
  response_required: boolean
  response_deadline?: string | null
  responded_date?: string | null
  responded_reference_id?: string | null
  clause_reference?: string | null
  notice_period_days?: number | null
  event_date?: string | null

  // Status & Dispatch Details
  status: CorrespondenceStatus
  mode_of_dispatch?: string | null
  tracking_consignment_number?: string | null
  notes?: string | null

  created_by?: string | null
  created_at: string
  updated_at: string

  // Joined relations
  projects?: {
    name: string
  } | null
  contracts?: {
    agreement_number?: string | null
    contract_title?: string | null
  } | null
  contract_events?: {
    event_number: string
    description: string
  } | null
  hindrances?: {
    hindrance_number: number
    description: string
  } | null
}

export interface DeadlineCalculation {
  eventDate: string
  noticePeriodDays: number
  calculatedDeadline: string
  daysRemaining: number
  urgency: DeadlineUrgency
  urgencyLabel: string
  formulaExplanation: string
}

export const CORRESPONDENCE_CATEGORY_CONFIG: Record<
  CorrespondenceCategory,
  { label: string; icon: string; badgeColor: string; description: string }
> = {
  CORRESPONDENCE: {
    label: 'Official Letter',
    icon: '✉️',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Formal letters between Contractor, Executive Engineer, and Consultants',
  },
  SITE_INSTRUCTION: {
    label: 'Site Instruction',
    icon: '📝',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Site Order Book entries, inspection directives, and field instructions',
  },
  NOTICE: {
    label: 'Contractual Notice',
    icon: '⚠️',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Statutory notices under Clause 2, Clause 5, Clause 10CA/10CC, Clause 12',
  },
  MINUTES_OF_MEETING: {
    label: 'Minutes of Meeting',
    icon: '📋',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Signed minutes of monthly progress reviews and joint site meetings',
  },
  ORDER: {
    label: 'Official Order',
    icon: '🏛️',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Sanction orders, administrative approvals, and EOT sanction memos',
  },
}

export const STANDARD_GOVERNMENT_NOTICE_RULES: Omit<ContractNoticeRule, 'id' | 'organization_id'>[] = [
  {
    clause_reference: 'Clause 5 (CPWD GCC)',
    clause_name: 'Intimation of Delay / Impediment',
    notice_type: 'delay_notice',
    notice_period_days: 14,
    trigger_event: 'Date of occurrence of impediment or cause of delay',
    description: 'Mandatory statutory 14-day notice to preserve right to EOT and Price Escalation',
  },
  {
    clause_reference: 'Clause 2 (CPWD GCC)',
    clause_name: 'Compensation for Delay / Liquidated Damages Warning',
    notice_type: 'ld_defense',
    notice_period_days: 7,
    trigger_event: 'Date of receipt of show cause / penalty warning from Superintending Engineer',
    description: 'Contractor formal reply refuting non-performance and establishing department delays',
  },
  {
    clause_reference: 'Clause 12 (CPWD GCC)',
    clause_name: 'Deviations & Extra Item Rate Claim',
    notice_type: 'variation_notice',
    notice_period_days: 14,
    trigger_event: 'Date of receipt of alteration instruction or execution beyond deviation limit',
    description: 'Notice claiming market rate analysis for quantities exceeding deviation limits',
  },
  {
    clause_reference: 'Clause 10CA / 10CC (CPWD GCC)',
    clause_name: 'Price Escalation Reservation',
    notice_type: 'escalation_notice',
    notice_period_days: 30,
    trigger_event: 'Date of publication of monthly price indices by RBI / Labour Bureau',
    description: 'Reservation of right to statutory price adjustment during extended contract period',
  },
  {
    clause_reference: 'Clause 25 (CPWD GCC)',
    clause_name: 'Dispute Resolution / Conciliation Notice',
    notice_type: 'dispute_notice',
    notice_period_days: 15,
    trigger_event: 'Date of notification of final decision or rejected claim by EE',
    description: 'Formal referral to Dispute Redressal Committee (DRC) or Chief Engineer',
  },
  {
    clause_reference: 'FIDIC Clause 20.1 / 8.4',
    clause_name: 'Contractor Claim Notice (FIDIC Red/Yellow)',
    notice_type: 'contractor_claim',
    notice_period_days: 28,
    trigger_event: 'Date contractor became aware or should have become aware of event',
    description: 'Strict 28-day condition precedent notice under international / World Bank contracts',
  },
]
