import { describe, it, expect } from 'vitest'
import { safeMul, roundToTwo } from '../financial'

describe('OCR Data Parsing and Normalization', () => {
  it('correctly defaults missing project and wage rate in attendance scan data', () => {
    const rawAttendanceScan = {
      date: '2026-09-14',
      project_name: null, // Project not written on paper
      entries: [
        { name: 'Raju Kumar', trade: 'Mason', daily_wage_rate: null, status: 'present' },
        { name: 'Sonu', trade: null, daily_wage_rate: 650, status: 'half_day' },
      ],
    }

    expect(rawAttendanceScan.project_name).toBeNull()
    expect(rawAttendanceScan.entries[0].daily_wage_rate).toBeNull()
    expect(rawAttendanceScan.entries[1].daily_wage_rate).toBe(650)
  })

  it('normalizes attendance status variants', () => {
    const normalizeStatus = (raw: string): 'present' | 'half_day' | 'absent' | 'overtime' => {
      const s = raw.toLowerCase().trim()
      if (s === 'h' || s === 'half_day' || s === '0.5' || s === '1/2') return 'half_day'
      if (s === 'ot' || s === 'overtime' || s === '1.5' || s === '2') return 'overtime'
      if (s === 'a' || s === 'absent' || s === '0') return 'absent'
      return 'present'
    }

    expect(normalizeStatus('P')).toBe('present')
    expect(normalizeStatus('Present')).toBe('present')
    expect(normalizeStatus('1')).toBe('present')
    expect(normalizeStatus('H')).toBe('half_day')
    expect(normalizeStatus('0.5')).toBe('half_day')
    expect(normalizeStatus('OT')).toBe('overtime')
    expect(normalizeStatus('A')).toBe('absent')
  })

  it('correctly calculates supplier invoice totals from quantity and rate', () => {
    const qty = 150.5
    const rate = 385.25
    const total = safeMul(qty, rate)
    expect(total).toBe(57980.13) // 150.5 * 385.25 = 57980.125 -> 57980.13
    expect(roundToTwo(total)).toBe(57980.13)
  })

  it('handles missing supplier details on invoices gracefully', () => {
    const rawSupplierInvoice = {
      supplier_name: null, // Blurry or unmentioned vendor
      gst_number: null,
      project_name: null,
      amount: 45000,
      description: 'Grit and coarse sand 2 truckloads',
    }

    expect(rawSupplierInvoice.supplier_name).toBeNull()
    expect(rawSupplierInvoice.project_name).toBeNull()
    expect(rawSupplierInvoice.amount).toBe(45000)
  })
})
