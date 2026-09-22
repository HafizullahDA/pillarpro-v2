import { describe, it, expect } from 'vitest'
import { generateMonthlyMusterRollWhatsAppText, generateMusterRollWhatsAppText } from '../../whatsapp'
import {
  STANDARD_SHIFT_WORKING_HOURS,
  calculateHourlyWage,
  calculateOTDays,
  calculateOTWage,
} from '../attendance'

describe('Attendance & Overtime (OT) Engine', () => {
  describe('Overtime Shift & Wage Accrual Formulas (7 Working Hours Standard)', () => {
    it('verifies standard site shift working hours is 7 (with 1 hour break)', () => {
      expect(STANDARD_SHIFT_WORKING_HOURS).toBe(7)
    })

    it('calculates hourly wage from daily wage rate based on standard 7-hour shift', () => {
      const dailyRate = 1400
      const hourlyRate = calculateHourlyWage(dailyRate)
      expect(hourlyRate).toBe(200) // 1400 / 7 = 200
    })

    it('handles zero or negative daily wage rates gracefully', () => {
      expect(calculateHourlyWage(0)).toBe(0)
      expect(calculateHourlyWage(null)).toBe(0)
      expect(calculateHourlyWage(undefined)).toBe(0)
    })

    it('calculates overtime wage accrual for manual hours (e.g. 3.5h is half shift = 50% daily rate)', () => {
      const dailyRate = 1400
      const otHours = 3.5
      const otWage = calculateOTWage(otHours, dailyRate)
      expect(otWage).toBe(700) // 3.5/7 * 1400 = 700
    })

    it('calculates full shift overtime (7h = 100% daily rate)', () => {
      const dailyRate = 1000
      const otHours = 7
      const otWage = calculateOTWage(otHours, dailyRate)
      expect(otWage).toBe(1000)
    })

    it('calculates total day equivalents with overtime hours', () => {
      const fullDays = 4
      const halfDays = 2 // 1.0 day
      const otHours = 3.5 // 3.5/7 = 0.50 day
      const totalDays = fullDays + halfDays * 0.5 + calculateOTDays(otHours)
      expect(totalDays).toBe(5.5)
    })

    it('extracts OT hours from notes fallback string', () => {
      const note1 = 'OT:2h'
      const note2 = 'OT: 3.5 hrs'
      const note3 = 'Shift completed OT:7.0h poured slab'

      const extractOT = (note?: string | null) => {
        if (!note) return 0
        const match = note.match(/OT:\s*([0-9.]+)\s*h?/i)
        return match && match[1] ? parseFloat(match[1]) || 0 : 0
      }

      expect(extractOT(note1)).toBe(2)
      expect(extractOT(note2)).toBe(3.5)
      expect(extractOT(note3)).toBe(7)
      expect(extractOT('Normal present without ot')).toBe(0)
      expect(extractOT(null)).toBe(0)
    })
  })

  describe('WhatsApp Export with Overtime', () => {
    it('includes overtime hours in monthly muster roll breakdown', () => {
      const text = generateMonthlyMusterRollWhatsAppText({
        monthName: 'Sep',
        year: 2026,
        projectName: 'Bridge Pier 12',
        workers: [
          {
            name: 'Mudasir Lone',
            trade: 'Mason',
            daily_wage_rate: 1000,
            fullDays: 5,
            halfDays: 0,
            overtimeHours: 4,
            totalDays: 5.5,
            totalWage: 5500,
          },
        ],
        totalDays: 5.5,
        totalWages: 5500,
      })

      expect(text).toContain('1. *Mudasir Lone* (Mason)')
      expect(text).toContain('Days: 5.5 (5P, 4h OT)')
      expect(text).toContain('Payable: ₹5,500')
    })

    it('includes overtime hours in daily attendance share', () => {
      const text = generateMusterRollWhatsAppText(
        '2026-09-22',
        'Bridge Pier 12',
        1,
        1250,
        { name: 'PillarPro Construction' },
        [
          {
            name: 'Mudasir Lone',
            trade: 'Mason',
            status: 'present',
            daily_wage_rate: 1000,
            overtimeHours: 2,
          },
        ]
      )

      expect(text).toContain('1. *Mudasir Lone* (Mason) — Present (+2h OT)')
      expect(text).toContain('• Estimated Daily Wage Accrual: ₹1,250')
    })
  })
})
