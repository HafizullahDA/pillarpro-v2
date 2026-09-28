export type ClauseCategory =
  | 'EOT'
  | 'PAYMENT'
  | 'MEASUREMENT'
  | 'VARIATION'
  | 'DEVIATION'
  | 'ESCALATION'
  | 'LD'
  | 'SECURITY'
  | 'BG'
  | 'RETENTION'
  | 'INSURANCE'
  | 'QUALITY'
  | 'SAFETY'
  | 'CORRESPONDENCE'
  | 'DISPUTE'
  | 'ARBITRATION'
  | 'OTHER'

export type ClauseStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

export type ObligationType = 'ONE_TIME' | 'RECURRING' | 'MILESTONE_TRIGGERED' | 'EVENT_TRIGGERED'

export type ObligationStatus = 'ACTIVE' | 'COMPLIED' | 'OVERDUE' | 'WAIVED'

export type ResponsibleParty = 'CONTRACTOR' | 'DEPARTMENT' | 'CONSULTANT' | 'JOINT'

export interface ContractClause {
  id: string
  organization_id: string
  contract_id: string
  document_id?: string | null
  clause_number: string
  clause_title: string
  clause_text: string
  category: ClauseCategory
  notice_period_days?: number | null
  payment_requirement?: string | null
  eot_relevance: boolean
  variation_relevance: boolean
  claim_relevance: boolean
  bg_relevance: boolean
  retention_relevance: boolean
  ld_relevance: boolean
  escalation_relevance: boolean
  status: ClauseStatus
  is_ai_extracted: boolean
  source_page_ref?: string | null
  source_document_title?: string | null
  ai_confidence_score?: number | null
  ai_extraction_notes?: string | null
  verified_by?: string | null
  verified_at?: string | null
  review_notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  contract_documents?: {
    id: string
    title: string
    document_type: string
    file_url?: string
  } | null
  contracts?: {
    id: string
    agreement_number: string
    contract_title?: string | null
  } | null
}

export interface ContractObligation {
  id: string
  organization_id: string
  contract_id: string
  clause_id?: string | null
  title: string
  description?: string | null
  responsible_party: ResponsibleParty
  obligation_type: ObligationType
  trigger_event?: string | null
  deadline_rule?: string | null
  due_date?: string | null
  status: ObligationStatus
  completion_date?: string | null
  remarks?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  contract_clauses?: {
    id: string
    clause_number: string
    clause_title: string
    category: ClauseCategory
  } | null
}

export interface CandidateContractParams {
  contract_value?: number | null
  completion_date?: string | null
  dlp_months?: number | null
  earnest_money_deposit?: number | null
  performance_security_amount?: number | null
  performance_security_percent?: number | null
  security_deposit_amount?: number | null
  security_deposit_percent?: number | null
  retention_percentage?: number | null
  liquidated_damages_percent_per_week?: number | null
  liquidated_damages_max_cap_percent?: number | null
  eot_notice_days?: number | null
  source_page_ref?: string | null
}

export interface AIClauseExtractionResult {
  candidate_params: CandidateContractParams
  extracted_clauses: Array<Omit<ContractClause, 'id' | 'organization_id' | 'contract_id' | 'created_at' | 'updated_at'>>
  total_clauses_found: number
  document_title?: string
  disclaimer: string
}

export const CLAUSE_CATEGORY_CONFIG: Record<
  ClauseCategory,
  { label: string; icon: string; badgeColor: string; description: string }
> = {
  EOT: {
    label: 'Extension of Time (EOT)',
    icon: '⏳',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Delays, hindrances, time extensions, and Force Majeure provisions',
  },
  PAYMENT: {
    label: 'Payment & RA Billing',
    icon: '💳',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Running account bills, payment cycles, advance payments, and interest on delayed payments',
  },
  MEASUREMENT: {
    label: 'Measurement & Checking',
    icon: '📏',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Measurement Book rules, joint measurements, test checks, and hidden items',
  },
  VARIATION: {
    label: 'Variations & Extra Items',
    icon: '📝',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Deviations, extra items, rate analysis, and non-schedule items',
  },
  DEVIATION: {
    label: 'Deviation Limits',
    icon: '📊',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Permissible deviation limits (e.g. +/- 30%) and market rate triggers',
  },
  ESCALATION: {
    label: 'Price Escalation',
    icon: '📈',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Clauses 10CA, 10CC, price index adjustments for cement, steel, POL, and labour',
  },
  LD: {
    label: 'Liquidated Damages (LD)',
    icon: '⚖️',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Delay penalties, weekly LD deductions, compensation caps, and show-cause procedures',
  },
  SECURITY: {
    label: 'Security Deposit (SD)',
    icon: '🛡️',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Security deposit deduction, cash conversion, and release schedule',
  },
  BG: {
    label: 'Bank Guarantee (PBG)',
    icon: '🏦',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Performance bank guarantee validity, submission deadline, and renewal covenants',
  },
  RETENTION: {
    label: 'Retention Money',
    icon: '💰',
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    description: 'RA bill retention withholdings and release upon virtual completion / DLP',
  },
  INSURANCE: {
    label: 'Insurance & Indemnity',
    icon: '📄',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: "CAR policy, third party liability, workmen's compensation, and plant insurance",
  },
  QUALITY: {
    label: 'Quality & Testing',
    icon: '🔬',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'Material testing, laboratory approvals, cube tests, and rejections',
  },
  SAFETY: {
    label: 'Health & Safety',
    icon: '🦺',
    badgeColor: 'bg-lime-50 text-lime-800 border-lime-200',
    description: 'PPE compliance, barricading, site safety norms, and penalty provisions',
  },
  CORRESPONDENCE: {
    label: 'Notices & Notices Windows',
    icon: '✉️',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Formal dispatch methods, speed post tracking, written site instructions, and notice windows',
  },
  DISPUTE: {
    label: 'Dispute Resolution / DRC',
    icon: '🤝',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    description: 'Dispute Redressal Committee (DRC), conciliation, and notice of dissatisfaction',
  },
  ARBITRATION: {
    label: 'Arbitration',
    icon: '🏛️',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Sole arbitrator appointment, seat of arbitration, and limitation periods',
  },
  OTHER: {
    label: 'General Provision',
    icon: '📌',
    badgeColor: 'bg-zinc-50 text-zinc-700 border-zinc-200',
    description: 'Subcontracting, labour regulations, site clearance, and miscellaneous conditions',
  },
}

export const ALL_CLAUSE_CATEGORIES = Object.keys(CLAUSE_CATEGORY_CONFIG) as ClauseCategory[]
