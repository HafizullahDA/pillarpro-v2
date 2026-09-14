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

