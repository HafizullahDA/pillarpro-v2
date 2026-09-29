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

export interface CPWAMemorandumParams {
  measuredWorkValue: number           // Item 1: Account I, Entry A
  advanceUnmeasured?: number          // Item 2: Advance for unmeasured work
  securedAdvance?: number             // Item 3: Form 26-A materials advance
  retentionPercent?: number           // Item 5(b): Retention percentage
  previousPaymentsAlreadyMade?: number // Item 7: Payments made as per last bill
  cementRecovery?: number             // Item 8(a): Departmental cement recovery
  steelRecovery?: number              // Item 8(a): Departmental steel recovery
  otherWorkRecoveries?: number        // Item 8(a): Mobilization advance / store recovery
  contractorType?: ContractorEntityType
  itTdsPercent?: number               // Item 8(b): Income Tax TDS (1% vs 2%)
  gstTdsPercent?: number              // Item 8(b): GST TDS (2%)
  labourCessPercent?: number          // Item 8(b): Labour Cess (1%)
  additionalRecoveries?: number       // Item 8(b): Royalty, testing charges
}

export interface CPWAMemorandumResult {
  item1_measuredWork: number
  item2_advanceUnmeasured: number
  item3_securedAdvance: number
  item4_grossUpToDate: number
  item5_retentionWithheld: number
  item6_balanceUpToDate: number
  item7_previousPaymentsMade: number
  item8a_workRecoveries: {
    cement: number
    steel: number
    other: number
    total: number
  }
  item8b_statutoryRecoveries: {
    itTds: number
    gstTds: number
    labourCess: number
    other: number
    total: number
  }
  item8c_netPayableNow: number
}

/**
 * Computes official CPWA Form 26 Account III Memorandum of Payments.
 * Strictly implements the $(1 + 2 + 3 - 5 - 7 - 8a - 8b)$ hierarchy.
 */
export function calculateCPWAMemorandum(params: CPWAMemorandumParams): CPWAMemorandumResult {
  const item1 = Math.max(0, roundToTwo(params.measuredWorkValue))
  const item2 = Math.max(0, roundToTwo(params.advanceUnmeasured ?? 0))
  const item3 = Math.max(0, roundToTwo(params.securedAdvance ?? 0))
  const item4 = safeAdd(item1, item2, item3)

  const retPercent = (params.retentionPercent ?? 5) / 100
  const item5 = safeMul(item1, retPercent)
  const item6 = Math.max(0, safeSub(item4, item5))

  const item7 = Math.max(0, roundToTwo(params.previousPaymentsAlreadyMade ?? 0))
  const grossCurrentDue = Math.max(0, safeSub(item6, item7))

  // Item 8(a): Recoveries creditable to this work (departmental stores, mobilization advance)
  const cement = Math.max(0, roundToTwo(params.cementRecovery ?? 0))
  const steel = Math.max(0, roundToTwo(params.steelRecovery ?? 0))
  const otherWork = Math.max(0, roundToTwo(params.otherWorkRecoveries ?? 0))
  const total8a = safeAdd(cement, steel, otherWork)

  // Item 8(b): Recoveries creditable to other heads (Sec 194C TDS, GST TDS, Cess, Royalty)
  const defaultTdsRate = params.contractorType === 'individual_proprietor' ? 1 : 2
  const tdsRate = (params.itTdsPercent ?? defaultTdsRate) / 100
  const gstRate = (params.gstTdsPercent ?? 2) / 100
  const cessRate = (params.labourCessPercent ?? 1) / 100

  // Taxes are assessed on current work certified
  const itTds = safeMul(grossCurrentDue, tdsRate)
  const gstTds = safeMul(grossCurrentDue, gstRate)
  const labourCess = safeMul(grossCurrentDue, cessRate)
  const otherTaxes = Math.max(0, roundToTwo(params.additionalRecoveries ?? 0))
  const total8b = safeAdd(itTds, gstTds, labourCess, otherTaxes)

  // Item 8(c): Net payable by Cheque / PFMS / RTGS
  const item8c = Math.max(0, safeSub(grossCurrentDue, safeAdd(total8a, total8b)))

  return {
    item1_measuredWork: item1,
    item2_advanceUnmeasured: item2,
    item3_securedAdvance: item3,
    item4_grossUpToDate: item4,
    item5_retentionWithheld: item5,
    item6_balanceUpToDate: item6,
    item7_previousPaymentsMade: item7,
    item8a_workRecoveries: {
      cement,
      steel,
      other: otherWork,
      total: total8a,
    },
    item8b_statutoryRecoveries: {
      itTds,
      gstTds,
      labourCess,
      other: otherTaxes,
      total: total8b,
    },
    item8c_netPayableNow: item8c,
  }
}

/**
 * Calculates Defect Liability Period (DLP) retention release milestone date
 * based on physical completion date and specified warranty months.
 */
export function calculateDLPReleaseDate(completionDate: string, dlpMonths: number = 12): string {
  if (!completionDate) return ''
  const date = new Date(completionDate)
  if (isNaN(date.getTime())) return ''
  date.setMonth(date.getMonth() + dlpMonths)
  return date.toISOString().split('T')[0]
}

// ════════════════════════════════════════════════════════════════════════
// CPWD GCC CLAUSE 10B: MOBILIZATION ADVANCE RECOVERY ENGINE
// ════════════════════════════════════════════════════════════════════════

export interface MobilizationAdvanceRecoveryParams {
  totalAdvanceGranted: number
  totalAdvanceRecoveredPrior: number
  contractValue: number
  cumulativeWorkCertified: number
  currentBillWorkCertified: number
  recoveryThresholdPercent?: number // Gross work threshold to commence recovery (CPWD default: 10%)
  completionTargetPercent?: number  // Gross work threshold to conclude recovery (CPWD default: 80%)
  recoveryRatePercent?: number      // Optional fixed rate percentage (e.g. 10% or 15% of gross bill)
}

export interface MobilizationAdvanceRecoveryResult {
  isRecoveryApplicable: boolean
  recoveryAmount: number
  unrecoveredAdvanceBalance: number
  recoveryProgressPercent: number
  explanation: string
}

/**
 * Computes statutory mobilization advance recovery per CPWD GCC Clause 10B.
 *
 * Rules:
 * 1. Recovery commences when cumulative gross work certified reaches recoveryThresholdPercent (default 10% of contract value).
 * 2. Recovery is completed before gross work certified reaches completionTargetPercent (default 80% of contract value).
 * 3. Prorated Formula:
 *    Recovery = Total Advance * (Current Bill Work / (Target Span of Work))
 *    where Target Span = Contract Value * (CompletionTarget% - RecoveryThreshold%)
 *    Or flat percentage if recoveryRatePercent is explicitly provided.
 * 4. Recovery amount in any bill cannot exceed the remaining unrecovered advance.
 */
export function calculateMobilizationAdvanceRecovery(
  params: MobilizationAdvanceRecoveryParams
): MobilizationAdvanceRecoveryResult {
  const totalAdvance = Math.max(0, roundToTwo(params.totalAdvanceGranted))
  const recoveredPrior = Math.max(0, roundToTwo(params.totalAdvanceRecoveredPrior))
  const remainingAdvance = Math.max(0, roundToTwo(totalAdvance - recoveredPrior))
  const contractValue = Math.max(0, roundToTwo(params.contractValue))
  const cumulativeWork = Math.max(0, roundToTwo(params.cumulativeWorkCertified))
  const currentWork = Math.max(0, roundToTwo(params.currentBillWorkCertified))

  if (totalAdvance <= 0 || remainingAdvance <= 0 || contractValue <= 0 || currentWork <= 0) {
    return {
      isRecoveryApplicable: false,
      recoveryAmount: 0,
      unrecoveredAdvanceBalance: remainingAdvance,
      recoveryProgressPercent: totalAdvance > 0 ? roundToTwo((recoveredPrior / totalAdvance) * 100) : 100,
      explanation: remainingAdvance <= 0
        ? 'Mobilization advance has been fully recovered.'
        : 'No recovery applicable for this billing cycle.',
    }
  }

  const thresholdPct = params.recoveryThresholdPercent ?? 10
  const targetPct = params.completionTargetPercent ?? 80
  const thresholdValue = roundToTwo((contractValue * thresholdPct) / 100)
  const targetValue = roundToTwo((contractValue * targetPct) / 100)

  // Recovery only commences when cumulative work reaches threshold
  if (cumulativeWork < thresholdValue) {
    return {
      isRecoveryApplicable: false,
      recoveryAmount: 0,
      unrecoveredAdvanceBalance: remainingAdvance,
      recoveryProgressPercent: roundToTwo((recoveredPrior / totalAdvance) * 100),
      explanation: `Cumulative work (₹${cumulativeWork.toLocaleString('en-IN')}) has not reached the Clause 10B commencement threshold of ${thresholdPct}% (₹${thresholdValue.toLocaleString('en-IN')}).`,
    }
  }

  let calculatedRecovery = 0

  if (params.recoveryRatePercent !== undefined && params.recoveryRatePercent > 0) {
    // Flat percentage on gross work done in current bill
    calculatedRecovery = roundToTwo(safeMul(currentWork, params.recoveryRatePercent / 100))
  } else {
    // CPWD Prorated Formula: Total Advance * (Current Work / (Target Value - Threshold Value))
    const targetSpan = Math.max(1, targetValue - thresholdValue)
    calculatedRecovery = roundToTwo(safeMul(totalAdvance, currentWork / targetSpan))
  }

  // Recovery cannot exceed remaining unrecovered advance
  const finalRecovery = Math.min(remainingAdvance, calculatedRecovery)
  const newBalance = Math.max(0, roundToTwo(remainingAdvance - finalRecovery))
  const newRecoveredTotal = roundToTwo(recoveredPrior + finalRecovery)
  const progressPercent = roundToTwo((newRecoveredTotal / totalAdvance) * 100)

  return {
    isRecoveryApplicable: finalRecovery > 0,
    recoveryAmount: finalRecovery,
    unrecoveredAdvanceBalance: newBalance,
    recoveryProgressPercent: progressPercent,
    explanation: `Clause 10B recovery of ₹${finalRecovery.toLocaleString('en-IN')} calculated on current work of ₹${currentWork.toLocaleString('en-IN')}. Remaining advance: ₹${newBalance.toLocaleString('en-IN')} (${progressPercent}% recovered).`,
  }
}


