import { describe, it, expect } from 'vitest'
import { roundToTwo, safeAdd, safeSub, safeMul } from '../financial'

describe('financial math utilities', () => {
  it('correctly rounds to two decimal places', () => {
    expect(roundToTwo(100.456)).toBe(100.46)
    expect(roundToTwo(100.454)).toBe(100.45)
    expect(roundToTwo(0)).toBe(0)
  })

  it('prevents JavaScript floating-point representation bugs', () => {
    // 0.1 + 0.2 in standard JS produces 0.30000000000000004
    expect(safeAdd(0.1, 0.2)).toBe(0.3)
    // 1.0 - 0.9 in standard JS produces 0.09999999999999998
    expect(safeSub(1.0, 0.9)).toBe(0.1)
  })

  it('handles multi-argument safe addition safely', () => {
    expect(safeAdd(12500.5, 4320.25, 120.75, 99.1)).toBe(17040.6)
  })

  it('handles safe multiplication with fractional percentages', () => {
    // 2% on 45,500
    expect(safeMul(45500, 0.02)).toBe(910)
    // 1% cess on 1,234,567.89
    expect(safeMul(1234567.89, 0.01)).toBe(12345.68)
  })
})

