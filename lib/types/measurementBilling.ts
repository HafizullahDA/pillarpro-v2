import { BOQItem } from './boq'
import { MeasurementEntry } from './measurement'

export interface RABillMeasurementEntryLink {
  id: string
  organization_id: string
  ra_bill_id: string
  ra_bill_item_id?: string | null
  boq_item_id: string
  measurement_entry_id: string
  billed_quantity: number
  created_at: string
}

export interface BOQMeasurementBillingBreakdown {
  boq_item_id: string
  item_number: string
  description: string
  unit: string
  contract_rate: number

  // 1. BOQ Quantity (Contract Tender / Revised)
  boq_quantity: number

  // 2. Measured Quantity (Total cumulative measured in e-MB)
  measured_quantity: number

  // 3. Certified Quantity (Approved & certified by EE)
  certified_quantity: number

  // 4. Previously Billed (Cumulative billed in prior RA bills)
  previously_billed_qty: number

  // 5. Current Bill Quantity (Billable quantity for this RA bill)
  current_bill_qty: number

  // 6. Cumulative Billed (Previously Billed + Current Bill)
  cumulative_billed_qty: number

  // 7. Balance Quantity (BOQ Quantity - Cumulative Billed)
  balance_quantity: number

  // Available billable ceiling without exceeding certified work
  unbilled_certified_qty: number
  unbilled_certified_amount: number

  // Amounts
  current_amount: number
  cumulative_amount: number

  // Compliance flag
  is_exceeded_certified: boolean
  is_exceeded_boq: boolean
}

export interface UnbilledCertifiedSummary {
  projectId: string
  projectName?: string
  totalCertifiedWorkValue: number
  totalBilledWorkValue: number
  unbilledCertifiedWorkValue: number
  unbilledEntriesCount: number
}
