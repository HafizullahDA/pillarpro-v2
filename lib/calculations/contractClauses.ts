import {
  ContractClause,
  ContractObligation,
  ClauseCategory,
  ClauseStatus,
} from '../types/contractClauses'

export interface ClauseFilterOptions {
  category?: ClauseCategory | 'ALL'
  status?: ClauseStatus | 'ALL'
  search?: string
  eotOnly?: boolean
  ldOnly?: boolean
  escalationOnly?: boolean
  variationOnly?: boolean
  noticePeriodOnly?: boolean
  aiExtractedOnly?: boolean
}

export interface ClauseMetrics {
  totalClauses: number
  approvedCount: number
  draftCount: number
  underReviewCount: number
  rejectedCount: number
  aiExtractedCount: number
  noticeDrivingClausesCount: number
}

export interface ObligationMetrics {
  totalObligations: number
  activeCount: number
  overdueCount: number
  compliedCount: number
  contractorCount: number
  departmentCount: number
}

/**
 * Validates whether a clause is legally approved and qualified to drive automated deadline calculations.
 * Strict Rule: Never allow DRAFT, UNDER_REVIEW, or REJECTED clauses to drive deadline arithmetic.
 */
export function isClauseApprovedForDeadlines(clause: ContractClause): boolean {
  if (clause.status !== 'APPROVED') {
    return false
  }
  return typeof clause.notice_period_days === 'number' && clause.notice_period_days > 0
}

/**
 * Filter clauses by category, verification status, keywords, and relevance tags.
 */
export function filterContractClauses(
  clauses: ContractClause[],
  options: ClauseFilterOptions
): ContractClause[] {
  return clauses.filter(c => {
    if (options.category && options.category !== 'ALL' && c.category !== options.category) {
      return false
    }
    if (options.status && options.status !== 'ALL' && c.status !== options.status) {
      return false
    }
    if (options.eotOnly && !c.eot_relevance) return false
    if (options.ldOnly && !c.ld_relevance) return false
    if (options.escalationOnly && !c.escalation_relevance) return false
    if (options.variationOnly && !c.variation_relevance) return false
    if (options.noticePeriodOnly && (!c.notice_period_days || c.notice_period_days <= 0)) return false
    if (options.aiExtractedOnly && !c.is_ai_extracted) return false
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim()
      const matchNumber = c.clause_number.toLowerCase().includes(q)
      const matchTitle = c.clause_title.toLowerCase().includes(q)
      const matchText = c.clause_text.toLowerCase().includes(q)
      const matchDoc = c.source_document_title?.toLowerCase().includes(q) || false
      const matchPage = c.source_page_ref?.toLowerCase().includes(q) || false
      if (!matchNumber && !matchTitle && !matchText && !matchDoc && !matchPage) {
        return false
      }
    }
    return true
  })
}

/**
 * Aggregates verification statistics across clauses.
 */
export function aggregateClauseMetrics(clauses: ContractClause[]): ClauseMetrics {
  let approvedCount = 0
  let draftCount = 0
  let underReviewCount = 0
  let rejectedCount = 0
  let aiExtractedCount = 0
  let noticeDrivingClausesCount = 0

  for (const c of clauses) {
    if (c.status === 'APPROVED') approvedCount++
    else if (c.status === 'DRAFT') draftCount++
    else if (c.status === 'UNDER_REVIEW') underReviewCount++
    else if (c.status === 'REJECTED') rejectedCount++

    if (c.is_ai_extracted) aiExtractedCount++

    if (isClauseApprovedForDeadlines(c)) {
      noticeDrivingClausesCount++
    }
  }

  return {
    totalClauses: clauses.length,
    approvedCount,
    draftCount,
    underReviewCount,
    rejectedCount,
    aiExtractedCount,
    noticeDrivingClausesCount,
  }
}

/**
 * Aggregates obligation statistics.
 */
export function aggregateObligationMetrics(obligations: ContractObligation[]): ObligationMetrics {
  let activeCount = 0
  let overdueCount = 0
  let compliedCount = 0
  let contractorCount = 0
  let departmentCount = 0

  const todayStr = new Date().toISOString().slice(0, 10)

  for (const o of obligations) {
    if (o.status === 'ACTIVE') {
      if (o.due_date && o.due_date < todayStr) {
        overdueCount++
      } else {
        activeCount++
      }
    } else if (o.status === 'COMPLIED') {
      compliedCount++
    }
    if (o.responsible_party === 'CONTRACTOR') contractorCount++
    else if (o.responsible_party === 'DEPARTMENT') departmentCount++
  }

  return {
    totalObligations: obligations.length,
    activeCount,
    overdueCount,
    compliedCount,
    contractorCount,
    departmentCount,
  }
}
