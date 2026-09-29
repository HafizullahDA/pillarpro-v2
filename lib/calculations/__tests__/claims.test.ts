import { describe, it, expect } from 'vitest'
import {
  calculateClaimOutstanding,
  aggregateClaimMetrics,
  filterClaims,
} from '../claims'
import { ContractClaim } from '@/lib/types/claims'

describe('Contract Claims Financial Calculations', () => {
  describe('calculateClaimOutstanding', () => {
    it('computes outstanding for submitted claim as claimed - paid', () => {
      // Claimed 5 Lakhs, 0 paid, submitted
      expect(calculateClaimOutstanding(500000, 0, 0, 'SUBMITTED')).toBe(500000)
    })

    it('computes outstanding for approved claim as approved - paid', () => {
      // Claimed 10 Lakhs, Approved 6 Lakhs, Paid 2 Lakhs
      expect(calculateClaimOutstanding(1000000, 600000, 200000, 'APPROVED')).toBe(400000)
    })

    it('returns 0 outstanding for rejected or closed claims', () => {
      expect(calculateClaimOutstanding(500000, 0, 0, 'REJECTED')).toBe(0)
      expect(calculateClaimOutstanding(500000, 300000, 300000, 'CLOSED')).toBe(0)
    })

    it('never produces negative outstanding even if paid exceeds approved', () => {
      expect(calculateClaimOutstanding(100000, 50000, 60000, 'APPROVED')).toBe(0)
    })
  })

  describe('aggregateClaimMetrics', () => {
    const mockClaims: ContractClaim[] = [
      {
        id: 'c-1',
        organization_id: 'org-1',
        project_id: 'p-1',
        claim_number: 'CLM-01',
        claim_type: 'IDLE_MACHINERY',
        title: 'Idle Excavator on Chainage 12+500',
        claim_date: '2026-03-01',
        description: 'Right of way not handed over',
        claimed_amount: 300000,
        approved_amount: 250000,
        paid_amount: 100000,
        outstanding_amount: 150000,
        status: 'APPROVED',
        event_ids: [],
        hindrance_ids: [],
        eot_case_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        boq_item_ids: [],
        measurement_ids: [],
        ra_bill_ids: [],
        labour_record_ids: [],
        machinery_log_ids: [],
        expense_ids: [],
        created_at: '',
        updated_at: '',
      },
      {
        id: 'c-2',
        organization_id: 'org-1',
        project_id: 'p-1',
        claim_number: 'CLM-02',
        claim_type: 'PROLONGATION',
        title: 'Extended Site Overheads during rainy season delay',
        claim_date: '2026-03-10',
        description: 'Hudson formula quantification',
        claimed_amount: 800000,
        approved_amount: 0,
        paid_amount: 0,
        outstanding_amount: 800000,
        status: 'UNDER_REVIEW', // Unapproved!
        event_ids: [],
        hindrance_ids: [],
        eot_case_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        boq_item_ids: [],
        measurement_ids: [],
        ra_bill_ids: [],
        labour_record_ids: [],
        machinery_log_ids: [],
        expense_ids: [],
        created_at: '',
        updated_at: '',
      },
      {
        id: 'c-3',
        organization_id: 'org-1',
        project_id: 'p-1',
        claim_number: 'CLM-03',
        claim_type: 'PAYMENT_RELATED',
        title: 'Interest on delayed RA Bill 04 payment',
        claim_date: '2026-03-15',
        description: 'Passed 90 days late',
        claimed_amount: 150000,
        approved_amount: 0,
        paid_amount: 0,
        outstanding_amount: 0,
        status: 'REJECTED',
        event_ids: [],
        hindrance_ids: [],
        eot_case_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        boq_item_ids: [],
        measurement_ids: [],
        ra_bill_ids: [],
        labour_record_ids: [],
        machinery_log_ids: [],
        expense_ids: [],
        created_at: '',
        updated_at: '',
      },
    ]

    it('accurately aggregates Claimed, Approved, Paid, and Outstanding', () => {
      const metrics = aggregateClaimMetrics(mockClaims)

      // Total Claimed = 3,00,000 + 8,00,000 + 1,50,000 = 12,50,000
      expect(metrics.totalClaimed).toBe(1250000)

      // Total Approved = 2,50,000 (c-1 only; c-2 is under review and c-3 is rejected)
      expect(metrics.totalApproved).toBe(250000)

      // Total Paid = 1,00,000
      expect(metrics.totalPaid).toBe(100000)

      // Total Outstanding:
      // c-1: 250,000 - 100,000 = 150,000
      // c-2: 800,000 - 0 = 800,000
      // c-3: 0 (rejected)
      // Sum = 950,000
      expect(metrics.totalOutstanding).toBe(950000)

      expect(metrics.totalCount).toBe(3)
      expect(metrics.approvedCount).toBe(1)
      expect(metrics.underReviewCount).toBe(1)
      expect(metrics.rejectedCount).toBe(1)
    })
  })

  describe('filterClaims', () => {
    const claims = [
      {
        id: '1',
        organization_id: 'org',
        project_id: 'p1',
        claim_number: 'CLM-01',
        claim_type: 'IDLE_LABOUR' as const,
        title: 'Idle bar benders on Pier 4',
        claim_date: '2026-03-01',
        description: 'Drawing delay',
        claimed_amount: 100000,
        approved_amount: 0,
        paid_amount: 0,
        outstanding_amount: 100000,
        status: 'SUBMITTED' as const,
        event_ids: [],
        hindrance_ids: [],
        eot_case_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        boq_item_ids: [],
        measurement_ids: [],
        ra_bill_ids: [],
        labour_record_ids: [],
        machinery_log_ids: [],
        expense_ids: [],
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        organization_id: 'org',
        project_id: 'p2',
        claim_number: 'CLM-02',
        claim_type: 'ESCALATION' as const,
        title: 'Bitumen escalation index claim',
        claim_date: '2026-03-02',
        description: 'IOCL bulk price surge',
        claimed_amount: 500000,
        approved_amount: 400000,
        paid_amount: 400000,
        outstanding_amount: 0,
        status: 'PAID' as const,
        event_ids: [],
        hindrance_ids: [],
        eot_case_ids: [],
        evidence_ids: [],
        correspondence_ids: [],
        boq_item_ids: [],
        measurement_ids: [],
        ra_bill_ids: [],
        labour_record_ids: [],
        machinery_log_ids: [],
        expense_ids: [],
        created_at: '',
        updated_at: '',
      },
    ]

    it('filters by project ID', () => {
      const res = filterClaims(claims, { projectId: 'p1' })
      expect(res.length).toBe(1)
      expect(res[0].claim_number).toBe('CLM-01')
    })

    it('filters by type', () => {
      const res = filterClaims(claims, { type: 'ESCALATION' })
      expect(res.length).toBe(1)
      expect(res[0].claim_number).toBe('CLM-02')
    })

    it('searches text in title and description', () => {
      const res = filterClaims(claims, { query: 'bitumen' })
      expect(res.length).toBe(1)
      expect(res[0].id).toBe('2')
    })
  })
})
