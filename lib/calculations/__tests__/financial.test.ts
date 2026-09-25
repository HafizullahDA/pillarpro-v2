import { describe, it, expect } from 'vitest'
import { roundToTwo, safeAdd, safeSub, safeMul, calculateAdditionalPerformanceSecurity } from '../financial'

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

describe('calculateAdditionalPerformanceSecurity (J&K Circular 08-08-2025)', () => {
  it('returns 0 for bids equal to or higher than advertised cost', () => {
    const res = calculateAdditionalPerformanceSecurity(1000000, 1000000)
    expect(res.additionalSecurityAmount).toBe(0)
    expect(res.ratePercent).toBe(0)
    expect(res.percentageBelow).toBe(0)
  })

  it('returns Nil (0) for bids up to and including 10% below advertised cost', () => {
    // 5% below
    const res5 = calculateAdditionalPerformanceSecurity(1000000, 950000)
    expect(res5.percentageBelow).toBe(5)
    expect(res5.ratePercent).toBe(0)
    expect(res5.additionalSecurityAmount).toBe(0)

    // exactly 10% below
    const res10 = calculateAdditionalPerformanceSecurity(1000000, 900000)
    expect(res10.percentageBelow).toBe(10)
    expect(res10.ratePercent).toBe(0)
    expect(res10.additionalSecurityAmount).toBe(0)
  })

  it('calculates 0.1% per percentage point below 10% for bids between 10% and 20% below', () => {
    // 15% below -> 5 points below 10% -> 5 * 0.1% = 0.5%
    // applied to bid price 850,000 -> 0.005 * 850,000 = 4,250
    const res15 = calculateAdditionalPerformanceSecurity(1000000, 850000)
    expect(res15.percentageBelow).toBe(15)
    expect(res15.ratePercent).toBe(0.5)
    expect(res15.additionalSecurityAmount).toBe(4250)
  })

  it('calculates 1% + 0.2% per percentage point below 20% for bids >= 20% below', () => {
    // 20% below -> exactly 1% on bid price 800,000 -> 8,000
    const res20 = calculateAdditionalPerformanceSecurity(1000000, 800000)
    expect(res20.percentageBelow).toBe(20)
    expect(res20.ratePercent).toBe(1.0)
    expect(res20.additionalSecurityAmount).toBe(8000)

    // 25% below -> 1.0% + (5 * 0.2%) = 2.0% on bid price 750,000 -> 15,000
    const res25 = calculateAdditionalPerformanceSecurity(1000000, 750000)
    expect(res25.percentageBelow).toBe(25)
    expect(res25.ratePercent).toBe(2.0)
    expect(res25.additionalSecurityAmount).toBe(15000)
  })

  it('calculates properly for real-world project values (e.g. 17.95L Advertised Cost, 13.39L Bid Price)', () => {
    const advertised = 1795000
    const bid = 1339422.22
    const res = calculateAdditionalPerformanceSecurity(advertised, bid, 'bid_price')
    expect(res.percentageBelow).toBe(25.38)
    expect(res.ratePercent).toBe(2.08) // 1.0 + (5.38 * 0.2) = 2.076 -> 2.08%
    expect(res.additionalSecurityAmount).toBe(27859.98) // (2.08 / 100) * 1339422.22

    // Department PWD Division Allotment Practice (on Advertised Cost)
    const resDept = calculateAdditionalPerformanceSecurity(advertised, bid, 'advertised_cost')
    expect(resDept.percentageBelow).toBe(25.38)
    expect(resDept.ratePercent).toBe(5.2) // 26% ceil * 0.2% = 5.2% on Advertised Cost
    expect(resDept.additionalSecurityAmount).toBe(93340) // Exact match to PWD Allotment Order No. 11!
  })
})


