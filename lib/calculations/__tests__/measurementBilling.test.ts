import { describe, it, expect } from 'vitest'
import {
  calculateBOQBillingBreakdown,
  validateBillingAgainstCertified,
  calculateUnbilledCertifiedWork,
} from '../measurementBilling'
import { BOQItem } from '../../types/boq'
import { MeasurementEntry } from '../../types/measurement'

describe('PillarPro Measurement & RA Bill Integration Engine', () => {
  const mockBOQ: BOQItem = {
    id: 'boq-item-101',
    organization_id: 'org-test',
    project_id: 'proj-1',
    item_number: '2.14',
    description: 'Providing and laying RCC M25 in columns and beams',
    unit: 'cum',
    tender_quantity: 1000,
    awarded_rate: 6500,
    total_amount: 6500000,
    item_type: 'original',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockMeasurements: MeasurementEntry[] = [
    {
      id: 'me-1',
      organization_id: 'org-test',
      project_id: 'proj-1',
      boq_item_id: 'boq-item-101',
      entry_number: 'MB-01/P-12',
      page_number: 12,
      measurement_date: '2026-09-10',
      description: 'Columns C1-C8 up to plinth',
      calculation_mode: 'num_l_b_h',
      number_of_units: 8,
      length: 0.45,
      breadth: 0.45,
      depth_height: 3.0,
      calculated_quantity: 4.86,
      unit: 'cum',
      previous_quantity: 0,
      current_quantity: 4.86,
      cumulative_quantity: 4.86,
      boq_balance_quantity: 995.14,
      is_exceeded: false,
      status: 'CERTIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'me-2',
      organization_id: 'org-test',
      project_id: 'proj-1',
      boq_item_id: 'boq-item-101',
      entry_number: 'MB-01/P-25',
      page_number: 25,
      measurement_date: '2026-09-18',
      description: 'First floor beam grid',
      calculation_mode: 'manual',
      number_of_units: 1,
      length: 0,
      breadth: 0,
      depth_height: 0,
      calculated_quantity: 545.14,
      unit: 'cum',
      previous_quantity: 4.86,
      current_quantity: 545.14,
      cumulative_quantity: 550,
      boq_balance_quantity: 450,
      is_exceeded: false,
      status: 'CERTIFIED', // Total certified = 4.86 + 545.14 = 550
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'me-3',
      organization_id: 'org-test',
      project_id: 'proj-1',
      boq_item_id: 'boq-item-101',
      entry_number: 'MB-02/P-04',
      page_number: 4,
      measurement_date: '2026-09-26',
      description: 'Second floor slab cast (Pending EE inspection)',
      calculation_mode: 'manual',
      number_of_units: 1,
      length: 0,
      breadth: 0,
      depth_height: 0,
      calculated_quantity: 50.0,
      unit: 'cum',
      previous_quantity: 550,
      current_quantity: 50.0,
      cumulative_quantity: 600,
      boq_balance_quantity: 400,
      is_exceeded: false,
      status: 'SUBMITTED', // Measured = 600, but only 550 Certified!
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it('correctly calculates the canonical user example (BOQ=1000, Measured=600, Certified=550, Prev=400 => Current=150, Balance=450)', () => {
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 400,
    })

    expect(breakdown.boq_quantity).toBe(1000)
    expect(breakdown.measured_quantity).toBe(600)
    expect(breakdown.certified_quantity).toBe(550)
    expect(breakdown.previously_billed_qty).toBe(400)
    expect(breakdown.current_bill_qty).toBe(150) // Available unbilled certified
    expect(breakdown.cumulative_billed_qty).toBe(550)
    expect(breakdown.balance_quantity).toBe(450) // 1000 - 550
    expect(breakdown.is_exceeded_certified).toBe(false)
    expect(breakdown.current_amount).toBe(150 * 6500) // 9,75,000
    expect(breakdown.cumulative_amount).toBe(550 * 6500) // 35,75,000

    const validation = validateBillingAgainstCertified(breakdown)
    expect(validation.isValid).toBe(true)
  })

  it('rejects attempt to bill beyond certified quantity', () => {
    // Attempting to bill 200 when only 150 certified is available
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 400,
      currentBillQuantity: 200, // 400 + 200 = 600 > 550 certified!
    })

    expect(breakdown.cumulative_billed_qty).toBe(600)
    expect(breakdown.is_exceeded_certified).toBe(true)

    const validation = validateBillingAgainstCertified(breakdown)
    expect(validation.isValid).toBe(false)
    expect(validation.errorMessage).toContain('exceeds certified quantity')
  })

  it('calculates Unbilled Certified Work dashboard metric accurately (Certified=12.5L, Billed=10L => Unbilled=2.5L)', () => {
    const boqs: BOQItem[] = [
      {
        id: 'b-1',
        organization_id: 'org-test',
        project_id: 'p-1',
        item_number: '1',
        description: 'Road excavation',
        unit: 'cum',
        tender_quantity: 5000,
        awarded_rate: 250,
        total_amount: 1250000,
        item_type: 'original',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const certifiedEntries: MeasurementEntry[] = [
      {
        id: 'm-1',
        organization_id: 'org-test',
        project_id: 'p-1',
        boq_item_id: 'b-1',
        entry_number: 'MB-01/P-01',
        page_number: 1,
        measurement_date: '2026-09-01',
        description: 'Excavation Chainage 0-500m',
        calculation_mode: 'manual',
        number_of_units: 1,
        length: 0,
        breadth: 0,
        depth_height: 0,
        calculated_quantity: 5000, // 5000 * 250 = 12,50,000
        unit: 'cum',
        previous_quantity: 0,
        current_quantity: 5000,
        cumulative_quantity: 5000,
        boq_balance_quantity: 0,
        is_exceeded: false,
        status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const summary = calculateUnbilledCertifiedWork({
      boqItems: boqs,
      measurements: certifiedEntries,
      totalBilledWorkValue: 1000000, // 10,00,000 already billed in RA Bill 1 & 2
      projectId: 'p-1',
      projectName: 'Four-lane Highway Bypass',
    })

    expect(summary.totalCertifiedWorkValue).toBe(1250000)
    expect(summary.totalBilledWorkValue).toBe(1000000)
    expect(summary.unbilledCertifiedWorkValue).toBe(250000)
  })

  it('supports zero quantity billing without error or state distortion', () => {
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 400,
      currentBillQuantity: 0,
    })

    expect(breakdown.current_bill_qty).toBe(0)
    expect(breakdown.current_amount).toBe(0)
    expect(breakdown.cumulative_billed_qty).toBe(400)
    expect(breakdown.balance_quantity).toBe(600)
    expect(validateBillingAgainstCertified(breakdown).isValid).toBe(true)
  })

  it('supports high-precision 3-decimal quantity calculations (12.345 cum)', () => {
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 400.123,
      currentBillQuantity: 12.345,
    })

    expect(breakdown.previously_billed_qty).toBe(400.123)
    expect(breakdown.current_bill_qty).toBe(12.345)
    expect(breakdown.cumulative_billed_qty).toBe(412.468)
    expect(breakdown.balance_quantity).toBe(587.532)
    expect(validateBillingAgainstCertified(breakdown).isValid).toBe(true)
  })

  it('supports authorized negative adjustments and deduction entries', () => {
    // Contractor was previously billed 100 cum. An EE test check revealed defective work, requiring a -15 cum deduction.
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 100,
      currentBillQuantity: -15,
    })

    expect(breakdown.current_bill_qty).toBe(-15)
    expect(breakdown.cumulative_billed_qty).toBe(85)
    expect(breakdown.balance_quantity).toBe(915)

    // With allowNegativeAdjustment flag
    const validDeduction = validateBillingAgainstCertified(breakdown, { allowNegativeAdjustment: true })
    expect(validDeduction.isValid).toBe(true)

    // Without allowNegativeAdjustment flag, standard validation flags it
    const invalidWithoutFlag = validateBillingAgainstCertified(breakdown)
    expect(invalidWithoutFlag.isValid).toBe(false)
    expect(invalidWithoutFlag.errorMessage).toContain('Billing quantity cannot be negative')
  })

  it('rejects negative adjustments that would make cumulative billed negative', () => {
    const breakdown = calculateBOQBillingBreakdown({
      boqItem: mockBOQ,
      allMeasurements: mockMeasurements,
      previouslyBilledQuantity: 10,
      currentBillQuantity: -25, // 10 - 25 = -15 < 0
    })

    expect(breakdown.cumulative_billed_qty).toBe(-15)
    const validation = validateBillingAgainstCertified(breakdown, { allowNegativeAdjustment: true })
    expect(validation.isValid).toBe(false)
    expect(validation.errorMessage).toContain('Cumulative billed quantity cannot be negative')
  })
})
