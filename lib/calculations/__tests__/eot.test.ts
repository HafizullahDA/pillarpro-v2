import { describe, it, expect } from 'vitest'
import {
  calculateRevisedCompletionDate,
  calculatePendingDays,
  aggregateEOTMetrics,
  filterEOTCases,
} from '../eot'
import { EOTCase } from '../../types/eot'

describe('Extension of Time (EOT) Calculation Engine', () => {
  describe('calculateRevisedCompletionDate', () => {
    it('correctly calculates revised completion date: original date + approved days', () => {
      // 2026-03-31 + 45 days = 2026-05-15
      const revised = calculateRevisedCompletionDate('2026-03-31', 45)
      expect(revised).toBe('2026-05-15')
    })

    it('returns original date when approved days is 0 or negative', () => {
      expect(calculateRevisedCompletionDate('2026-03-31', 0)).toBe('2026-03-31')
      expect(calculateRevisedCompletionDate('2026-03-31', -5)).toBe('2026-03-31')
    })

    it('handles leap year / year rollover cleanly', () => {
      // 2026-12-15 + 30 days = 2027-01-14
      const revised = calculateRevisedCompletionDate('2026-12-15', 30)
      expect(revised).toBe('2027-01-14')
    })
  })

  describe('calculatePendingDays', () => {
    it('calculates pending days as claimed minus approved when decision is pending', () => {
      // 60 days claimed, 20 approved -> 40 pending
      expect(calculatePendingDays(60, 20, 'PARTIALLY_APPROVED')).toBe(40)
      expect(calculatePendingDays(60, 0, 'UNDER_REVIEW')).toBe(60)
      expect(calculatePendingDays(60, 60, 'APPROVED')).toBe(0)
    })

    it('returns 0 pending days if case is REJECTED or CLOSED', () => {
      expect(calculatePendingDays(60, 0, 'REJECTED')).toBe(0)
      expect(calculatePendingDays(60, 30, 'CLOSED')).toBe(0)
    })
  })

  describe('aggregateEOTMetrics', () => {
    const mockCases: EOTCase[] = [
      {
        id: '1',
        organization_id: 'org1',
        project_id: 'p1',
        eot_reference: 'EOT/01',
        cause: 'Site unhanded over at km 4+200',
        start_date: '2026-01-01',
        claimed_days: 60,
        approved_days: 45,
        pending_days: 15,
        submission_date: '2026-02-01',
        current_completion_date: '2026-06-30',
        revised_completion_date: '2026-08-14',
        status: 'PARTIALLY_APPROVED',
        event_ids: [],
        hindrance_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: '2',
        organization_id: 'org1',
        project_id: 'p1',
        eot_reference: 'EOT/02',
        cause: 'Utility pole shifting delay',
        start_date: '2026-02-01',
        claimed_days: 30,
        approved_days: 0,
        pending_days: 30,
        submission_date: '2026-03-01',
        current_completion_date: '2026-08-14',
        revised_completion_date: '2026-08-14',
        status: 'UNDER_REVIEW',
        event_ids: [],
        hindrance_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        created_at: '2026-02-01',
        updated_at: '2026-02-01',
      },
      {
        id: '3',
        organization_id: 'org1',
        project_id: 'p2',
        eot_reference: 'EOT/03',
        cause: 'Unapproved drawing revision',
        start_date: '2026-03-01',
        claimed_days: 20,
        approved_days: 0,
        pending_days: 0,
        submission_date: '2026-03-15',
        current_completion_date: '2026-09-30',
        revised_completion_date: '2026-09-30',
        status: 'REJECTED',
        event_ids: [],
        hindrance_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
      },
    ]

    it('correctly aggregates claimed, approved, and pending days across cases', () => {
      const metrics = aggregateEOTMetrics(mockCases)
      expect(metrics.totalCases).toBe(3)
      expect(metrics.totalClaimedDays).toBe(110) // 60 + 30 + 20
      expect(metrics.totalApprovedDays).toBe(45)
      expect(metrics.totalPendingDays).toBe(45) // 15 + 30 + 0
      expect(metrics.partiallyApprovedCount).toBe(1)
      expect(metrics.underReviewCount).toBe(1)
      expect(metrics.rejectedCount).toBe(1)
    })

    it('filters cases by project id', () => {
      const p1Cases = filterEOTCases(mockCases, { projectId: 'p1' })
      expect(p1Cases.length).toBe(2)
      const p2Cases = filterEOTCases(mockCases, { projectId: 'p2' })
      expect(p2Cases.length).toBe(1)
    })

    it('filters cases by status and search text', () => {
      const underReview = filterEOTCases(mockCases, { status: 'UNDER_REVIEW' })
      expect(underReview.length).toBe(1)
      expect(underReview[0].eot_reference).toBe('EOT/02')

      const searchResults = filterEOTCases(mockCases, { search: 'utility' })
      expect(searchResults.length).toBe(1)
      expect(searchResults[0].eot_reference).toBe('EOT/02')
    })
  })
})
