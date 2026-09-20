export interface BOQItem {
  id: string
  project_id: string
  organization_id: string
  item_number: string
  description: string
  unit: string
  tender_quantity: number
  awarded_rate: number
  total_amount: number
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
  item_number: string
  description: string
  unit: string
  tender_quantity: number
  awarded_rate: number
  tender_amount: number
  cumulative_executed_qty: number
  remaining_qty: number
  cumulative_executed_amount: number
  work_done_percentage: number
}

export interface ProjectBOQOverallProgress {
  totalTenderAmount: number
  totalExecutedAmount: number
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
}

