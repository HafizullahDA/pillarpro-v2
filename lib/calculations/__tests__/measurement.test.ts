import { describe, it, expect } from 'vitest'
import {
  calculateMeasurementQuantity,
  calculateRowQuantity,
  calculateNetMeasurementQuantity,
  validateQuantityAgainstBOQ,
  buildAbstractOfMeasurements,
  formatChainage,
} from '../measurement'
import { BOQItem } from '../../types/boq'
import { MeasurementEntry, MeasurementSubRow } from '../../types/measurement'

describe('PillarPro e-MB Measurement Calculations', () => {
  it('calculates 3D volume (L x B x D) correctly', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'l_b_d',
      numberOfUnits: 2,
      length: 10,
      breadth: 3.5,
      depthHeight: 1.2,
    })
    expect(qty).toBe(84.0)
  })

  it('calculates 2D area (L x B) correctly for plaster/flooring', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'l_b',
      numberOfUnits: 4,
      length: 15.2,
      breadth: 4.5,
    })
    expect(qty).toBe(273.6)
  })

  it('calculates running length correctly', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'running_length',
      numberOfUnits: 5,
      length: 24.5,
    })
    expect(qty).toBe(122.5)
  })

  it('calculates rebar weight using standard IS formula (d^2 / 162.28)', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'weight',
      numberOfUnits: 10,
      length: 12,
      rebarDiameterMm: 16,
    })
    expect(qty).toBeCloseTo(189.302, 1)
  })

  it('calculates Steel Reinforcement BBS (Nos × Bars × L × D²/162.2) in Kg', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'steel_bbs',
      numberOfUnits: 2,
      barsPerMember: 4,
      length: 6.5,
      rebarDiameterMm: 20,
      boqUnit: 'Kg',
    })
    // 2 * 4 * 6.5 * (400 / 162.28) = 52 * 2.464875 = 128.1735 kg
    expect(qty).toBeCloseTo(128.174, 2)
  })

  it('auto-converts Steel BBS quantity to Metric Tonnes (MT) when BOQ unit is MT', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'steel_bbs',
      numberOfUnits: 10,
      barsPerMember: 8,
      length: 12,
      rebarDiameterMm: 25,
      boqUnit: 'MT',
    })
    // Total weight in Kg = 10 * 8 * 12 * (625 / 162.28) = 960 * 3.851367 = 3697.31 kg
    // In MT = 3.697 MT
    expect(qty).toBeCloseTo(3.697, 2)
  })

  it('auto-converts Steel BBS quantity to Quintals when BOQ unit is Qtl', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'steel_bbs',
      numberOfUnits: 10,
      barsPerMember: 8,
      length: 12,
      rebarDiameterMm: 25,
      boqUnit: 'Qtl',
    })
    // In Quintal = 3697.31 / 100 = 36.973 Qtl
    expect(qty).toBeCloseTo(36.973, 2)
  })

  it('calculates multi-row measurement net quantity with additions and deductions correctly', () => {
    const subRows: MeasurementSubRow[] = [
      {
        id: 'r1',
        particulars: 'Wall Plaster - Room 1',
        mode: 'add',
        nos: 1,
        length: 10,
        breadth: 3,
        quantity: 30,
      },
      {
        id: 'r2',
        particulars: 'Wall Plaster - Room 2',
        mode: 'add',
        nos: 1,
        length: 8,
        breadth: 3,
        quantity: 24,
      },
      {
        id: 'r3',
        particulars: 'Deduction for Door D1',
        mode: 'deduct',
        nos: 1,
        length: 1.2,
        breadth: 2.1,
        quantity: 2.52,
      },
      {
        id: 'r4',
        particulars: 'Deduction for Windows W1',
        mode: 'deduct',
        nos: 2,
        length: 1.5,
        breadth: 1.2,
        quantity: 3.6,
      },
    ]

    const result = calculateNetMeasurementQuantity(subRows, 'l_b', 'sqm')
    expect(result.totalAdd).toBe(54)
    expect(result.totalDeduct).toBe(6.12)
    expect(result.netQuantity).toBe(47.88)
  })

  it('clamps net quantity to zero if total deductions exceed additions', () => {
    const subRows: MeasurementSubRow[] = [
      {
        id: 'r1',
        particulars: 'Small Opening',
        mode: 'add',
        nos: 1,
        length: 2,
        breadth: 2,
        quantity: 4,
      },
      {
        id: 'r2',
        particulars: 'Large Deduction Void',
        mode: 'deduct',
        nos: 1,
        length: 5,
        breadth: 5,
        quantity: 25,
      },
    ]

    const result = calculateNetMeasurementQuantity(subRows, 'l_b', 'sqm')
    expect(result.totalAdd).toBe(4)
    expect(result.totalDeduct).toBe(25)
    expect(result.netQuantity).toBe(0)
  })

  it('calculates count / nos items correctly', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'count',
      numberOfUnits: 14,
    })
    expect(qty).toBe(14)
  })

  it('respects manual quantity entry', () => {
    const qty = calculateMeasurementQuantity({
      calculationMode: 'manual',
      manualQuantity: 450.75,
    })
    expect(qty).toBe(450.75)
  })

  it('validates quantity against BOQ when within limits', () => {
    const val = validateQuantityAgainstBOQ({
      contractQuantity: 500,
      previousQuantity: 150,
      currentQuantity: 80,
    })
    expect(val.cumulativeQuantity).toBe(230)
    expect(val.balanceQuantity).toBe(270)
    expect(val.isExceeded).toBe(false)
    expect(val.requiresDeviationAction).toBe(false)
  })

  it('flags overrun when cumulative exceeds contract quantity and requires deviation order', () => {
    const val = validateQuantityAgainstBOQ({
      contractQuantity: 100,
      previousQuantity: 90,
      currentQuantity: 25,
    })
    expect(val.cumulativeQuantity).toBe(115)
    expect(val.balanceQuantity).toBe(-15)
    expect(val.isExceeded).toBe(true)
    expect(val.exceededBy).toBe(15)
    expect(val.requiresDeviationAction).toBe(true)
  })

  it('builds Abstract of Measurements aggregating entries correctly', () => {
    const mockBOQ: BOQItem[] = [
      {
        id: 'boq-1',
        project_id: 'proj-1',
        item_number: '1.01',
        description: 'Earthwork excavation',
        unit: 'cum',
        organization_id: 'org-1',
        tender_quantity: 1000,
        awarded_rate: 250,
        total_amount: 250000,
        item_type: 'original',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const mockEntries: MeasurementEntry[] = [
      {
        id: 'e-1',
        organization_id: 'org-1',
        project_id: 'proj-1',
        boq_item_id: 'boq-1',
        entry_number: 'MB-01/P-12',
        page_number: 12,
        measurement_date: '2026-09-20',
        description: 'Excavation from Ch 0 to 100m',
        calculation_mode: 'l_b_d',
        number_of_units: 1,
        length: 100,
        breadth: 3,
        depth_height: 1,
        calculated_quantity: 300,
        unit: 'cum',
        previous_quantity: 0,
        current_quantity: 300,
        cumulative_quantity: 300,
        boq_balance_quantity: 700,
        is_exceeded: false,
        status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'e-2',
        organization_id: 'org-1',
        project_id: 'proj-1',
        boq_item_id: 'boq-1',
        entry_number: 'MB-01/P-15',
        page_number: 15,
        measurement_date: '2026-09-25',
        description: 'Excavation from Ch 100 to 200m',
        calculation_mode: 'l_b_d',
        number_of_units: 1,
        length: 100,
        breadth: 3,
        depth_height: 1.5,
        calculated_quantity: 450,
        unit: 'cum',
        previous_quantity: 300,
        current_quantity: 450,
        cumulative_quantity: 750,
        boq_balance_quantity: 250,
        is_exceeded: false,
        status: 'CHECKED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const abstractItems = buildAbstractOfMeasurements(mockBOQ, mockEntries)
    expect(abstractItems.length).toBe(1)
    const item = abstractItems[0]
    expect(item.cumulative_quantity).toBe(750)
    expect(item.balance_quantity).toBe(250)
    expect(item.certified_quantity).toBe(300)
    expect(item.cumulative_amount).toBe(187500)
    expect(item.certified_amount).toBe(75000)
    expect(item.entry_count).toBe(2)
    expect(item.is_exceeded).toBe(false)
  })

  it('formats chainage correctly into standard Indian PWD RD format', () => {
    expect(formatChainage(12, 450)).toBe('RD 12+450.0')
    expect(formatChainage(0, 75.5)).toBe('RD 0+075.5')
    expect(formatChainage(null, 150)).toBe('RD 150.00 m')
    expect(formatChainage(null, null)).toBe('—')
  })

  it('segregates previous billed quantities from current unbilled quantities in abstract', () => {
    const testBOQ: BOQItem[] = [
      {
        id: 'boq-item-1',
        project_id: 'proj-1',
        item_number: '1.01',
        description: 'Earthwork excavation',
        unit: 'cum',
        organization_id: 'org-test',
        tender_quantity: 1000,
        awarded_rate: 250,
        total_amount: 250000,
        item_type: 'original',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const mixedEntries: MeasurementEntry[] = [
      {
        id: 'me-billed',
        organization_id: 'org-test',
        project_id: 'proj-1',
        boq_item_id: 'boq-item-1',
        entry_number: 'MB-01/P-01',
        page_number: 1,
        measurement_date: '2026-08-15',
        description: 'Previously billed excavation',
        calculation_mode: 'manual',
        number_of_units: 1,
        length: 0,
        breadth: 0,
        depth_height: 0,
        calculated_quantity: 300,
        unit: 'cum',
        previous_quantity: 0,
        current_quantity: 300,
        cumulative_quantity: 300,
        boq_balance_quantity: 700,
        is_exceeded: false,
        status: 'CERTIFIED',
        billed_in_ra_bill_id: 'ra-bill-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'me-current',
        organization_id: 'org-test',
        project_id: 'proj-1',
        boq_item_id: 'boq-item-1',
        entry_number: 'MB-01/P-15',
        page_number: 15,
        measurement_date: '2026-09-15',
        description: 'Current period excavation',
        calculation_mode: 'manual',
        number_of_units: 1,
        length: 0,
        breadth: 0,
        depth_height: 0,
        calculated_quantity: 450,
        unit: 'cum',
        previous_quantity: 300,
        current_quantity: 450,
        cumulative_quantity: 750,
        boq_balance_quantity: 250,
        is_exceeded: false,
        status: 'CERTIFIED',
        billed_in_ra_bill_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const abstract = buildAbstractOfMeasurements(testBOQ, mixedEntries)
    expect(abstract.length).toBe(1)
    expect(abstract[0].previous_quantity).toBe(300)
    expect(abstract[0].current_quantity).toBe(450)
    expect(abstract[0].cumulative_quantity).toBe(750)
    expect(abstract[0].balance_quantity).toBe(250)
  })
})
