import { describe, it, expect } from 'vitest'
import {
  isClauseApprovedForDeadlines,
  filterContractClauses,
  aggregateClauseMetrics,
  aggregateObligationMetrics,
} from '../contractClauses'
import { ContractClause, ContractObligation } from '../../types/contractClauses'

describe('Contract Clause Management Engine', () => {
  const mockClauses: ContractClause[] = [
    {
      id: 'c1',
      organization_id: 'org1',
      contract_id: 'ctr1',
      clause_number: 'Clause 5',
      clause_title: 'Extension of Time for Delay',
      clause_text: 'The contractor shall give notice within 14 days of impediment.',
      category: 'EOT',
      notice_period_days: 14,
      payment_requirement: null,
      eot_relevance: true,
      variation_relevance: false,
      claim_relevance: true,
      bg_relevance: false,
      retention_relevance: false,
      ld_relevance: false,
      escalation_relevance: false,
      status: 'APPROVED',
      is_ai_extracted: true,
      source_page_ref: 'Page 14, Para 5.2',
      source_document_title: 'CPWD_GCC_2024.pdf',
      ai_confidence_score: 0.96,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'c2',
      organization_id: 'org1',
      contract_id: 'ctr1',
      clause_number: 'Clause 2',
      clause_title: 'Compensation for Delay',
      clause_text: 'Liquidated damages at 0.5% per week up to 10% maximum cap.',
      category: 'LD',
      notice_period_days: 7,
      payment_requirement: null,
      eot_relevance: false,
      variation_relevance: false,
      claim_relevance: false,
      bg_relevance: false,
      retention_relevance: false,
      ld_relevance: true,
      escalation_relevance: false,
      status: 'DRAFT',
      is_ai_extracted: true,
      source_page_ref: 'Page 8, Clause 2',
      source_document_title: 'CPWD_GCC_2024.pdf',
      ai_confidence_score: 0.88,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'c3',
      organization_id: 'org1',
      contract_id: 'ctr1',
      clause_number: 'Clause 10CC',
      clause_title: 'Price Escalation on Materials & Labour',
      clause_text: 'Escalation shall be applicable only for contracts with duration exceeding 12 months.',
      category: 'ESCALATION',
      notice_period_days: 30,
      payment_requirement: null,
      eot_relevance: false,
      variation_relevance: false,
      claim_relevance: true,
      bg_relevance: false,
      retention_relevance: false,
      ld_relevance: false,
      escalation_relevance: true,
      status: 'UNDER_REVIEW',
      is_ai_extracted: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'c4',
      organization_id: 'org1',
      contract_id: 'ctr1',
      clause_number: 'Clause 12',
      clause_title: 'Variations & Deviations',
      clause_text: 'Deviation limit is 30% for building works.',
      category: 'VARIATION',
      notice_period_days: null,
      payment_requirement: null,
      eot_relevance: false,
      variation_relevance: true,
      claim_relevance: false,
      bg_relevance: false,
      retention_relevance: false,
      ld_relevance: false,
      escalation_relevance: false,
      status: 'REJECTED',
      is_ai_extracted: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ]

  describe('isClauseApprovedForDeadlines (Rule Safeguard)', () => {
    it('returns true ONLY when status is APPROVED and notice_period_days > 0', () => {
      expect(isClauseApprovedForDeadlines(mockClauses[0])).toBe(true)
    })

    it('rejects DRAFT/UNVERIFIED AI clause from driving deadline calculations', () => {
      expect(isClauseApprovedForDeadlines(mockClauses[1])).toBe(false)
    })

    it('rejects UNDER_REVIEW and REJECTED clauses', () => {
      expect(isClauseApprovedForDeadlines(mockClauses[2])).toBe(false)
      expect(isClauseApprovedForDeadlines(mockClauses[3])).toBe(false)
    })

    it('rejects APPROVED clauses without notice period', () => {
      const clauseWithoutNotice: ContractClause = {
        ...mockClauses[0],
        notice_period_days: null,
      }
      expect(isClauseApprovedForDeadlines(clauseWithoutNotice)).toBe(false)
    })
  })

  describe('filterContractClauses', () => {
    it('filters by category', () => {
      const eotResults = filterContractClauses(mockClauses, { category: 'EOT' })
      expect(eotResults.length).toBe(1)
      expect(eotResults[0].clause_number).toBe('Clause 5')
    })

    it('filters by verification status', () => {
      const drafts = filterContractClauses(mockClauses, { status: 'DRAFT' })
      expect(drafts.length).toBe(1)
      expect(drafts[0].clause_number).toBe('Clause 2')
    })

    it('filters by relevance flag (e.g. escalation)', () => {
      const escalationResults = filterContractClauses(mockClauses, { escalationOnly: true })
      expect(escalationResults.length).toBe(1)
      expect(escalationResults[0].clause_number).toBe('Clause 10CC')
    })

    it('filters by keyword search across number, title, text, and page ref', () => {
      const textSearch = filterContractClauses(mockClauses, { search: 'Para 5.2' })
      expect(textSearch.length).toBe(1)
      expect(textSearch[0].clause_number).toBe('Clause 5')

      const titleSearch = filterContractClauses(mockClauses, { search: 'Escalation' })
      expect(titleSearch.length).toBe(1)
      expect(titleSearch[0].clause_number).toBe('Clause 10CC')
    })

    it('filters by AI-extracted flag', () => {
      const aiResults = filterContractClauses(mockClauses, { aiExtractedOnly: true })
      expect(aiResults.length).toBe(3)
    })
  })

  describe('aggregateClauseMetrics', () => {
    it('correctly aggregates clause statuses and counts notice-driving clauses', () => {
      const metrics = aggregateClauseMetrics(mockClauses)
      expect(metrics.totalClauses).toBe(4)
      expect(metrics.approvedCount).toBe(1)
      expect(metrics.draftCount).toBe(1)
      expect(metrics.underReviewCount).toBe(1)
      expect(metrics.rejectedCount).toBe(1)
      expect(metrics.aiExtractedCount).toBe(3)
      expect(metrics.noticeDrivingClausesCount).toBe(1)
    })
  })

  describe('aggregateObligationMetrics', () => {
    const mockObligations: ContractObligation[] = [
      {
        id: 'o1',
        organization_id: 'org1',
        contract_id: 'ctr1',
        title: 'Submit Hindrance Notice',
        responsible_party: 'CONTRACTOR',
        obligation_type: 'EVENT_TRIGGERED',
        due_date: '2026-12-31',
        status: 'ACTIVE',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'o2',
        organization_id: 'org1',
        contract_id: 'ctr1',
        title: 'Site Handover',
        responsible_party: 'DEPARTMENT',
        obligation_type: 'MILESTONE_TRIGGERED',
        due_date: '2025-01-01',
        status: 'ACTIVE',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'o3',
        organization_id: 'org1',
        contract_id: 'ctr1',
        title: 'Submit Initial PBG',
        responsible_party: 'CONTRACTOR',
        obligation_type: 'ONE_TIME',
        due_date: '2025-02-01',
        status: 'COMPLIED',
        completion_date: '2025-01-20',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]

    it('correctly aggregates active, overdue, and complied obligations', () => {
      const metrics = aggregateObligationMetrics(mockObligations)
      expect(metrics.totalObligations).toBe(3)
      expect(metrics.activeCount).toBe(1)
      expect(metrics.overdueCount).toBe(1)
      expect(metrics.compliedCount).toBe(1)
      expect(metrics.contractorCount).toBe(2)
      expect(metrics.departmentCount).toBe(1)
    })
  })
})
