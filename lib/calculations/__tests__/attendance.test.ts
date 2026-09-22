import { describe, it, expect } from 'vitest'
import { generateMonthlyMusterRollWhatsAppText, generateMusterRollWhatsAppText } from '../../whatsapp'

describe('Attendance & Overtime (OT) Engine', () => {
  describe('Overtime Shift & Wage Accrual Formulas', () => {
    it('calculates hourly wage from daily wage rate based on standard 8-hour shift', () => {
      const dailyRate = 1200
      const hourlyRate = dailyRate / 8
      expect(hourlyRate).toBe(150)
    })

    it('calculates overtime wage accrual for manual hours', () => {
      const dailyRate = 1200
      const otHours = 3.5
      const otWage = (otHours / 8) * dailyRate
      expect(otWage).toBe(525)
    })

    it('calculates total day equivalents with overtime hours', () => {
      const fullDays = 4
      const halfDays = 2 // 1.0 day
      const otHours = 6 // 6/8 = 0.75 day
      const totalDays = fullDays + halfDays * 0.5 + otHours / 8
      expect(totalDays).toBe(5.75)
    })

    it('extracts OT hours from notes fallback string', () => {
      const note1 = 'OT:2h'
      const note2 = 'OT: 3.5 hrs'
      const note3 = 'Shift completed OT:4.0h poured slab'

      const extractOT = (note?: string | null) => {
        if (!note) return 0
        const match = note.match(/OT:\s*([0-9.]+)\s*h?/i)
        return match && match[1] ? parseFloat(match[1]) || 0 : 0
      }

      expect(extractOT(note1)).toBe(2)
      expect(extractOT(note2)).toBe(3.5)
      expect(extractOT(note3)).toBe(4)
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
