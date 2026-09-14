import { roundToTwo, safeAdd, safeSub, safeMul } from './financial'

export interface PartnerEquityCalculation {
  partnerId: string
  name: string
  sharePercentage: number
  allocatedAmount: number
}

/**
 * Calculates profit distribution or capital requirements according to partner equity percentage.
 */
export function calculatePartnerEquityShare(
  totalAmount: number,
  sharePercentage: number
): number {
  const total = roundToTwo(totalAmount)
  const pct = Math.max(0, Math.min(100, sharePercentage)) / 100
  return safeMul(total, pct)
}

/**
 * Computes a partner's net capital standing:
 * Net Balance = (Capital Contributed + Profit Share Allocation) - Drawings Taken
 */
export function calculatePartnerNetBalance({
  capitalContributed = 0,
  profitShare = 0,
  drawings = 0,
}: {
  capitalContributed?: number
  profitShare?: number
  drawings?: number
}): number {
  const cap = roundToTwo(capitalContributed)
  const prof = roundToTwo(profitShare)
  const draw = roundToTwo(drawings)

  return safeSub(safeAdd(cap, prof), draw)
}

