import { describe, it, expect } from 'vitest'
import {
  calculateStatutoryDeductions,
  calculateRABillNetPayable,
  calculateCumulativeThisBill,
  calculatePaymentTrancheNet,
  deriveBillPaymentStatus,
  calculateCPWAMemorandum,
  calculateDLPReleaseDate,
} from '../raBill'

describe('RA Bill Statutory Deductions & Net Payable Calculations', () => {
  it('accurately calculates standard Indian PWD deductions (5% Retention, 2% IT TDS, 2% GST TDS, 1% Cess)', () => {
    const grossBill = 10000000 // ₹1,00,00,000 (1 Crore contract bill)

    const result = calculateStatutoryDeductions(grossBill)

    expect(result.retention).toBe(500000) // 5% = ₹5,00,000
    expect(result.itTds).toBe(200000)    // 2% = ₹2,00,000
    expect(result.gstTds).toBe(200000)   // 2% = ₹2,00,000
    expect(result.labourCess).toBe(100000) // 1% = ₹1,00,000
    expect(result.totalDeductions).toBe(1000000) // Total 10% = ₹10,00,000
  })

  it('applies 1% IT TDS for Individual/Proprietorship and 2% for Company/Firm', () => {
    const gross = 2000000 // ₹20 Lakhs

    const individualResult = calculateStatutoryDeductions(gross, {
      contractorType: 'individual_proprietor',
    })
    expect(individualResult.itTds).toBe(20000) // 1% = ₹20,000

    const companyResult = calculateStatutoryDeductions(gross, {
      contractorType: 'company_firm',
    })
    expect(companyResult.itTds).toBe(40000) // 2% = ₹40,000
  })

  it('supports custom deduction percentages and departmental additions', () => {
    const gross = 5000000 // ₹50 Lakhs
    const customRates = {
      retentionPercent: 2.5, // 2.5% CPWD retention
      itTdsPercent: 1,      // 1% TDS for individual contractor
      gstTdsPercent: 2,
      labourCessPercent: 1,
      additionalDeductionsAmount: 35000, // ₹35,000 Mineral Royalty
    }

    const result = calculateStatutoryDeductions(gross, customRates)

    expect(result.retention).toBe(125000) // 2.5% = ₹1,25,000
    expect(result.itTds).toBe(50000)
    expect(result.gstTds).toBe(100000)
    expect(result.labourCess).toBe(50000)
    expect(result.additionalDeductions).toBe(35000)
    expect(result.totalDeductions).toBe(360000)
  })

  it('correctly calculates net bill payable after deductions', () => {
    const workCertified = 4550000 // ₹45.5 Lakhs
    const totalDeductions = 455000 // ₹4.55 Lakhs (10%)

    const netPayable = calculateRABillNetPayable({ workCertified, totalDeductions })

    expect(netPayable).toBe(4095000)
  })

  it('correctly derives current bill work certified from cumulative measurement books', () => {
    const previousCumulativeMB = 3500000 // RA-02 cumulative
    const currentCumulativeMB = 5800000  // RA-03 cumulative

    const thisBillClaim = calculateCumulativeThisBill({
      currentCumulative: currentCumulativeMB,
      previousCumulative: previousCumulativeMB,
    })

    expect(thisBillClaim).toBe(2300000)
  })

  it('accurately calculates net bank credit from payment release tranche with deductions', () => {
    const tranche = calculatePaymentTrancheNet({
      grossReleased: 2000000,
      tds: 40000,
      gstTds: 40000,
      labourCess: 20000,
      otherDeductions: 5000, // e.g. test fee deduction
    })

    expect(tranche.totalDeductions).toBe(105000)
    expect(tranche.netBankCredited).toBe(1895000)
  })

  it('derives correct settlement status for RA Bills', () => {
    const netPayable = 1000000

    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 0 })).toBe('unpaid')
    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 500000 })).toBe('partially_paid')
    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 999999.5 })).toBe('fully_paid')
    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 1000000 })).toBe('fully_paid')
  })

  it('accurately computes CPWA Form 26 Account III Memorandum of Payments with item 8a and 8b recoveries', () => {
    const memo = calculateCPWAMemorandum({
      measuredWorkValue: 5000000,          // Item 1: ₹50 Lakhs measured
      advanceUnmeasured: 200000,           // Item 2: ₹2 Lakhs unmeasured advance
      securedAdvance: 500000,              // Item 3: ₹5 Lakhs secured advance on materials
      retentionPercent: 5,                 // Item 5: 5% retention on ₹50L = ₹2.5L
      previousPaymentsAlreadyMade: 2500000,// Item 7: ₹25 Lakhs previously paid
      cementRecovery: 50000,               // Item 8(a): ₹50,000 departmental cement
      steelRecovery: 100000,               // Item 8(a): ₹1,00,000 departmental steel
      contractorType: 'company_firm',      // 2% IT TDS
      gstTdsPercent: 2,
      labourCessPercent: 1,
    })

    expect(memo.item4_grossUpToDate).toBe(5700000) // ₹50L + ₹2L + ₹5L
    expect(memo.item5_retentionWithheld).toBe(250000) // 5% of ₹50L
    expect(memo.item6_balanceUpToDate).toBe(5450000) // ₹57L - ₹2.5L
    expect(memo.item8a_workRecoveries.total).toBe(150000) // ₹50k + ₹100k

    // Current gross due before deductions: ₹54,50,000 - ₹25,00,000 = ₹29,50,000
    // Statutory taxes on ₹29.5L: 2% TDS (₹59,000) + 2% GST TDS (₹59,000) + 1% Cess (₹29,500) = ₹1,47,500
    expect(memo.item8b_statutoryRecoveries.itTds).toBe(59000)
    expect(memo.item8b_statutoryRecoveries.gstTds).toBe(59000)
    expect(memo.item8b_statutoryRecoveries.labourCess).toBe(29500)
    expect(memo.item8b_statutoryRecoveries.total).toBe(147500)

    // Net payable now: ₹29,50,000 - ₹1,50,000 (materials) - ₹1,47,500 (taxes) = ₹26,52,500
    expect(memo.item8c_netPayableNow).toBe(2652500)
  })

  it('correctly calculates Defect Liability Period (DLP) release date', () => {
    expect(calculateDLPReleaseDate('2026-03-31', 12)).toBe('2027-03-31')
    expect(calculateDLPReleaseDate('2026-01-15', 6)).toBe('2026-07-15')
    expect(calculateDLPReleaseDate('', 12)).toBe('')
  })
})

