import { describe, it, expect } from 'vitest'
import {
  createMachineryAssetSchema,
  createMachineryLogSchema,
} from '../../validations/machinery'

describe('Machinery Asset Validation', () => {
  it('validates a correct machinery asset', () => {
    const validAsset = {
      asset_name: 'JCB 3DX Eco',
      asset_type: 'excavator',
      registration_number: 'JK02-AZ-9999',
      model_year: '2022',
      ownership: 'owned',
      meter_tracking: 'hours',
      hourly_rate: 0,
      current_meter: 1250.5,
      status: 'active',
    }

    const result = createMachineryAssetSchema.safeParse(validAsset)
    expect(result.success).toBe(true)
  })

  it('fails if asset_name is too short', () => {
    const result = createMachineryAssetSchema.safeParse({
      asset_name: 'A',
      asset_type: 'excavator',
    })
    expect(result.success).toBe(false)
  })
})

describe('Machinery & Diesel Log Validation', () => {
  it('validates a correct run & fuel log', () => {
    const validLog = {
      asset_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      log_date: '2026-09-19',
      operator_name: 'Ramesh Singh',
      start_meter: 1250,
      end_meter: 1258.5,
      diesel_liters: 45,
      diesel_rate_per_liter: 90.5,
      work_description: 'Canal slope cutting',
    }

    const result = createMachineryLogSchema.safeParse(validLog)
    expect(result.success).toBe(true)
    if (result.success) {
      const run = result.data.end_meter - result.data.start_meter
      const cost = result.data.diesel_liters * result.data.diesel_rate_per_liter
      expect(run).toBe(8.5)
      expect(cost).toBe(4072.5)
    }
  })

  it('rejects log where end_meter is less than start_meter', () => {
    const invalidLog = {
      asset_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      log_date: '2026-09-19',
      start_meter: 500,
      end_meter: 450, // Invalid backward meter
      diesel_liters: 10,
      diesel_rate_per_liter: 90,
    }

    const result = createMachineryLogSchema.safeParse(invalidLog)
    expect(result.success).toBe(false)
  })
})

