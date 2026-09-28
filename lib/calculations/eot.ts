import { EOTCase, EOTStatus, EOTMetrics } from '../types/eot'

/**
 * Calculates revised completion date by adding approved EOT days to current completion date.
 * Formula: Original / Current completion date + approved EOT days = revised completion date.
 */
export function calculateRevisedCompletionDate(
  currentCompletionDateStr: string,
  approvedDays: number
): string {
  if (!currentCompletionDateStr) return ''
  if (!approvedDays || approvedDays <= 0) return currentCompletionDateStr

  const date = new Date(currentCompletionDateStr)
  if (isNaN(date.getTime())) return currentCompletionDateStr

  date.setDate(date.getDate() + approvedDays)
  return date.toISOString().slice(0, 10)
}

/**
 * Calculates pending decision days.
 * Formula: Claimed days - Approved days (or 0 if rejected / closed).
 */
export function calculatePendingDays(
  claimedDays: number,
  approvedDays: number,
  status: EOTStatus
): number {
  if (status === 'REJECTED' || status === 'CLOSED') {
    return 0
  }
  return Math.max(0, claimedDays - Math.max(0, approvedDays))
}

/**
 * Aggregates overall Extension of Time portfolio metrics.
 */
export function aggregateEOTMetrics(cases: EOTCase[]): EOTMetrics {
  let totalClaimedDays = 0
  let totalApprovedDays = 0
  let totalPendingDays = 0
  let draftCount = 0
  let submittedCount = 0
  let underReviewCount = 0
  let partiallyApprovedCount = 0
  let approvedCount = 0
  let rejectedCount = 0

  for (const c of cases) {
    totalClaimedDays += c.claimed_days || 0
    totalApprovedDays += c.approved_days || 0
    totalPendingDays += calculatePendingDays(c.claimed_days || 0, c.approved_days || 0, c.status)

    if (c.status === 'DRAFT' || c.status === 'PREPARING') draftCount++
    else if (c.status === 'SUBMITTED') submittedCount++
    else if (c.status === 'UNDER_REVIEW') underReviewCount++
    else if (c.status === 'PARTIALLY_APPROVED') partiallyApprovedCount++
    else if (c.status === 'APPROVED') approvedCount++
    else if (c.status === 'REJECTED') rejectedCount++
  }

  return {
    totalCases: cases.length,
    totalClaimedDays,
    totalApprovedDays,
    totalPendingDays,
    draftCount,
    submittedCount,
    underReviewCount,
    partiallyApprovedCount,
    approvedCount,
    rejectedCount,
  }
}

export interface EOTFilterOptions {
  projectId?: string
  status?: EOTStatus | 'ALL'
  search?: string
}

/**
 * Filters EOT cases by project, status, and search query.
 */
export function filterEOTCases(
  cases: EOTCase[],
  options: EOTFilterOptions
): EOTCase[] {
  return cases.filter(c => {
    if (options.projectId && options.projectId !== 'all' && c.project_id !== options.projectId) {
      return false
    }
    if (options.status && options.status !== 'ALL' && c.status !== options.status) {
      return false
    }
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim()
      const matchRef = c.eot_reference.toLowerCase().includes(q)
      const matchCause = c.cause.toLowerCase().includes(q)
      const matchOrder = c.sanction_order_number?.toLowerCase().includes(q) || false
      const matchAuth = c.sanction_authority?.toLowerCase().includes(q) || false
      if (!matchRef && !matchCause && !matchOrder && !matchAuth) {
        return false
      }
    }
    return true
  })
}
