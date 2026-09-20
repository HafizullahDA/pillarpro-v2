import { roundToTwo, safeAdd, safeSub, safeMul } from './financial'

export type ContractorEntityType = 'individual_proprietor' | 'company_firm'

export interface StatutoryRates {
  contractorType?: ContractorEntityType // 'individual_proprietor' (1% TDS) or 'company_firm' (2% TDS)
  retentionPercent?: number // Contractual Security Deposit: typically 0%, 2.5%, 5%, or 10% (Default: 5%)
  itTdsPercent?: number     // Section 194C: 1% for Ind/Prop, 2% for Co/Firm (Default depends on contractorType)
  gstTdsPercent?: number    // Section 51: 2% on taxable contracts > ₹2.5L (Default: 2%)
  labourCessPercent?: number // 1% BOCW Labour Welfare Cess Act 1996 (Default: 1%)
  additionalDeductionsAmount?: number // Mineral royalty, testing charges, water/power recoveries
}

export interface StatutoryDeductionBreakdown {
  retention: number
  itTds: number
  gstTds: number
  labourCess: number
  additionalDeductions: number
  totalDeductions: number
}

/**
 * Calculates standard Indian government contracting statutory deductions on a gross certified bill.
 * Accurately accounts for Section 194C differential rates:
 * - 1% for Individuals and Sole Proprietorships
 * - 2% for Companies, Partnership Firms, and LLPs
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
      additionalDeductions: 0,
      totalDeductions: 0,
    }
  }

  // Derive IT TDS rate based on contractor entity type if not explicitly overridden
  const defaultItTdsRate = rates.contractorType === 'individual_proprietor' ? 1 : 2
  const retRate = (rates.retentionPercent ?? 5) / 100
  const itRate = (rates.itTdsPercent ?? defaultItTdsRate) / 100
  const gstRate = (rates.gstTdsPercent ?? 2) / 100
  const cessRate = (rates.labourCessPercent ?? 1) / 100
  const additional = Math.max(0, roundToTwo(rates.additionalDeductionsAmount ?? 0))

  const retention = safeMul(gross, retRate)
  const itTds = safeMul(gross, itRate)
  const gstTds = safeMul(gross, gstRate)
  const labourCess = safeMul(gross, cessRate)

  const totalDeductions = safeAdd(retention, itTds, gstTds, labourCess, additional)

  return {
    retention,
    itTds,
    gstTds,
    labourCess,
    additionalDeductions: additional,
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

