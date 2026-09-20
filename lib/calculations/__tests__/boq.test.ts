import { describe, it, expect } from 'vitest'
import {
  calculateBOQProgress,
  parseBOQCSV,
  validateMeasurementQuantities,
} from '../boq'
import { BOQSummaryItem } from '../../types/boq'

describe('BOQ Calculations & Progress Engine', () => {
  it('correctly calculates overall progress from BOQ summary items', () => {
    const items: BOQSummaryItem[] = [
      {
        boq_item_id: '1',
        item_number: '1.1',
        description: 'Earthwork excavation in all kinds of soil',
        unit: 'cum',
        tender_quantity: 1000,
        awarded_rate: 250,
        tender_amount: 250000,
        cumulative_executed_qty: 1000,
        remaining_qty: 0,
        cumulative_executed_amount: 250000,
        work_done_percentage: 100,
      },
      {
        boq_item_id: '2',
        item_number: '1.2',
        description: 'Plain Cement Concrete (PCC) 1:4:8',
        unit: 'cum',
        tender_quantity: 200,
        awarded_rate: 4500,
        tender_amount: 900000,
        cumulative_executed_qty: 100,
        remaining_qty: 100,
        cumulative_executed_amount: 450000,
        work_done_percentage: 50,
      },
      {
        boq_item_id: '3',
        item_number: '1.3',
        description: 'Reinforced Cement Concrete (RCC) M25',
        unit: 'cum',
        tender_quantity: 150,
        awarded_rate: 8500,
        tender_amount: 1275000,
        cumulative_executed_qty: 0,
        remaining_qty: 150,
        cumulative_executed_amount: 0,
        work_done_percentage: 0,
      },
    ]

    const progress = calculateBOQProgress(items)

    expect(progress.totalTenderAmount).toBe(2425000) // 2.5L + 9L + 12.75L
    expect(progress.totalExecutedAmount).toBe(700000) // 2.5L + 4.5L + 0
    // 700000 / 2425000 = 28.87%
    expect(progress.overallWorkDonePct).toBe(28.87)
    expect(progress.totalItemsCount).toBe(3)
    expect(progress.completedItemsCount).toBe(1)
    expect(progress.inProgressItemsCount).toBe(1)
    expect(progress.unstartedItemsCount).toBe(1)
  })

  it('handles empty BOQ items gracefully', () => {
    const progress = calculateBOQProgress([])
    expect(progress.totalTenderAmount).toBe(0)
    expect(progress.totalExecutedAmount).toBe(0)
    expect(progress.overallWorkDonePct).toBe(0)
    expect(progress.totalItemsCount).toBe(0)
  })

  it('parses valid BOQ CSV correctly with flexible headers', () => {
    const csvContent = `Item No,Description,Unit,Tender Qty,Awarded Rate
1.1,"Earthwork in excavation in foundation trenches",cum,500,220.50
2.1,"Supplying and filling sand in plinth",cum,120,850
3.1,"Reinforcement for R.C.C. work (Fe 500D)",kg,15000,72.50`

    const { data, errors } = parseBOQCSV(csvContent)

    expect(errors.length).toBe(0)
    expect(data.length).toBe(3)
    expect(data[0].item_number).toBe('1.1')
    expect(data[0].description).toBe('Earthwork in excavation in foundation trenches')
    expect(data[0].unit).toBe('cum')
    expect(data[0].tender_quantity).toBe(500)
    expect(data[0].awarded_rate).toBe(220.5)

    expect(data[2].item_number).toBe('3.1')
    expect(data[2].tender_quantity).toBe(15000)
    expect(data[2].awarded_rate).toBe(72.5)
  })

  it('detects invalid rows and negative quantities in CSV', () => {
    const invalidCsv = `Item No,Description,Unit,Quantity,Rate
1.1,"Valid item",cum,100,50
1.2,"Invalid negative qty",cum,-50,100
1.3,"",cum,10,10`

    const { data, errors } = parseBOQCSV(invalidCsv)

    expect(data.length).toBe(1)
    expect(errors.length).toBe(2)
    expect(errors[0]).toContain('Invalid quantity')
    expect(errors[1]).toContain('missing a description')
  })

  it('warns when cumulative measurements exceed tender quantity', () => {
    const measurements = [
      { itemNumber: '1.1', tenderQty: 100, prevQty: 80, currentQty: 15 }, // 95 <= 100 (OK)
      { itemNumber: '1.2', tenderQty: 100, prevQty: 80, currentQty: 30 }, // 110 > 100 (Exceeds by 10)
    ]

    const result = validateMeasurementQuantities(measurements)

    expect(result.isValid).toBe(true)
    expect(result.errors.length).toBe(0)
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0]).toContain('exceeds tender quantity (100) by 10 (10% variation)')
  })
})

