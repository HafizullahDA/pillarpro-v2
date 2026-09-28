export type BOQItemType =
  | 'original'
  | 'deviation'
  | 'variation'
  | 'extra_item'
  | 'substituted_item'
  | 'non_schedule'

export type BOQItemStatus =
  | 'active'
  | 'completed'
  | 'disputed'
  | 'dropped'

export interface BOQItem {
  id: string
  project_id: string
  contract_id?: string | null
  organization_id: string
  item_number: string
  chapter?: string | null
  description: string
  detailed_specification?: string | null
  department_item_code?: string | null
  schedule_reference?: string | null
  unit: string
  item_type?: BOQItemType | string
  status?: BOQItemStatus | string

  // Contract Original Quantities
  tender_quantity: number
  awarded_rate: number
  total_amount: number

  // Approved Revisions / Deviations
  revised_quantity?: number | null
  revised_rate?: number | null
  revised_amount?: number | null

  // Quantity Breakdown
  measured_quantity?: number
  certified_quantity?: number
  billed_quantity?: number
  paid_quantity?: number
  variation_quantity?: number
  extra_quantity?: number
  substituted_quantity?: number

  notes?: string | null
  created_at: string
  updated_at: string
}

export interface RABillItem {
  id: string
  ra_bill_id: string
  boq_item_id: string
  organization_id: string
  previous_quantity: number
  current_quantity: number
  cumulative_quantity: number
  rate: number
  current_amount: number
  cumulative_amount: number
  remarks?: string | null
  created_at: string
  updated_at: string
  boq_items?: Pick<BOQItem, 'item_number' | 'description' | 'unit' | 'tender_quantity' | 'awarded_rate'>
}

export interface BOQSummaryItem {
  boq_item_id: string
  contract_id?: string | null
  item_number: string
  chapter?: string | null
  description: string
  detailed_specification?: string | null
  department_item_code?: string | null
  schedule_reference?: string | null
  unit: string
  item_type?: BOQItemType | string
  status?: BOQItemStatus | string

  // Contract Amounts
  tender_quantity: number
  awarded_rate: number
  tender_amount: number

  // Revisions
  revised_quantity?: number | null
  revised_rate?: number | null
  revised_amount?: number | null

  // Execution & Balance
  cumulative_executed_qty: number
  remaining_qty: number
  cumulative_executed_amount: number
  work_done_percentage: number
  balance_amount?: number
  variation_quantity?: number
  extra_quantity?: number
}

export interface BOQItemRevision {
  id: string
  boq_item_id: string
  project_id: string
  contract_id?: string | null
  organization_id: string
  revision_type:
    | 'original'
    | 'deviation'
    | 'variation'
    | 'extra_item'
    | 'substitution'
    | 'rate_revision'
    | 'quantity_adjustment'
  revision_reference?: string | null
  previous_quantity: number
  new_quantity: number
  previous_rate: number
  new_rate: number
  previous_amount: number
  new_amount: number
  justification?: string | null
  sanctioned_by?: string | null
  sanction_date?: string | null
  created_at: string
  created_by?: string | null
}

export interface ProjectBOQOverallProgress {
  totalTenderAmount: number
  totalExecutedAmount: number
  totalRevisedAmount?: number
  overallWorkDonePct: number
  totalItemsCount: number
  completedItemsCount: number
  inProgressItemsCount: number
  unstartedItemsCount: number
}

export interface CSVBOQRow {
  item_number: string
  description: string
  unit: string
  tender_quantity: number
  awarded_rate: number
  chapter?: string
  schedule_reference?: string
  department_item_code?: string
}

export const BOQ_ITEM_TYPES: { id: BOQItemType; label: string; description: string }[] = [
  { id: 'original', label: 'Original BOQ Item', description: 'Item included in the original tender schedule of quantities' },
  { id: 'deviation', label: 'Deviation (+/- Qty)', description: 'Quantity change on an existing BOQ item beyond tender limits' },
  { id: 'variation', label: 'Variation Order', description: 'Formal variation order item approved by authority' },
  { id: 'extra_item', label: 'Extra Item', description: 'Brand new work item not present in the original contract schedule' },
  { id: 'substituted_item', label: 'Substituted Item', description: 'Replaces an original item with an alternative specification' },
  { id: 'non_schedule', label: 'Non-Schedule (NSI)', description: 'Market rate item analyzed outside DSR / SOR schedule' },
]
