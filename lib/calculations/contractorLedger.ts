import {
  LedgerTransaction,
  ContractorLedgerSummary,
  DLPItem,
  DLPStatus,
} from '@/lib/types/contractorLedger'
import { roundToTwo, safeAdd, safeSub } from './financial'
import { calculateDLPReleaseDate } from './raBill'

export interface RawLedgerBill {
  id: string
  bill_number: string
  bill_type?: 'running' | 'first_and_final' | 'final'
  submission_date: string
  work_certified_amount: number
  this_bill_work_certified?: number
  cumulative_certified_amount?: number | null
  retention_amount?: number
  retention_percentage?: number
  advance_payments_unmeasured?: number
  cement_recovery?: number
  steel_recovery?: number
  other_material_recovery?: number
  tds_deducted?: number
  gst_tds_deducted?: number
  labour_cess_deducted?: number
  other_deductions?: number
  net_payable_this_bill?: number
  net_payable_amount?: number
  amount_received?: number
  mb_number?: string | null
  mb_page_start?: number | null
  mb_page_end?: number | null
  actual_completion_date?: string | null
  dlp_months?: number
  remarks?: string | null
}

export interface RawLedgerPayment {
  id: string
  bill_id: string
  payment_date: string
  gross_amount: number
  tds_amount?: number
  gst_tds_amount?: number
  labour_cess_amount?: number
  other_deductions?: number
  total_deductions?: number
  net_bank_amount?: number
  voucher_reference?: string | null
  remarks?: string | null
}

/**
 * Synthesizes bills and payment vouchers into a chronological CPWA Form 43 running ledger.
 */
export function generateContractorLedger(
  bills: RawLedgerBill[],
  payments: RawLedgerPayment[]
): ContractorLedgerSummary {
  const events: {
    sortKey: string
    timestamp: number
    type: 'bill' | 'payment'
    bill?: RawLedgerBill
    payment?: RawLedgerPayment
  }[] = []

  // Collect bill events
  for (const b of bills) {
    const time = new Date(b.submission_date).getTime() || 0
    events.push({
      sortKey: `${b.submission_date}_0_${b.bill_number}`,
      timestamp: time,
      type: 'bill',
      bill: b,
    })
  }

  // Collect payment events
  for (const p of payments) {
    const time = new Date(p.payment_date).getTime() || 0
    const ref = p.voucher_reference || p.id.slice(0, 6)
    events.push({
      sortKey: `${p.payment_date}_1_${ref}`,
      timestamp: time,
      type: 'payment',
      payment: p,
    })
  }

  // Sort strictly chronologically (bills before payments on the same date)
  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  let runningBalance = 0
  let totalGrossCertified = 0
  let totalAdvances = 0
  let totalRetention = 0
  let totalMaterialRecoveries = 0
  let totalStatutoryTaxes = 0
  let totalOtherDeductions = 0
  let totalBankDisbursed = 0

  const transactions: LedgerTransaction[] = []

  for (const ev of events) {
    if (ev.type === 'bill' && ev.bill) {
      const b = ev.bill
      const grossWork = roundToTwo(
        b.this_bill_work_certified != null
          ? Number(b.this_bill_work_certified)
          : Number(b.work_certified_amount)
      )
      const advance = roundToTwo(Number(b.advance_payments_unmeasured) || 0)
      const ret = roundToTwo(Number(b.retention_amount) || 0)
      const cement = roundToTwo(Number(b.cement_recovery) || 0)
      const steel = roundToTwo(Number(b.steel_recovery) || 0)
      const otherMat = roundToTwo(Number(b.other_material_recovery) || 0)
      const matRec = safeAdd(cement, steel, otherMat)

      const itTds = roundToTwo(Number(b.tds_deducted) || 0)
      const gstTds = roundToTwo(Number(b.gst_tds_deducted) || 0)
      const labourCess = roundToTwo(Number(b.labour_cess_deducted) || 0)
      const taxes = safeAdd(itTds, gstTds, labourCess)
      const otherDed = roundToTwo(Number(b.other_deductions) || 0)

      const billDeductionsTotal = safeAdd(ret, matRec, taxes, otherDed)

      const netDueFromThisBill = b.net_payable_this_bill != null
        ? Number(b.net_payable_this_bill)
        : (b.net_payable_amount != null
          ? Number(b.net_payable_amount)
          : Math.max(0, safeSub(safeAdd(grossWork, advance), billDeductionsTotal)))

      runningBalance = roundToTwo(safeAdd(runningBalance, netDueFromThisBill))

      totalGrossCertified = safeAdd(totalGrossCertified, grossWork)
      totalAdvances = safeAdd(totalAdvances, advance)
      totalRetention = safeAdd(totalRetention, ret)
      totalMaterialRecoveries = safeAdd(totalMaterialRecoveries, matRec)
      totalStatutoryTaxes = safeAdd(totalStatutoryTaxes, taxes)
      totalOtherDeductions = safeAdd(totalOtherDeductions, otherDed)

      const mbRef = b.mb_number
        ? `MB #${b.mb_number}${b.mb_page_start ? ` (Pp. ${b.mb_page_start}-${b.mb_page_end || b.mb_page_start})` : ''}`
        : null

      transactions.push({
        id: b.id,
        date: b.submission_date,
        type: 'bill_passed',
        voucher_or_bill_number: b.bill_number,
        bill_type: b.bill_type || 'running',
        description:
          b.bill_type === 'final'
            ? 'Final Bill Certified (Form 27-B)'
            : b.bill_type === 'first_and_final'
            ? 'First & Final Bill Passed (Form 24)'
            : 'Running Account Bill Certified (Form 26)',
        gross_work_certified: grossWork,
        advance_payments: advance,
        retention_withheld: ret,
        store_material_recoveries: matRec,
        statutory_taxes: taxes,
        other_deductions: otherDed,
        total_deductions: billDeductionsTotal,
        bank_payment_disbursed: 0,
        net_payable_effect: netDueFromThisBill,
        running_balance_due: runningBalance,
        mb_reference: mbRef,
        remarks: b.remarks || null,
      })
    } else if (ev.type === 'payment' && ev.payment) {
      const p = ev.payment
      const linkedBill = bills.find(b => b.id === p.bill_id)
      const billLabel = linkedBill ? linkedBill.bill_number : 'RA Bill'

      const grossReleased = roundToTwo(Number(p.gross_amount) || 0)
      const netBank = roundToTwo(
        p.net_bank_amount != null
          ? Number(p.net_bank_amount)
          : safeSub(grossReleased, Number(p.total_deductions) || 0)
      )

      // Deduction details booked on payment voucher
      const pTds = roundToTwo(Number(p.tds_amount) || 0)
      const pGst = roundToTwo(Number(p.gst_tds_amount) || 0)
      const pCess = roundToTwo(Number(p.labour_cess_amount) || 0)
      const pTaxes = safeAdd(pTds, pGst, pCess)
      const pOther = roundToTwo(Number(p.other_deductions) || 0)
      const pTotalDed = Number(p.total_deductions) || safeAdd(pTaxes, pOther)

      // Department releases payment: contractor's pending balance is reduced by gross amount released
      runningBalance = roundToTwo(Math.max(0, safeSub(runningBalance, grossReleased)))
      totalBankDisbursed = safeAdd(totalBankDisbursed, netBank)

      // If taxes were recorded upon payment release, aggregate them
      totalStatutoryTaxes = safeAdd(totalStatutoryTaxes, pTaxes)
      totalOtherDeductions = safeAdd(totalOtherDeductions, pOther)

      transactions.push({
        id: p.id,
        date: p.payment_date,
        type: 'payment_voucher',
        voucher_or_bill_number: p.voucher_reference || `Voucher #${p.id.slice(0, 6)}`,
        description: `Treasury Payment Release against ${billLabel}`,
        gross_work_certified: 0,
        advance_payments: 0,
        retention_withheld: 0,
        store_material_recoveries: 0,
        statutory_taxes: pTaxes,
        other_deductions: pOther,
        total_deductions: pTotalDed,
        bank_payment_disbursed: netBank,
        net_payable_effect: -grossReleased,
        running_balance_due: runningBalance,
        voucher_reference: p.voucher_reference || null,
        remarks: p.remarks || null,
      })
    }
  }

  const totalAllDeductions = safeAdd(
    totalRetention,
    totalMaterialRecoveries,
    totalStatutoryTaxes,
    totalOtherDeductions
  )

  return {
    totalGrossCertified,
    totalAdvancesGranted: totalAdvances,
    totalRetentionHeld: totalRetention,
    totalMaterialRecoveries,
    totalStatutoryTaxes,
    totalOtherDeductions,
    totalAllDeductions,
    totalBankDisbursed,
    netBalanceOutstanding: runningBalance,
    transactions,
  }
}

/**
 * Evaluates Defect Liability Period (DLP) milestones for all Final Bills.
 */
export function calculateDLPSummary(
  bills: RawLedgerBill[],
  options?: {
    projectName?: string
    agencyName?: string | null
    asOfDate?: string
  }
): DLPItem[] {
  const finalBills = bills.filter(b => b.bill_type === 'final' && b.actual_completion_date)
  const today = options?.asOfDate ? new Date(options.asOfDate) : new Date()

  return finalBills.map(b => {
    const compDate = b.actual_completion_date || ''
    const dlpMonths = b.dlp_months || 12
    const expiryDateStr = calculateDLPReleaseDate(compDate, dlpMonths)
    const expiryDate = new Date(expiryDateStr)

    const diffMs = expiryDate.getTime() - today.getTime()
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    let status: DLPStatus = 'locked'
    if (daysRemaining <= 0) {
      status = 'refund_due_now'
    } else if (daysRemaining <= 30) {
      status = 'expiring_soon'
    }

    return {
      billId: b.id,
      billNumber: b.bill_number,
      projectId: '',
      projectName: options?.projectName || 'Project Site',
      agencyName: options?.agencyName || null,
      actualCompletionDate: compDate,
      dlpMonths,
      dlpExpiryDate: expiryDateStr,
      daysRemaining,
      retentionAmount: Number(b.retention_amount) || 0,
      status,
    }
  })
}

