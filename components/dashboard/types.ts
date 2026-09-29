export interface ProjectItem {
  id: string
  name: string
  agency_name?: string | null
}

export interface ContractItem {
  id: string
  project_id: string
  agreement_number: string
  contract_title?: string | null
  awarded_amount: number
  original_completion_date?: string | null
  current_completion_date?: string | null
  dlp_end_date?: string | null
  status: string
  retention_percentage?: number | null
  security_deposit_amount?: number | null
  performance_security_amount?: number | null
}

export interface SecurityDepositItem {
  id: string
  project_id: string
  deposit_type: string
  reference_number: string
  issuing_bank?: string | null
  amount: number
  expiry_date: string
  claim_expiry_date?: string | null
  status: string
}

export interface RawRABillItem {
  id: string
  project_id: string
  bill_number?: string | null
  submission_date?: string | null
  net_payable_amount?: number | null
  work_certified_amount?: number | null
  retention_amount?: number | null
  amount_received?: number | null
  net_bank_received?: number | null
  status?: string | null
  billing_mode?: string | null
  this_bill_work_certified?: number | null
  net_payable_this_bill?: number | null
}

export interface BOQItemSummary {
  id: string
  project_id: string
  contract_id?: string | null
  item_number?: string | null
  description?: string | null
  unit?: string | null
  quantity: number
  rate: number
  amount: number
  measured_quantity?: number | null
  certified_quantity?: number | null
  billed_quantity?: number | null
}

export interface MeasurementEntrySummary {
  id: string
  project_id: string
  contract_id?: string | null
  entry_number: string
  measurement_date: string
  calculated_quantity: number
  status: string
  boq_item_id: string
  billed_in_ra_bill_id?: string | null
}

export interface ContractEventSummary {
  id: string
  project_id: string
  contract_id?: string | null
  event_number: string
  event_type: string
  event_date: string
  description: string
  status: string
  estimated_delay_days?: number | null
  actual_delay_days?: number | null
  financial_impact?: number | null
}

export interface HindranceSummary {
  id: string
  project_id: string
  contract_id?: string | null
  hindrance_number?: number | null
  description: string
  start_date: string
  end_date?: string | null
  status: string
  notice_served?: boolean | null
  net_delay_days?: number | null
}

export interface CorrespondenceSummary {
  id: string
  project_id: string
  contract_id?: string | null
  reference_number: string
  letter_number: string
  date: string
  direction: string
  category: string
  sender: string
  recipient: string
  subject: string
  response_required: boolean
  response_deadline?: string | null
  responded_date?: string | null
  status: string
}

export interface EOTCaseSummary {
  id: string
  project_id: string
  contract_id?: string | null
  eot_reference: string
  cause: string
  claimed_days: number
  approved_days: number
  pending_days: number
  submission_date: string
  department_response_date?: string | null
  current_completion_date: string
  revised_completion_date: string
  status: string
}

export interface VariationSummary {
  id: string
  project_id: string
  contract_id?: string | null
  reference_number: string
  type: string
  proposed_amount: number
  approved_amount: number
  status: string
  is_deletion: boolean
  deleted_work_amount: number
  approval_date?: string | null
}

export interface ClaimSummary {
  id: string
  project_id: string
  contract_id?: string | null
  claim_number: string
  claim_type: string
  title: string
  claim_date: string
  claimed_amount: number
  approved_amount: number
  paid_amount: number
  outstanding_amount: number
  status: string
}

export interface MachineryAssetSummary {
  id: string
  project_id?: string | null
  asset_name: string
  asset_type: string
  status: string
}

export interface InventoryItemSummary {
  id: string
  project_id?: string | null
  item_name: string
  unit: string
  current_stock: number
  minimum_stock_alert: number
}

export interface WagePaymentSummary {
  id: string
  project_id: string
  worker_id: string
  amount_owed: number
  amount_paid: number
  status: string
}
