import {
  ContractVariation,
  VariationContractSummary,
  VariationType,
  VariationStatus,
} from '@/lib/types/variations'

/**
 * Calculates the difference in quantity between proposed and original.
 */
export function calculateDifferenceQuantity(
  originalQuantity: number,
  proposedQuantity: number
): number {
  const orig = Number(originalQuantity) || 0
  const prop = Number(proposedQuantity) || 0
  return Math.round((prop - orig) * 1000) / 1000
}

/**
 * Calculates financial amount for a variation.
 * - EXTRA_ITEM: proposedQuantity * proposedRate
 * - DEVIATION / VARIATION / SUBSTITUTED_ITEM: (proposedQuantity - originalQuantity) * proposedRate
 */
export function calculateVariationAmount(
  type: VariationType,
  originalQuantity: number,
  proposedQuantity: number,
  originalRate: number,
  proposedRate: number
): {
  differenceQuantity: number
  amount: number
  isDeletion: boolean
  deletedAmount: number
} {
  const origQty = Number(originalQuantity) || 0
  const propQty = Number(proposedQuantity) || 0
  const origRt = Number(originalRate) || 0
  const propRt = Number(proposedRate) || origRt

  const differenceQuantity = calculateDifferenceQuantity(origQty, propQty)
  const isDeletion = differenceQuantity < 0
  const deletedAmount = isDeletion ? Math.round(Math.abs(differenceQuantity) * propRt * 100) / 100 : 0

  let amount = 0
  if (type === 'EXTRA_ITEM') {
    amount = Math.round(propQty * propRt * 100) / 100
  } else {
    amount = Math.round(differenceQuantity * propRt * 100) / 100
  }

  return {
    differenceQuantity,
    amount,
    isDeletion,
    deletedAmount,
  }
}

/**
 * Core Government Contract Value Formula:
 * Original Contract Value
 * + Approved Variations
 * + Approved Extra Items
 * - Deleted Work
 * = Current Contract Value
 *
 * NOTE: Unapproved / Proposed variations are STRICTLY EXCLUDED.
 */
export function calculateCurrentContractValue(
  originalContractValue: number,
  approvedVariations: number,
  approvedExtraItems: number,
  deletedWork: number
): number {
  const orig = Math.max(0, Number(originalContractValue) || 0)
  const appVar = Number(approvedVariations) || 0
  const appExtra = Number(approvedExtraItems) || 0
  const del = Number(deletedWork) || 0

  const current = orig + appVar + appExtra - del
  return Math.round(current * 100) / 100
}

/**
 * Aggregates complete variation metrics and contract value stages:
 * - Original (baseline)
 * - Proposed (tentative pending approval)
 * - Approved (sanctioned)
 * - Executed (measured on site)
 * - Billed (claimed in RA bills)
 * - Paid (cleared payments)
 */
export function aggregateVariationMetrics(
  variations: ContractVariation[],
  originalContractValue: number
): VariationContractSummary {
  const orig = Math.max(0, Number(originalContractValue) || 0)

  let proposedVariations = 0
  let approvedVariations = 0
  let approvedExtraItems = 0
  let deletedWork = 0
  let executedValue = 0
  let billedValue = 0
  let paidValue = 0

  let approvedCount = 0
  let proposedCount = 0
  let underApprovalCount = 0
  let rejectedCount = 0

  const APPROVED_STATUSES: VariationStatus[] = ['APPROVED', 'EXECUTED', 'BILLED', 'CLOSED']

  for (const v of variations) {
    const isApproved = APPROVED_STATUSES.includes(v.status)
    const isProposed = v.status === 'PROPOSED'
    const isUnderApproval = v.status === 'UNDER_APPROVAL'
    const isRejected = v.status === 'REJECTED'

    if (isApproved) approvedCount++
    if (isProposed) proposedCount++
    if (isUnderApproval) underApprovalCount++
    if (isRejected) rejectedCount++

    // Rate to use for approved realization
    const effApprovedRate = Number(v.approved_rate) || Number(v.proposed_rate) || Number(v.original_rate) || 0

    // Executed & Billed realization
    if (v.executed_quantity) {
      executedValue += Number(v.executed_quantity) * effApprovedRate
    }
    if (v.billed_quantity) {
      billedValue += Number(v.billed_quantity) * effApprovedRate
    }
    if (v.paid_amount) {
      paidValue += Number(v.paid_amount)
    }

    // Proposed (Pending Authority Sanction)
    if (isProposed || isUnderApproval) {
      const propAmt = Number(v.proposed_amount) || 0
      proposedVariations += propAmt
      continue
    }

    // Official Approved Additions & Reductions
    if (isApproved) {
      const appAmt = Number(v.approved_amount) || Number(v.proposed_amount) || 0
      const diffQty = Number(v.difference_quantity)

      if (v.type === 'EXTRA_ITEM') {
        approvedExtraItems += appAmt
      } else if (v.is_deletion || diffQty < 0) {
        // Deleted work
        const delAmt = Number(v.deleted_work_amount) || Math.abs(appAmt)
        deletedWork += Math.abs(delAmt)
      } else {
        // Normal positive deviation or variation
        approvedVariations += appAmt
      }
    }
  }

  const currentContractValue = calculateCurrentContractValue(
    orig,
    approvedVariations,
    approvedExtraItems,
    deletedWork
  )

  return {
    originalContractValue: Math.round(orig * 100) / 100,
    proposedVariations: Math.round(proposedVariations * 100) / 100,
    approvedVariations: Math.round(approvedVariations * 100) / 100,
    approvedExtraItems: Math.round(approvedExtraItems * 100) / 100,
    deletedWork: Math.round(deletedWork * 100) / 100,
    currentContractValue,
    executedValue: Math.round(executedValue * 100) / 100,
    billedValue: Math.round(billedValue * 100) / 100,
    paidValue: Math.round(paidValue * 100) / 100,
    totalCount: variations.length,
    approvedCount,
    proposedCount,
    underApprovalCount,
    rejectedCount,
  }
}

/**
 * Filter and search variations
 */
export function filterVariations(
  variations: ContractVariation[],
  options: {
    query?: string
    type?: VariationType | 'ALL'
    status?: VariationStatus | 'ALL'
    projectId?: string
    contractId?: string
  }
): ContractVariation[] {
  const { query, type = 'ALL', status = 'ALL', projectId, contractId } = options

  return variations.filter((item) => {
    if (projectId && projectId !== 'all' && item.project_id !== projectId) {
      return false
    }

    if (contractId && contractId !== 'all' && item.contract_id !== contractId) {
      return false
    }

    if (type !== 'ALL' && item.type !== type) {
      return false
    }

    if (status !== 'ALL' && item.status !== status) {
      return false
    }

    if (query && query.trim()) {
      const q = query.toLowerCase()
      const matchesRef = item.reference_number.toLowerCase().includes(q)
      const matchesDesc = item.proposed_item_description.toLowerCase().includes(q)
      const matchesAuthority = item.instruction_authority.toLowerCase().includes(q)
      const matchesCode = item.proposed_item_code?.toLowerCase().includes(q) || false
      const matchesBoq = item.boq_items?.item_number.toLowerCase().includes(q) || false

      if (!matchesRef && !matchesDesc && !matchesAuthority && !matchesCode && !matchesBoq) {
        return false
      }
    }

    return true
  })
}
