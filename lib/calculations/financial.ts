/**
 * High-precision financial arithmetic utilities.
 * Protects against JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
 * by enforcing two-decimal paise rounding.
 */

export function roundToTwo(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export function safeAdd(...nums: number[]): number {
  const sum = nums.reduce((acc, n) => acc + (isNaN(n) ? 0 : n), 0)
  return roundToTwo(sum)
}

export function safeSub(a: number, b: number): number {
  const cleanA = isNaN(a) ? 0 : a
  const cleanB = isNaN(b) ? 0 : b
  return roundToTwo(cleanA - cleanB)
}

export function safeMul(a: number, b: number): number {
  const cleanA = isNaN(a) ? 0 : a
  const cleanB = isNaN(b) ? 0 : b
  return roundToTwo(cleanA * cleanB)
}

/**
 * Calculates Additional Performance Security / CDR for unbalanced bids as per J&K PWD Circular (08-08-2025).
 * 
 * Formula:
 * - Up to and including 10% below advertised cost: Nil (0%)
 * - More than 10% up to 20% below advertised cost: 0.1% for every percentage point below 10%
 * - 20% or more below advertised cost: 1.0% + 0.2% for every percentage point below 20%
 * 
 * The resulting rate percentage is applied to the bidder's quoted bid price (not advertised cost).
 * 
 * @param advertisedCost - Advertised / Project tender cost in ₹
 * @param bidPrice - Allotted / Quoted bid price in ₹
 */
export function calculateAdditionalPerformanceSecurity(
  advertisedCost: number,
  bidPrice: number
): {
  percentageBelow: number
  ratePercent: number
  additionalSecurityAmount: number
  slabDescription: string
} {
  if (!advertisedCost || advertisedCost <= 0 || !bidPrice || bidPrice <= 0 || bidPrice >= advertisedCost) {
    return {
      percentageBelow: 0,
      ratePercent: 0,
      additionalSecurityAmount: 0,
      slabDescription: 'Bid is at or above advertised cost (No Additional Security required)',
    }
  }

  const diff = advertisedCost - bidPrice
  const percentageBelow = roundToTwo((diff / advertisedCost) * 100)

  let ratePercent = 0
  let slabDescription = ''

  if (percentageBelow <= 10) {
    ratePercent = 0
    slabDescription = 'Up to and including 10% below: Nil'
  } else if (percentageBelow < 20) {
    const pointsBelow10 = percentageBelow - 10
    ratePercent = roundToTwo(pointsBelow10 * 0.1)
    slabDescription = `>10% to <20% below: 0.1% per point below 10% (${pointsBelow10.toFixed(2)} pts × 0.1% = ${ratePercent.toFixed(2)}%)`
  } else {
    const pointsBelow20 = percentageBelow - 20
    ratePercent = roundToTwo(1.0 + pointsBelow20 * 0.2)
    slabDescription = `≥20% below: 1.0% + 0.2% per point below 20% (1.0% + ${pointsBelow20.toFixed(2)} pts × 0.2% = ${ratePercent.toFixed(2)}%)`
  }

  const additionalSecurityAmount = roundToTwo((ratePercent / 100) * bidPrice)

  return {
    percentageBelow,
    ratePercent,
    additionalSecurityAmount,
    slabDescription,
  }
}

