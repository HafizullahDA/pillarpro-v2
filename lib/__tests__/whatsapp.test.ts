import { describe, it, expect } from 'vitest'
import {
  generateMonthlyMusterRollWhatsAppText,
  generateMusterRollWhatsAppText,
  getWhatsAppUrl,
  formatDPRWhatsAppMessage,
} from '../whatsapp'

describe('WhatsApp Formatter Utilities', () => {
  describe('generateMonthlyMusterRollWhatsAppText', () => {
    it('formats monthly muster roll with complete worker entries and consolidated totals', () => {
      const text = generateMonthlyMusterRollWhatsAppText({
        monthName: 'Aug',
        year: 2026,
        projectName: 'Flyover Pier 4B',
        org: { name: 'Apex Infrastructure Pvt Ltd' },
        workers: [
          {
            name: 'Aijaz ahmad',
            trade: 'Mason',
            daily_wage_rate: 1150,
            fullDays: 4,
            halfDays: 0,
            totalDays: 4,
            totalWage: 4600,
          },
          {
            name: 'Gh Mohiudin',
            trade: 'Mason',
            daily_wage_rate: 1150,
            fullDays: 3,
            halfDays: 2,
            totalDays: 4,
            totalWage: 4600,
          },
          {
            name: 'Raju Helper',
            trade: 'Helper',
            daily_wage_rate: 600,
            fullDays: 5,
            halfDays: 0,
            totalDays: 5,
            totalWage: 3000,
          },
        ],
        totalDays: 13,
        totalWages: 12200,
      })

      expect(text).toContain('*MONTHLY LABOR MUSTER ROLL & WAGE SHEET*')
      expect(text).toContain('*Firm:* Apex Infrastructure Pvt Ltd')
      expect(text).toContain('*Project:* Flyover Pier 4B')
      expect(text).toContain('*Period:* Aug 2026')
      expect(text).toContain('*Total Workforce:* 3 Workers')
      expect(text).toContain('*Total Work Days:* 13 Days')
      expect(text).toContain('₹12,200')
      expect(text).toContain('1. *Aijaz ahmad* (Mason)')
      expect(text).toContain('Days: 4 (4P) | Rate: ₹1,150 | Payable: ₹4,600')
      expect(text).toContain('2. *Gh Mohiudin* (Mason)')
      expect(text).toContain('Days: 4 (3P, 2H) | Rate: ₹1,150 | Payable: ₹4,600')
      expect(text).toContain('3. *Raju Helper* (Helper)')
      expect(text).toContain('Days: 5 (5P) | Rate: ₹600 | Payable: ₹3,000')
      expect(text).toContain('*CONSOLIDATED TOTAL:* 13 Days | ₹12,200')
    })

    it('handles empty worker list without crashing', () => {
      const text = generateMonthlyMusterRollWhatsAppText({
        monthName: 'Sep',
        year: 2026,
        projectName: 'Metro Station 2',
        workers: [],
        totalDays: 0,
        totalWages: 0,
      })

      expect(text).toContain('*MONTHLY LABOR MUSTER ROLL & WAGE SHEET*')
      expect(text).toContain('*Total Workforce:* 0 Workers')
      expect(text).toContain('(No worker records recorded for this period)')
      expect(text).toContain('*CONSOLIDATED TOTAL:* 0 Days | ₹0')
    })
  })

  describe('generateMusterRollWhatsAppText', () => {
    it('generates standard daily muster roll message', () => {
      const text = generateMusterRollWhatsAppText(
        '2026-09-01',
        'Site A',
        5,
        4500,
        { name: 'BuildCon' }
      )

      expect(text).toContain('*DAILY MUSTER ROLL & LABOR DEPLOYMENT*')
      expect(text).toContain('*Firm:* BuildCon')
      expect(text).toContain('• Workers on Site: 5')
      expect(text).toContain('₹4,500')
    })

    it('includes on-site workers list when provided', () => {
      const text = generateMusterRollWhatsAppText(
        '2026-09-01',
        'Site A',
        2,
        2000,
        { name: 'BuildCon' },
        [
          { name: 'Ramesh', trade: 'Mason', status: 'present' },
          { name: 'Suresh', trade: 'Helper', status: 'half_day' },
        ]
      )

      expect(text).toContain('*ON-SITE WORKERS:*')
      expect(text).toContain('1. *Ramesh* (Mason) — Present')
      expect(text).toContain('2. *Suresh* (Helper) — Half Day')
    })
  })

  describe('getWhatsAppUrl', () => {
    it('creates standard api url without phone', () => {
      const url = getWhatsAppUrl('Hello World')
      expect(url).toBe('https://api.whatsapp.com/send?text=Hello%20World')
    })

    it('formats 10-digit Indian phone number with 91 prefix', () => {
      const url = getWhatsAppUrl('Test', '9876543210')
      expect(url).toBe('https://wa.me/919876543210?text=Test')
    })
  })
})

