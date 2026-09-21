import { describe, it, expect } from 'vitest'
import {
  getNoticeUrgency,
  calculateDurationDays,
  calculateHindranceMetrics,
  generateClause5NoticeText,
  HindranceItem,
} from '../hindrance'

describe('Hindrance & Delay Defense Calculations', () => {
  describe('getNoticeUrgency', () => {
    it('returns served status if notice has been served', () => {
      const urgency = getNoticeUrgency('2026-09-01', true, '2026-09-05', '2026-09-20')
      expect(urgency.status).toBe('served')
      expect(urgency.variant).toBe('success')
      expect(urgency.label).toContain('Served on 2026-09-05')
    })

    it('returns pending with remaining days within safe window', () => {
      const urgency = getNoticeUrgency('2026-09-18', false, null, '2026-09-20')
      expect(urgency.status).toBe('pending')
      expect(urgency.daysElapsed).toBe(2)
      expect(urgency.daysRemaining).toBe(12)
      expect(urgency.variant).toBe('neutral')
    })

    it('returns due_soon when 5 or fewer days remain', () => {
      const urgency = getNoticeUrgency('2026-09-10', false, null, '2026-09-20')
      expect(urgency.status).toBe('due_soon')
      expect(urgency.daysElapsed).toBe(10)
      expect(urgency.daysRemaining).toBe(4)
      expect(urgency.variant).toBe('warning')
      expect(urgency.label).toContain('Urgent: Notice Due in 4 days')
    })

    it('returns overdue when more than 14 days elapsed without notice', () => {
      const urgency = getNoticeUrgency('2026-09-01', false, null, '2026-09-20')
      expect(urgency.status).toBe('overdue')
      expect(urgency.daysElapsed).toBe(19)
      expect(urgency.daysRemaining).toBe(-5)
      expect(urgency.variant).toBe('danger')
      expect(urgency.label).toContain('Overdue by 5d')
    })
  })

  describe('calculateDurationDays', () => {
    it('calculates inclusive day difference accurately', () => {
      expect(calculateDurationDays('2026-09-01', '2026-09-05')).toBe(5)
      expect(calculateDurationDays('2026-09-10', '2026-09-10')).toBe(1)
    })

    it('uses reference date when end_date is null', () => {
      expect(calculateDurationDays('2026-09-15', null, '2026-09-20')).toBe(6)
    })
  })

  describe('calculateHindranceMetrics', () => {
    const mockHindrances: HindranceItem[] = [
      {
        id: 'h-1',
        hindrance_number: 1,
        category: 'site_handover',
        description: 'Land acquisition dispute at Chainage 2+400',
        start_date: '2026-08-01',
        end_date: '2026-08-20', // 20 days
        status: 'resolved',
        delay_type: 'compensable',
        overlapping_days: 0,
        net_delay_days: 20,
        notice_served: true,
        notice_date: '2026-08-05',
      },
      {
        id: 'h-2',
        hindrance_number: 2,
        category: 'utility_shifting',
        description: 'Electric poles in road widening stretch',
        start_date: '2026-08-15',
        end_date: '2026-08-30', // 16 days total, 6 days overlap with h-1
        status: 'active',
        delay_type: 'compensable',
        overlapping_days: 6,
        net_delay_days: 10,
        notice_served: false,
      },
      {
        id: 'h-3',
        hindrance_number: 3,
        category: 'weather',
        description: 'Unprecedented flash floods',
        start_date: '2026-09-01',
        end_date: '2026-09-05', // 5 days
        status: 'resolved',
        delay_type: 'non_compensable',
        overlapping_days: 0,
        net_delay_days: 5,
        notice_served: true,
        notice_date: '2026-09-02',
      },
    ]

    it('aggregates days, compensable vs non-compensable, and LD protection', () => {
      const awardedAmount = 10000000 // 1 Crore
      const metrics = calculateHindranceMetrics(mockHindrances, awardedAmount, '2026-09-20')

      expect(metrics.totalCount).toBe(3)
      expect(metrics.activeCount).toBe(1)
      expect(metrics.resolvedCount).toBe(2)
      expect(metrics.totalGrossDays).toBe(20 + 16 + 5) // 41
      expect(metrics.totalOverlappingDays).toBe(6)
      expect(metrics.totalNetDays).toBe(20 + 10 + 5) // 35
      expect(metrics.compensableDays).toBe(30) // 20 + 10
      expect(metrics.nonCompensableDays).toBe(5)
      expect(metrics.ldRatePercent).toBe(10)
      expect(metrics.ldProtectedAmount).toBe(1000000) // 10 Lakhs (10% of 1 Cr)
    })
  })

  describe('generateClause5NoticeText', () => {
    it('formats professional legal letter with contract details', () => {
      const text = generateClause5NoticeText({
        project: {
          name: 'Widening of PMGSY Road Pkg-02',
          agency_name: 'PWD (R&B) Division Baramulla',
          awarded_amount: 18500000,
        },
        hindrance: {
          id: 'h-1',
          hindrance_number: 1,
          category: 'utility_shifting',
          description: 'High tension electricity lines obstructing culvert excavation',
          location_chainage: 'Km 3+400',
          start_date: '2026-09-10',
          status: 'active',
          delay_type: 'compensable',
          overlapping_days: 0,
          net_delay_days: 10,
          notice_served: false,
        },
        firmName: 'M/S Infotech construction',
        contractRefNo: 'EE/R&B/BAR/2026/0411',
        refNo: 'ITC/PWD/EOT/01',
        date: '2026-09-20',
      })

      expect(text).toContain('REF NO: ITC/PWD/EOT/01')
      expect(text).toContain('The Executive Engineer / Competent Authority')
      expect(text).toContain('PWD (R&B) Division Baramulla')
      expect(text).toContain('Widening of PMGSY Road Pkg-02')
      expect(text).toContain('High tension electricity lines')
      expect(text).toContain('Clause 5 of General Conditions of Contract (GCC)')
      expect(text).toContain('M/S Infotech construction')
    })
  })
})

