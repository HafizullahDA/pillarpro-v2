import { describe, it, expect } from 'vitest'
import { createInventoryItemSchema, createInventoryTrxSchema } from '../../validations/inventory'

describe('Inventory Item Validation', () => {
  it('validates a standard cement material entry', () => {
    const validItem = {
      item_name: 'UltraTech OPC 43 Cement',
      item_code: 'MAT-CEM-01',
      category: 'material',
      unit: 'bags',
      current_stock: 450,
      minimum_stock_alert: 50,
      notes: 'Stored in Shed B',
    }

    const result = createInventoryItemSchema.safeParse(validItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unit).toBe('bags')
      expect(result.data.minimum_stock_alert).toBe(50)
    }
  })

  it('fails when item_name is too short', () => {
    const invalidItem = {
      item_name: 'C',
      unit: 'bags',
    }

    const result = createInventoryItemSchema.safeParse(invalidItem)
    expect(result.success).toBe(false)
  })
})

describe('Inventory Transactions (GRN & Site Issue) Validation', () => {
  it('validates a Goods Received Note (GRN)', () => {
    const validGRN = {
      item_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
      transaction_type: 'receipt_in',
      quantity: 200,
      transaction_date: '2026-09-19',
      challan_number: 'CH-9921',
      vehicle_number: 'JK02-AB-4455',
    }

    const result = createInventoryTrxSchema.safeParse(validGRN)
    expect(result.success).toBe(true)
  })

  it('validates a site issue slip with destination', () => {
    const validIssue = {
      item_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
      transaction_type: 'issue_out',
      quantity: 50,
      transaction_date: '2026-09-19',
      destination_location: 'Pier P3 Concrete Pour',
      issued_to_person: 'Ramesh Mason',
    }

    const result = createInventoryTrxSchema.safeParse(validIssue)
    expect(result.success).toBe(true)
  })

  it('rejects transaction with zero or negative quantity', () => {
    const invalidTrx = {
      item_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
      transaction_type: 'issue_out',
      quantity: 0,
      transaction_date: '2026-09-19',
    }

    const result = createInventoryTrxSchema.safeParse(invalidTrx)
    expect(result.success).toBe(false)
  })
})

