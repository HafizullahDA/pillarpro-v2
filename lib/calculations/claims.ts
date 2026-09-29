import {
  ContractClaim,
  ClaimFinancialSummary,
  ClaimType,
  ClaimStatus,
} from '@/lib/types/claims'

/**
 * Calculates outstanding amount strictly according to determination status.
 *
 * Rules:
 * - If APPROVED or PARTIALLY_APPROVED: Approved Amount - Paid Amount
 * - If REJECTED or CLOSED: 0
 * - If DRAFT, PREPARING, SUBMITTED, UNDER_REVIEW: Claimed Amount - Paid Amount
 * - Result is always non-negative.
 */
export function calculateClaimOutstanding(
  claimedAmount: number,
  approvedAmount: number,
  paidAmount: number,
  status: ClaimStatus
): number {
  const claimed = Math.max(0, Number(claimedAmount) || 0)
  const approved = Math.max(0, Number(approvedAmount) || 0)
  const paid = Math.max(0, Number(paidAmount) || 0)

  if (status === 'REJECTED' || status === 'CLOSED') {
    return 0
  }

  if (status === 'APPROVED' || status === 'PARTIALLY_APPROVED') {
    return Math.max(0, Math.round((approved - paid) * 100) / 100)
  }

  return Math.max(0, Math.round((claimed - paid) * 100) / 100)
}

/**
 * Aggregates financial totals across claims.
 *
 * Strict Rule: Never count unapproved claims towards official approved/paid totals.
 */
export function aggregateClaimMetrics(claims: ContractClaim[]): ClaimFinancialSummary {
  let totalClaimed = 0
  let totalApproved = 0
  let totalPaid = 0
  let totalOutstanding = 0

  let approvedCount = 0
  let underReviewCount = 0
  let rejectedCount = 0
  let paidCount = 0
  let draftCount = 0

  for (const c of claims) {
    const claimed = Math.max(0, Number(c.claimed_amount) || 0)
    const approved = Math.max(0, Number(c.approved_amount) || 0)
    const paid = Math.max(0, Number(c.paid_amount) || 0)

    totalClaimed += claimed

    if (c.status === 'APPROVED' || c.status === 'PARTIALLY_APPROVED' || c.status === 'PAID') {
      totalApproved += approved
      approvedCount++
    }

    totalPaid += paid
    if (c.status === 'PAID') paidCount++

    if (c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED') {
      underReviewCount++
    }

    if (c.status === 'REJECTED') {
      rejectedCount++
    }

    if (c.status === 'DRAFT' || c.status === 'PREPARING') {
      draftCount++
    }

    const outstanding = calculateClaimOutstanding(claimed, approved, paid, c.status)
    totalOutstanding += outstanding
  }

  return {
    totalClaimed: Math.round(totalClaimed * 100) / 100,
    totalApproved: Math.round(totalApproved * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalCount: claims.length,
    approvedCount,
    underReviewCount,
    rejectedCount,
    paidCount,
    draftCount,
  }
}

/**
 * Filter claims by search, type, status, and project.
 */
export function filterClaims(
  claims: ContractClaim[],
  options: {
    query?: string
    type?: ClaimType | 'ALL'
    status?: ClaimStatus | 'ALL'
    projectId?: string
  }
): ContractClaim[] {
  const { query, type = 'ALL', status = 'ALL', projectId } = options

  return claims.filter((item) => {
    if (projectId && projectId !== 'all' && item.project_id !== projectId) {
      return false
    }

    if (type !== 'ALL' && item.claim_type !== type) {
      return false
    }

    if (status !== 'ALL' && item.status !== status) {
      return false
    }

    if (query && query.trim()) {
      const q = query.toLowerCase()
      const matchesNum = item.claim_number.toLowerCase().includes(q)
      const matchesTitle = item.title.toLowerCase().includes(q)
      const matchesDesc = item.description.toLowerCase().includes(q)
      const matchesBasis = item.basis_of_claim?.toLowerCase().includes(q) || false
      const matchesAuth = item.adjudication_authority?.toLowerCase().includes(q) || false

      if (!matchesNum && !matchesTitle && !matchesDesc && !matchesBasis && !matchesAuth) {
        return false
      }
    }

    return true
  })
}
