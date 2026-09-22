import { describe, it, expect } from 'vitest'
import {
  createMachineryAssetSchema,
  createMachineryLogSchema,
} from '../../validations/machinery'
import { calculateShiftWorkingHours, formatTime12Hour } from '../machinery'

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

describe('Machinery Shift Working Hours (Clock Time Engine)', () => {
  it('calculates 11:00 AM to 5:40 PM with 1 hour lunch break as 5.67 hours (5h 40m)', () => {
    const result = calculateShiftWorkingHours('11:00', '17:40', 60)
    expect(result.grossMinutes).toBe(400) // 6h 40m
    expect(result.breakMinutes).toBe(60) // 1h lunch
    expect(result.netMinutes).toBe(340) // 5h 40m
    expect(result.netHours).toBe(5.67)
    expect(result.formattedTime).toBe('5h 40m')
    expect(result.shiftSpanDescription).toBe('11:00 AM – 5:40 PM')
  })

  it('calculates 11:00 AM to 5:40 PM without break as 6.67 hours (6h 40m)', () => {
    const result = calculateShiftWorkingHours('11:00', '17:40', 0)
    expect(result.grossMinutes).toBe(400)
    expect(result.breakMinutes).toBe(0)
    expect(result.netMinutes).toBe(400)
    expect(result.netHours).toBe(6.67)
    expect(result.formattedTime).toBe('6h 40m')
  })

  it('calculates standard 9:00 AM to 5:00 PM shift with 1 hour lunch as 7.0 hours', () => {
    const result = calculateShiftWorkingHours('09:00', '17:00', 60)
    expect(result.grossMinutes).toBe(480)
    expect(result.breakMinutes).toBe(60)
    expect(result.netMinutes).toBe(420)
    expect(result.netHours).toBe(7)
    expect(result.formattedTime).toBe('7h')
  })

  it('formats 24h times to 12h nicely', () => {
    expect(formatTime12Hour('11:00')).toBe('11:00 AM')
    expect(formatTime12Hour('17:40')).toBe('5:40 PM')
    expect(formatTime12Hour('00:00')).toBe('12:00 AM')
    expect(formatTime12Hour('12:30')).toBe('12:30 PM')
  })
})


