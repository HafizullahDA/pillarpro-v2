import { describe, it, expect } from 'vitest'
import {
  calculatePartnerEquityShare,
  calculatePartnerNetBalance,
} from '../partner'

describe('Partner Equity & Drawings Calculations', () => {
  it('accurately distributes profit based on partnership percentage', () => {
    const netContractProfit = 1500000 // ₹15,00,000 net profit on highway project

    const partnerAShare = calculatePartnerEquityShare(netContractProfit, 60) // Partner A: 60%
    const partnerBShare = calculatePartnerEquityShare(netContractProfit, 40) // Partner B: 40%

    expect(partnerAShare).toBe(900000)
    expect(partnerBShare).toBe(600000)
    expect(partnerAShare + partnerBShare).toBe(netContractProfit)
  })

  it('computes partner net balance considering capital, profit, and drawings', () => {
    // Partner introduced ₹10,00,000 capital, earned ₹4,00,000 profit, took ₹3,00,000 drawings
    const balance = calculatePartnerNetBalance({
      capitalContributed: 1000000,
      profitShare: 400000,
      drawings: 300000,
    })

    expect(balance).toBe(1100000)
  })

  it('handles negative standing if partner overdraws capital', () => {
    const balance = calculatePartnerNetBalance({
      capitalContributed: 200000,
      profitShare: 50000,
      drawings: 400000,
    })

    expect(balance).toBe(-150000) // Partner owes firm ₹1.5 Lakhs
  })
})

