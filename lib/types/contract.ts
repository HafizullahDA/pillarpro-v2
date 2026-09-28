export type ContractDocumentType =
  | 'Agreement'
  | 'Work Order'
  | 'NIT'
  | 'BOQ'
  | 'GCC'
  | 'SCC'
  | 'Corrigendum'
  | 'Drawings'
  | 'Specifications'
  | 'Addendum'
  | 'Department Letter'
  | 'Contractor Letter'
  | 'Other'

export type ContractStatus =
  | 'active'
  | 'completed'
  | 'terminated'
  | 'suspended'
  | 'foreclosed'
  | 'in_arbitration'

export type ContractType =
  | 'Item Rate'
  | 'Percentage Rate'
  | 'Lump Sum'
  | 'EPC'
  | 'HAM'
  | 'Item Rate cum EPC'
  | 'Other'

export type TenderType =
  | 'Open Tender'
  | 'Limited Tender'
  | 'Single Tender / Nomination'
  | 'Two-Cover System'
  | 'EOI / Global'

export interface ContractRecord {
  id: string
  organization_id: string
  project_id: string
  is_primary: boolean

  // Department / Employer & Administrative Hierarchy
  employer_name: string
  division?: string | null
  circle?: string | null
  contracting_authority?: string | null
  contractor_name: string

  // Identification Numbers
  agreement_number: string
  work_order_number?: string | null
  nit_number?: string | null
  contract_title?: string | null

  // Classification
  contract_type: ContractType | string
  tender_type: TenderType | string

  // Contract Values
  estimated_cost?: number | null
  awarded_amount: number

  // Dates & Milestones
  award_date?: string | null
  agreement_date?: string | null
  work_commencement_date?: string | null
  original_completion_date?: string | null
  current_completion_date?: string | null
  original_contract_period_months?: number | null
  original_contract_period_days?: number | null

  // Defect Liability Period (DLP)
  dlp_months?: number | null
  dlp_start_date?: string | null
  dlp_end_date?: string | null

  // Guarantees, Security Deposits & Retentions
  earnest_money_deposit?: number | null
  performance_security_amount?: number | null
  performance_security_percent?: number | null
  security_deposit_amount?: number | null
  security_deposit_percent?: number | null
  retention_percentage: number

  // GST Information
  contractor_gstin?: string | null
  employer_gstin?: string | null
  gst_rate_percent?: number | null
  gst_treatment?: 'inclusive' | 'exclusive' | string | null

  // Commercial & Statutory Provisions
  liquidated_damages_percent_per_week?: number | null
  liquidated_damages_max_cap_percent?: number | null
  ld_provisions_notes?: string | null

  eot_clause?: string | null
  eot_notice_days?: number | null
  eot_provisions_notes?: string | null

  escalation_applicable: boolean
  escalation_clause?: string | null
  escalation_notes?: string | null

  variation_limit_percent?: number | null
  variation_clause?: string | null
  variation_notes?: string | null

  payment_terms_frequency?: string | null
  payment_terms_notes?: string | null

  // Conditions of Contract
  gcc_type?: string | null
  gcc_edition?: string | null
  scc_notes?: string | null

  // Status & Audit
  status: ContractStatus | string
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface ContractDocument {
  id: string
  contract_id: string
  project_id: string
  organization_id: string
  document_type: ContractDocumentType
  title: string
  document_number?: string | null
  issue_date?: string | null
  file_url: string
  file_name?: string | null
  file_size_bytes?: number | null
  file_type?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export const CONTRACT_DOC_TYPES: ContractDocumentType[] = [
  'Agreement',
  'Work Order',
  'NIT',
  'BOQ',
  'GCC',
  'SCC',
  'Corrigendum',
  'Drawings',
  'Specifications',
  'Addendum',
  'Department Letter',
  'Contractor Letter',
  'Other',
]
