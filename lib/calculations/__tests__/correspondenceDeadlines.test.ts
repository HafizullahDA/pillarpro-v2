import { describe, it, expect } from 'vitest'
import {
  calculateNoticeDeadline,
  getDeadlineUrgency,
  aggregateDeadlineMetrics,
  filterCorrespondenceRecords,
} from '../correspondenceDeadlines'
import { CorrespondenceRecord } from '../../types/correspondence'

describe('Correspondence & Contractual Notice Deadline Engine', () => {
  it('transparently calculates notice deadline as: Event date + Contract notice period', () => {
    const eventDate = '2026-03-01'
    const noticePeriodDays = 14
    const asOfDate = '2026-03-08' // 7 days after event, 7 days before deadline

    const calc = calculateNoticeDeadline(eventDate, noticePeriodDays, asOfDate)
    expect(calc.eventDate).toBe('2026-03-01')
    expect(calc.noticePeriodDays).toBe(14)
    expect(calc.calculatedDeadline).toBe('2026-03-15')
    expect(calc.daysRemaining).toBe(7)
    expect(calc.urgency).toBe('DUE_7_DAYS')
    expect(calc.formulaExplanation).toContain('Event Date (2026-03-01) + 14 Days Notice Period = Calculated Deadline (2026-03-15)')
  })

  it('correctly categorizes urgency as DUE_TODAY when asOfDate matches calculated deadline', () => {
    const calc = calculateNoticeDeadline('2026-03-01', 14, '2026-03-15')
    expect(calc.daysRemaining).toBe(0)
    expect(calc.urgency).toBe('DUE_TODAY')
    expect(calc.urgencyLabel).toBe('Due Today!')
  })

  it('correctly categorizes urgency as OVERDUE when asOfDate is past the calculated deadline', () => {
    const calc = calculateNoticeDeadline('2026-03-01', 14, '2026-03-20')
    expect(calc.daysRemaining).toBe(-5)
    expect(calc.urgency).toBe('OVERDUE')
    expect(calc.urgencyLabel).toBe('Overdue by 5 days')
  })

  it('correctly categorizes urgency as UPCOMING when more than 7 days remain', () => {
    const calc = calculateNoticeDeadline('2026-03-01', 28, '2026-03-05') // 24 days remaining
    expect(calc.daysRemaining).toBe(24)
    expect(calc.urgency).toBe('UPCOMING')
    expect(calc.urgencyLabel).toBe('Due in 24 days')
  })

  it('marks deadline as RESOLVED when status is RESPONDED or CLOSED', () => {
    const resResponded = getDeadlineUrgency('2026-03-10', 'RESPONDED', '2026-03-20')
    expect(resResponded.urgency).toBe('RESOLVED')

    const resClosed = getDeadlineUrgency('2026-03-10', 'CLOSED', '2026-03-20')
    expect(resClosed.urgency).toBe('RESOLVED')
  })

  it('aggregates dashboard deadline metrics for OVERDUE, DUE TODAY, DUE IN 7 DAYS, and UPCOMING', () => {
    const asOfDate = '2026-03-15'
    const mockRecords: Partial<CorrespondenceRecord>[] = [
      // 1. Overdue
      {
        id: 'c1',
        direction: 'INCOMING',
        category: 'CORRESPONDENCE',
        response_required: true,
        response_deadline: '2026-03-10',
        status: 'RECEIVED',
      },
      // 2. Due Today
      {
        id: 'c2',
        direction: 'INCOMING',
        category: 'SITE_INSTRUCTION',
        response_required: true,
        response_deadline: '2026-03-15',
        status: 'RESPONSE_REQUIRED',
      },
      // 3. Due within 7 days
      {
        id: 'c3',
        direction: 'OUTGOING',
        category: 'NOTICE',
        response_required: true,
        response_deadline: '2026-03-20',
        status: 'SENT',
      },
      // 4. Upcoming (> 7 days)
      {
        id: 'c4',
        direction: 'OUTGOING',
        category: 'CORRESPONDENCE',
        response_required: true,
        response_deadline: '2026-03-30',
        status: 'SENT',
      },
      // 5. Resolved (Responded)
      {
        id: 'c5',
        direction: 'INCOMING',
        category: 'CORRESPONDENCE',
        response_required: true,
        response_deadline: '2026-03-05',
        status: 'RESPONDED',
      },
    ]

    const metrics = aggregateDeadlineMetrics(mockRecords, asOfDate)
    expect(metrics.totalRecords).toBe(5)
    expect(metrics.incomingCount).toBe(3)
    expect(metrics.outgoingCount).toBe(2)
    expect(metrics.siteInstructionCount).toBe(1)
    expect(metrics.noticeCount).toBe(1)
    expect(metrics.overdueCount).toBe(1)
    expect(metrics.dueTodayCount).toBe(1)
    expect(metrics.dueWithin7DaysCount).toBe(1)
    expect(metrics.upcomingCount).toBe(1)
    expect(metrics.resolvedCount).toBe(1)
    expect(metrics.totalActionable).toBe(4)
  })

  it('filters correspondence records properly by search, direction, and category', () => {
    const records: Partial<CorrespondenceRecord>[] = [
      {
        id: 'c1',
        letter_number: 'EE/PWD/2026/894',
        reference_number: 'COR-2026-001',
        subject: 'Stop Memo on Culvert 2 Excavation',
        sender: 'Executive Engineer',
        recipient: 'PillarPro',
        direction: 'INCOMING',
        category: 'SITE_INSTRUCTION',
        status: 'RECEIVED',
      },
      {
        id: 'c2',
        letter_number: 'PP/EOT/2026/041',
        reference_number: 'NOT-2026-002',
        subject: 'Clause 5 Delay Notice for Demarcation Failure',
        sender: 'PillarPro',
        recipient: 'Executive Engineer',
        direction: 'OUTGOING',
        category: 'NOTICE',
        status: 'SENT',
      },
    ]

    const incomingOnly = filterCorrespondenceRecords(records, { direction: 'INCOMING' })
    expect(incomingOnly).toHaveLength(1)
    expect(incomingOnly[0].id).toBe('c1')

    const noticesOnly = filterCorrespondenceRecords(records, { category: 'NOTICE' })
    expect(noticesOnly).toHaveLength(1)
    expect(noticesOnly[0].id).toBe('c2')

    const searchResult = filterCorrespondenceRecords(records, { search: 'culvert' })
    expect(searchResult).toHaveLength(1)
    expect(searchResult[0].id).toBe('c1')
  })
})
