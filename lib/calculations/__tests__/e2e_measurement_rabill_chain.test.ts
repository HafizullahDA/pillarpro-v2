import { describe, it, expect } from 'vitest'
import {
  calculateMeasurementQuantity,
  validateQuantityAgainstBOQ,
} from '../measurement'
import {
  calculateBOQBillingBreakdown,
  validateBillingAgainstCertified,
  calculateUnbilledCertifiedWork,
} from '../measurementBilling'
import {
  calculateStatutoryDeductions,
  calculateRABillNetPayable,
  deriveBillPaymentStatus,
  calculatePaymentTrancheNet,
} from '../raBill'
import { BOQItem } from '../../types/boq'
import { MeasurementEntry } from '../../types/measurement'

describe('End-to-End Chain: Measurement -> Certification -> RA Bill -> Payment', () => {
  // Step 0: Contract BOQ Item Setup
  const boqItem: BOQItem = {
    id: 'boq-bridge-01',
    organization_id: 'org-1',
    project_id: 'proj-bridge',
    item_number: '3.05',
    description: 'Providing & laying Design Mix RCC M-30 in bridge substructure',
    unit: 'cum',
    tender_quantity: 100.0,
    awarded_rate: 7500.0,
    total_amount: 750000.0,
    item_type: 'original',
    status: 'active',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  }

  it('executes the full government contractor chain flawlessly', () => {
    // -------------------------------------------------------------
    // STAGE 1: FIELD MEASUREMENT RECORDING (e-MB Intake)
    // -------------------------------------------------------------
    // Entry 1: 4 Piers (Nos x L x B x H)
    const pierQty = calculateMeasurementQuantity({
      calculationMode: 'num_l_b_h',
      numberOfUnits: 4,
      length: 1.5,
      breadth: 1.5,
      depthHeight: 4.0,
    })
    expect(pierQty).toBe(36.0) // 4 * 1.5 * 1.5 * 4 = 36 cum

    // Entry 2: Pier Caps (Manual level sheet)
    const capQty = calculateMeasurementQuantity({
      calculationMode: 'manual',
      manualQuantity: 33.75,
    })
    expect(capQty).toBe(33.75)

    const totalRecordedQty = pierQty + capQty
    expect(totalRecordedQty).toBe(69.75)

    // Validate that measured quantity does not exceed tender BOQ
    const boqCheck = validateQuantityAgainstBOQ({
      contractQuantity: boqItem.tender_quantity,
      previousQuantity: 0,
      currentQuantity: totalRecordedQty,
    })
    expect(boqCheck.isExceeded).toBe(false)
    expect(boqCheck.balanceQuantity).toBe(30.25) // 100 - 69.75 = 30.25 cum remaining

    // -------------------------------------------------------------
    // STAGE 2: SUPERVISION & EE CERTIFICATION
    // -------------------------------------------------------------
    const certifiedEntries: MeasurementEntry[] = [
      {
        id: 'me-pier-1',
        organization_id: 'org-1',
        project_id: 'proj-bridge',
        boq_item_id: boqItem.id,
        entry_number: 'MB-03/P-12',
        page_number: 12,
        measurement_date: '2026-09-12',
        description: 'Piers P1 to P4 casting',
        calculation_mode: 'num_l_b_h',
        number_of_units: 4,
        length: 1.5,
        breadth: 1.5,
        depth_height: 4.0,
        calculated_quantity: pierQty,
        unit: 'cum',
        previous_quantity: 0,
        current_quantity: pierQty,
        cumulative_quantity: pierQty,
        boq_balance_quantity: 64.0,
        is_exceeded: false,
        status: 'CERTIFIED', // Certified by EE
        certified_by: 'Er. A. K. Sharma (EE, CPWD)',
        certified_at: '2026-09-14T11:00:00Z',
        created_at: '2026-09-12T10:00:00Z',
        updated_at: '2026-09-14T11:00:00Z',
      },
      {
        id: 'me-caps-2',
        organization_id: 'org-1',
        project_id: 'proj-bridge',
        boq_item_id: boqItem.id,
        entry_number: 'MB-03/P-18',
        page_number: 18,
        measurement_date: '2026-09-18',
        description: 'Pier caps P1 to P4',
        calculation_mode: 'manual',
        number_of_units: 1,
        length: 0,
        breadth: 0,
        depth_height: 0,
        calculated_quantity: capQty,
        unit: 'cum',
        previous_quantity: pierQty,
        current_quantity: capQty,
        cumulative_quantity: totalRecordedQty,
        boq_balance_quantity: 30.25,
        is_exceeded: false,
        status: 'CERTIFIED', // Certified by EE
        certified_by: 'Er. A. K. Sharma (EE, CPWD)',
        certified_at: '2026-09-20T15:30:00Z',
        created_at: '2026-09-18T10:00:00Z',
        updated_at: '2026-09-20T15:30:00Z',
      },
    ]

    // Verify Unbilled Certified Work before creating RA Bill
    const unbilledBeforeBill = calculateUnbilledCertifiedWork({
      boqItems: [boqItem],
      measurements: certifiedEntries,
      totalBilledWorkValue: 0,
      projectId: 'proj-bridge',
    })
    expect(unbilledBeforeBill.totalCertifiedWorkValue).toBe(69.75 * 7500) // ₹5,23,125
    expect(unbilledBeforeBill.totalBilledWorkValue).toBe(0)
    expect(unbilledBeforeBill.unbilledCertifiedWorkValue).toBe(523125)

    // -------------------------------------------------------------
    // STAGE 3: BILL PREPARATION & SYSTEM CALCULATIONS
    // -------------------------------------------------------------
    const billingBreakdown = calculateBOQBillingBreakdown({
      boqItem,
      allMeasurements: certifiedEntries,
      previouslyBilledQuantity: 0, // First bill
    })

    expect(billingBreakdown.boq_quantity).toBe(100.0)
    expect(billingBreakdown.measured_quantity).toBe(69.75)
    expect(billingBreakdown.certified_quantity).toBe(69.75)
    expect(billingBreakdown.previously_billed_qty).toBe(0)
    expect(billingBreakdown.current_bill_qty).toBe(69.75)
    expect(billingBreakdown.cumulative_billed_qty).toBe(69.75)
    expect(billingBreakdown.balance_quantity).toBe(30.25)
    expect(billingBreakdown.is_exceeded_certified).toBe(false)

    // Enforcement: verify that attempting to bill more than certified is blocked
    const illegalBreakdown = calculateBOQBillingBreakdown({
      boqItem,
      allMeasurements: certifiedEntries,
      previouslyBilledQuantity: 0,
      currentBillQuantity: 80.0, // 80 > 69.75 certified!
    })
    const validationCheck = validateBillingAgainstCertified(illegalBreakdown)
    expect(validationCheck.isValid).toBe(false)
    expect(validationCheck.errorMessage).toContain('exceeds certified quantity')

    // Work Certified Amount
    const grossWorkCertified = billingBreakdown.current_amount
    expect(grossWorkCertified).toBe(523125) // 69.75 * 7500

    // Statutory Deductions (CPWD / PWD Standard: 5% Retention, 2% IT TDS, 2% GST TDS, 1% Cess)
    const statutoryDeductions = calculateStatutoryDeductions(grossWorkCertified, {
      contractorType: 'company_firm',
      retentionPercent: 5.0,
      itTdsPercent: 2.0,
      gstTdsPercent: 2.0,
      labourCessPercent: 1.0,
    })

    expect(statutoryDeductions.retention).toBe(26156.25) // 5% of 5,23,125
    expect(statutoryDeductions.itTds).toBe(10462.5)     // 2%
    expect(statutoryDeductions.gstTds).toBe(10462.5)    // 2%
    expect(statutoryDeductions.labourCess).toBe(5231.25) // 1%
    expect(statutoryDeductions.totalDeductions).toBe(52312.5) // Total 10% deductions

    // Net Payable Amount
    const netPayable = calculateRABillNetPayable({
      workCertified: grossWorkCertified,
      totalDeductions: statutoryDeductions.totalDeductions,
    })
    expect(netPayable).toBe(470812.5) // 523125 - 52312.50 = ₹4,70,812.50

    // -------------------------------------------------------------
    // STAGE 4: PAYMENT RELEASE & SETTLEMENT
    // -------------------------------------------------------------
    // Before payment: status is unpaid / submitted
    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 0 })).toBe('unpaid')

    // Partial Tranche release: ₹2,00,000 received
    expect(deriveBillPaymentStatus({ netPayable, totalReceived: 200000 })).toBe('partially_paid')

    // Full payment tranche cleared by Treasury / PFMS
    const fullSettlementStatus = deriveBillPaymentStatus({
      netPayable,
      totalReceived: 470812.5,
    })
    expect(fullSettlementStatus).toBe('fully_paid')

    // After billing, Unbilled Certified Work drops to ₹0
    const unbilledAfterBill = calculateUnbilledCertifiedWork({
      boqItems: [boqItem],
      measurements: certifiedEntries.map(e => ({ ...e, billed_in_ra_bill_id: 'bill-ra-01' })),
      totalBilledWorkValue: 523125,
      projectId: 'proj-bridge',
    })
    expect(unbilledAfterBill.unbilledCertifiedWorkValue).toBe(0)
    expect(unbilledAfterBill.totalBilledWorkValue).toBe(523125)
  })
})
