import { BOQItem } from '../types/boq'
import { MeasurementEntry } from '../types/measurement'
import {
  BOQMeasurementBillingBreakdown,
  UnbilledCertifiedSummary,
} from '../types/measurementBilling'
import { safeMul, safeAdd, safeSub, roundToTwo } from './financial'

export interface BillingBreakdownParams {
  boqItem: BOQItem
  allMeasurements: MeasurementEntry[]
  previouslyBilledQuantity: number
  currentBillQuantity?: number
}

/**
 * Calculates complete quantity lifecycle for a BOQ item:
 * BOQ Qty -> Measured Qty -> Certified Qty -> Previously Billed -> Current Bill -> Cumulative Billed -> Balance
 *
 * Example:
 * BOQ = 1000
 * Measured = 600
 * Certified = 550
 * Previously Billed = 400
 * Current billable quantity = 150 (550 - 400)
 * Cumulative Billed = 550
 * Balance Quantity = 450 (1000 - 550)
 */
export function calculateBOQBillingBreakdown({
  boqItem,
  allMeasurements,
  previouslyBilledQuantity,
  currentBillQuantity,
}: BillingBreakdownParams): BOQMeasurementBillingBreakdown {
  const boqQty = Number(boqItem.revised_quantity ?? (boqItem as any).contract_quantity ?? boqItem.tender_quantity ?? 0)
  const rate = Number(boqItem.revised_rate ?? (boqItem as any).contract_rate ?? boqItem.awarded_rate ?? 0)

  // Filter measurements for this specific BOQ item
  const itemEntries = allMeasurements.filter(
    m => m.boq_item_id === boqItem.id && m.status !== 'REJECTED' && m.status !== 'CANCELLED'
  )

  // 2. Measured Quantity
  const measuredQty = Number(
    itemEntries.reduce((sum, e) => sum + Number(e.calculated_quantity || 0), 0).toFixed(3)
  )

  // 3. Certified Quantity (only status === 'CERTIFIED')
  const certifiedQty = Number(
    itemEntries
      .filter(e => e.status === 'CERTIFIED')
      .reduce((sum, e) => sum + Number(e.calculated_quantity || 0), 0)
      .toFixed(3)
  )

  // 4. Previously Billed
  const prevBilled = Math.max(0, Number(previouslyBilledQuantity || 0))

  // Available unbilled certified quantity = Certified - Previously Billed
  const unbilledCertifiedQty = Math.max(0, Number((certifiedQty - prevBilled).toFixed(3)))
  const unbilledCertifiedAmount = safeMul(unbilledCertifiedQty, rate)

  // 5. Current Bill Quantity: defaults to available unbilled certified quantity if not specified
  const currentBillQty = currentBillQuantity !== undefined
    ? Math.max(0, Number(currentBillQuantity))
    : unbilledCertifiedQty

  // 6. Cumulative Billed = Previously Billed + Current Bill
  const cumulativeBilledQty = Number((prevBilled + currentBillQty).toFixed(3))

  // 7. Balance Quantity = BOQ Quantity - Cumulative Billed
  const balanceQty = Number((boqQty - cumulativeBilledQty).toFixed(3))

  // Strict check: Billing quantity cannot exceed certified quantity
  const isExceededCertified = cumulativeBilledQty > certifiedQty

  // Overrun check: Cumulative billed exceeds BOQ
  const isExceededBoq = cumulativeBilledQty > boqQty

  const currentAmount = safeMul(currentBillQty, rate)
  const cumulativeAmount = safeMul(cumulativeBilledQty, rate)

  return {
    boq_item_id: boqItem.id,
    item_number: boqItem.item_number,
    description: boqItem.description,
    unit: boqItem.unit,
    contract_rate: rate,
    boq_quantity: boqQty,
    measured_quantity: measuredQty,
    certified_quantity: certifiedQty,
    previously_billed_qty: prevBilled,
    current_bill_qty: currentBillQty,
    cumulative_billed_qty: cumulativeBilledQty,
    balance_quantity: balanceQty,
    unbilled_certified_qty: unbilledCertifiedQty,
    unbilled_certified_amount: unbilledCertifiedAmount,
    current_amount: currentAmount,
    cumulative_amount: cumulativeAmount,
    is_exceeded_certified: isExceededCertified,
    is_exceeded_boq: isExceededBoq,
  }
}

/**
 * Validates whether proposed bill quantities comply with certified e-MB records.
 * Throws or returns an explicit error if billing exceeds certified work.
 */
export function validateBillingAgainstCertified(
  breakdown: BOQMeasurementBillingBreakdown
): {
  isValid: boolean
  errorMessage?: string
} {
  if (breakdown.current_bill_qty < 0) {
    return {
      isValid: false,
      errorMessage: `Item ${breakdown.item_number}: Billing quantity cannot be negative.`,
    }
  }

  if (breakdown.is_exceeded_certified) {
    const excess = Number((breakdown.cumulative_billed_qty - breakdown.certified_quantity).toFixed(3))
    return {
      isValid: false,
      errorMessage: `Item ${breakdown.item_number}: Cumulative billing (${breakdown.cumulative_billed_qty} ${breakdown.unit}) exceeds certified quantity (${breakdown.certified_quantity} ${breakdown.unit}) by ${excess} ${breakdown.unit}. Billing cannot exceed certified work without prior EE certification.`,
    }
  }

  return { isValid: true }
}

/**
 * Computes the Unbilled Certified Work KPI for a project:
 * Total Certified Work Value - Total Billed Work Value = Unbilled Certified Work
 *
 * Example:
 * Certified work = ₹12,50,000
 * Billed work = ₹10,00,000
 * Unbilled certified work = ₹2,50,000
 */
export function calculateUnbilledCertifiedWork({
  boqItems,
  measurements,
  totalBilledWorkValue,
  projectId = '',
  projectName = '',
}: {
  boqItems: BOQItem[]
  measurements: MeasurementEntry[]
  totalBilledWorkValue: number
  projectId?: string
  projectName?: string
}): UnbilledCertifiedSummary {
  // Sum value of all CERTIFIED measurements
  const rateMap = new Map<string, number>()
  for (const b of boqItems) {
    const rate = Number(b.revised_rate ?? (b as any).contract_rate ?? b.awarded_rate ?? 0)
    rateMap.set(b.id, rate)
  }

  let totalCertifiedValue = 0
  let unbilledEntriesCount = 0

  for (const m of measurements) {
    if (m.status === 'CERTIFIED') {
      const rate = rateMap.get(m.boq_item_id) || 0
      const entryValue = safeMul(Number(m.calculated_quantity || 0), rate)
      totalCertifiedValue = safeAdd(totalCertifiedValue, entryValue)

      if (!m.billed_in_ra_bill_id) {
        unbilledEntriesCount += 1
      }
    }
  }

  const billedValue = Math.max(0, roundToTwo(totalBilledWorkValue))
  const unbilledValue = Math.max(0, roundToTwo(safeSub(totalCertifiedValue, billedValue)))

  return {
    projectId,
    projectName,
    totalCertifiedWorkValue: totalCertifiedValue,
    totalBilledWorkValue: billedValue,
    unbilledCertifiedWorkValue: unbilledValue,
    unbilledEntriesCount,
  }
}
