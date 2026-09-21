import { describe, it, expect } from 'vitest'
import {
  generateContractorLedger,
  calculateDLPSummary,
  RawLedgerBill,
  RawLedgerPayment,
} from '../contractorLedger'

describe('Contractor Ledger (CPWA Form 43) Engine', () => {
  it('correctly aggregates multi-bill submissions and split payment tranches with running balance', () => {
    const bills: RawLedgerBill[] = [
      {
        id: 'bill-1',
        bill_number: 'RA Bill 01',
        bill_type: 'running',
        submission_date: '2026-04-15',
        work_certified_amount: 2000000, // ₹20 Lakhs
        retention_amount: 100000,       // 5% = ₹1 Lakh
        net_payable_amount: 1900000,
        net_payable_this_bill: 1900000,
        mb_number: 'MB-101',
        mb_page_start: 10,
        mb_page_end: 20,
      },
      {
        id: 'bill-2',
        bill_number: 'RA Bill 02',
        bill_type: 'running',
        submission_date: '2026-06-10',
        work_certified_amount: 3500000,
        this_bill_work_certified: 1500000, // ₹15 Lakhs work this bill
        retention_amount: 75000,          // 5% = ₹75,000
        cement_recovery: 25000,           // ₹25,000 Store issue
        net_payable_this_bill: 1400000,   // ₹15L - ₹75k - ₹25k
      },
    ]

    const payments: RawLedgerPayment[] = [
      {
        id: 'pay-1',
        bill_id: 'bill-1',
        payment_date: '2026-05-01',
        gross_amount: 1000000, // First tranche: ₹10 Lakhs
        tds_amount: 20000,     // 2%
        gst_tds_amount: 20000, // 2%
        labour_cess_amount: 10000, // 1%
        total_deductions: 50000,
        net_bank_amount: 950000,
        voucher_reference: 'Vchr-PFMS-101',
      },
      {
        id: 'pay-2',
        bill_id: 'bill-1',
        payment_date: '2026-05-20',
        gross_amount: 900000,  // Second tranche: ₹9 Lakhs (clears Bill 01)
        tds_amount: 18000,
        gst_tds_amount: 18000,
        labour_cess_amount: 9000,
        total_deductions: 45000,
        net_bank_amount: 855000,
        voucher_reference: 'Vchr-PFMS-102',
      },
    ]

    const ledger = generateContractorLedger(bills, payments)

    expect(ledger.transactions.length).toBe(4)
    expect(ledger.totalGrossCertified).toBe(3500000) // ₹20L + ₹15L
    expect(ledger.totalRetentionHeld).toBe(175000)   // ₹1L + ₹75k
    expect(ledger.totalMaterialRecoveries).toBe(25000) // ₹25k cement
    expect(ledger.totalBankDisbursed).toBe(1805000)  // ₹9.5L + ₹8.55L

    // Step-by-step running balance verification:
    // 1. 2026-04-15 (Bill 1): net payable ₹19,00,000 -> Running Bal: ₹19,00,000
    expect(ledger.transactions[0].voucher_or_bill_number).toBe('RA Bill 01')
    expect(ledger.transactions[0].running_balance_due).toBe(1900000)

    // 2. 2026-05-01 (Pay 1): gross released ₹10,00,000 -> Running Bal: ₹9,00,000
    expect(ledger.transactions[1].voucher_or_bill_number).toBe('Vchr-PFMS-101')
    expect(ledger.transactions[1].running_balance_due).toBe(900000)

    // 3. 2026-05-20 (Pay 2): gross released ₹9,00,000 -> Running Bal: ₹0
    expect(ledger.transactions[2].voucher_or_bill_number).toBe('Vchr-PFMS-102')
    expect(ledger.transactions[2].running_balance_due).toBe(0)

    // 4. 2026-06-10 (Bill 2): net payable ₹14,00,000 -> Running Bal: ₹14,00,000
    expect(ledger.transactions[3].voucher_or_bill_number).toBe('RA Bill 02')
    expect(ledger.transactions[3].running_balance_due).toBe(1400000)

    expect(ledger.netBalanceOutstanding).toBe(1400000)
  })

  it('correctly tracks Defect Liability Period (DLP) milestones and statuses', () => {
    const bills: RawLedgerBill[] = [
      {
        id: 'bill-final-1',
        bill_number: 'FINAL-01',
        bill_type: 'final',
        submission_date: '2025-01-10',
        work_certified_amount: 5000000,
        retention_amount: 250000,
        actual_completion_date: '2025-01-10',
        dlp_months: 12, // Expiry was 2026-01-10 (in the past relative to 2026-09-21)
      },
      {
        id: 'bill-final-2',
        bill_number: 'FINAL-02',
        bill_type: 'final',
        submission_date: '2026-03-31',
        work_certified_amount: 8000000,
        retention_amount: 400000,
        actual_completion_date: '2026-03-31',
        dlp_months: 12, // Expiry will be 2027-03-31 (locked in the future)
      },
    ]

    const summary = calculateDLPSummary(bills, {
      projectName: 'Metro Viaduct Ch. 12',
      asOfDate: '2026-09-21',
    })

    expect(summary.length).toBe(2)

    // First final bill completed > 12 months ago -> refund_due_now
    expect(summary[0].billNumber).toBe('FINAL-01')
    expect(summary[0].dlpExpiryDate).toBe('2026-01-10')
    expect(summary[0].status).toBe('refund_due_now')
    expect(summary[0].daysRemaining).toBeLessThan(0)
    expect(summary[0].retentionAmount).toBe(250000)

    // Second final bill ongoing -> locked
    expect(summary[1].billNumber).toBe('FINAL-02')
    expect(summary[1].dlpExpiryDate).toBe('2027-03-31')
    expect(summary[1].status).toBe('locked')
    expect(summary[1].daysRemaining).toBeGreaterThan(30)
    expect(summary[1].retentionAmount).toBe(400000)
  })
})

