import { roundToTwo, safeAdd, safeSub, safeMul } from './financial'

export interface StatutoryRates {
  retentionPercent?: number // Default: 5% (PWD Security Deposit)
  itTdsPercent?: number     // Default: 2% (Income Tax TDS for Contractors Section 194C)
  gstTdsPercent?: number    // Default: 2% (GST TDS under Section 51)
  labourCessPercent?: number // Default: 1% (BOCW Labour Welfare Cess Act 1996)
}

export interface StatutoryDeductionBreakdown {
  retention: number
  itTds: number
  gstTds: number
  labourCess: number
  totalDeductions: number
}

/**
 * Calculates standard Indian government contracting statutory deductions on a gross certified bill.
 */
export function calculateStatutoryDeductions(
  grossAmount: number,
  rates: StatutoryRates = {}
): StatutoryDeductionBreakdown {
  const gross = Math.max(0, roundToTwo(grossAmount))
  if (gross === 0) {
    return {
      retention: 0,
      itTds: 0,
      gstTds: 0,
      labourCess: 0,
      totalDeductions: 0,
    }
  }

  const retRate = (rates.retentionPercent ?? 5) / 100
  const itRate = (rates.itTdsPercent ?? 2) / 100
  const gstRate = (rates.gstTdsPercent ?? 2) / 100
  const cessRate = (rates.labourCessPercent ?? 1) / 100

  const retention = safeMul(gross, retRate)
  const itTds = safeMul(gross, itRate)
  const gstTds = safeMul(gross, gstRate)
  const labourCess = safeMul(gross, cessRate)

  const totalDeductions = safeAdd(retention, itTds, gstTds, labourCess)

  return {
    retention,
    itTds,
    gstTds,
    labourCess,
    totalDeductions,
  }
}

/**
 * Computes the net payable amount certified on a Running Account (RA) bill.
 */
export function calculateRABillNetPayable({
  workCertified,
  totalDeductions = 0,
}: {
  workCertified: number
  totalDeductions?: number
}): number {
  const gross = Math.max(0, roundToTwo(workCertified))
  const deds = Math.max(0, roundToTwo(totalDeductions))
  return Math.max(0, safeSub(gross, deds))
}

/**
 * Computes work certified in the current bill from cumulative measurement book (MB) values.
 */
export function calculateCumulativeThisBill({
  currentCumulative,
  previousCumulative = 0,
}: {
  currentCumulative: number
  previousCumulative?: number
}): number {
  const curr = Math.max(0, roundToTwo(currentCumulative))
  const prev = Math.max(0, roundToTwo(previousCumulative))
  return Math.max(0, safeSub(curr, prev))
}

/**
 * Computes net bank credit from a payment release tranche after statutory deductions.
 */
export function calculatePaymentTrancheNet({
  grossReleased,
  tds = 0,
  gstTds = 0,
  labourCess = 0,
  otherDeductions = 0,
}: {
  grossReleased: number
  tds?: number
  gstTds?: number
  labourCess?: number
  otherDeductions?: number
}): { totalDeductions: number; netBankCredited: number } {
  const gross = Math.max(0, roundToTwo(grossReleased))
  const totalDeductions = safeAdd(tds, gstTds, labourCess, otherDeductions)
  const netBankCredited = Math.max(0, safeSub(gross, totalDeductions))

  return {
    totalDeductions,
    netBankCredited,
  }
}

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid'

/**
 * Derives settlement status for an RA Bill with tolerance for minor 1-rupee rounding differences.
 */
export function deriveBillPaymentStatus({
  netPayable,
  totalReceived,
}: {
  netPayable: number
  totalReceived: number
}): PaymentStatus {
  const net = Math.max(0, roundToTwo(netPayable))
  const received = Math.max(0, roundToTwo(totalReceived))

  if (received <= 0) return 'unpaid'
  if (received >= net - 1) return 'fully_paid'
  return 'partially_paid'
}

