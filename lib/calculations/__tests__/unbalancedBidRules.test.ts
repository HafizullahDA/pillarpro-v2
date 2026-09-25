import { describe, it, expect } from 'vitest'
import { calculateUnbalancedBidSecurity, ASD_RULES } from '../unbalancedBidRules'

describe('Universal Multi-Rule Engine for Unbalanced Bids (ASD / APG / CDR)', () => {
  it('exposes all official rule definitions with metadata', () => {
    expect(ASD_RULES.jk_pwd).toBeDefined()
    expect(ASD_RULES.cpwd).toBeDefined()
    expect(ASD_RULES.morth_nhai).toBeDefined()
    expect(ASD_RULES.maharashtra_pwd).toBeDefined()
    expect(ASD_RULES.odisha_pwd).toBeDefined()
    expect(ASD_RULES.west_bengal_pwd).toBeDefined()
    expect(ASD_RULES.custom).toBeDefined()
  })

  describe('1. J&K PWD Rule (Allotment Order Practice vs Circular Text)', () => {
    it('returns 0 for bids up to and including 10% below advertised cost', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'jk_pwd',
        advertisedCost: 1000000,
        bidPrice: 900000, // 10% below
      })
      expect(res.percentageBelow).toBe(10)
      expect(res.ratePercent).toBe(0)
      expect(res.additionalSecurityAmount).toBe(0)
      expect(res.isTriggered).toBe(false)
    })

    it('calculates exact PWD Allotment Order demand (Rs. 93,340) on Advertised Cost for 17.95L / 13.39L project', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'jk_pwd',
        advertisedCost: 1795000,
        bidPrice: 1339422.22,
        calculationBase: 'advertised_cost',
      })
      expect(res.percentageBelow).toBe(25.38)
      expect(res.ratePercent).toBe(5.2) // 26% ceil discount * 0.2% = 5.2% on Advertised Cost
      expect(res.additionalSecurityAmount).toBe(93340) // EXACT MATCH to PWD Allotment Order No. 11!
      expect(res.departmentDemandAmount).toBe(93340)
      expect(res.circularTheoreticalAmount).toBe(27859.98)
    })

    it('calculates theoretical circular text figure (Rs. 27,859.98) on Quoted Bid Price', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'jk_pwd',
        advertisedCost: 1795000,
        bidPrice: 1339422.22,
        calculationBase: 'bid_price',
      })
      expect(res.percentageBelow).toBe(25.38)
      expect(res.ratePercent).toBe(2.08)
      expect(res.additionalSecurityAmount).toBe(27859.98)
      expect(res.departmentDemandAmount).toBe(93340)
    })
  })

  describe('2. CPWD Official Norms (DG/Manual-2024/20: Feb 2026)', () => {
    it('returns Nil if bid is >= 80% of Estimated Cost Put to Tender (ECPT)', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'cpwd',
        advertisedCost: 1000000,
        bidPrice: 800000, // exactly 80% (20% below)
      })
      expect(res.additionalSecurityAmount).toBe(0)
      expect(res.isTriggered).toBe(false)
    })

    it('calculates APG = 80% of ECPT - Quoted Bid for bids < 80% of ECPT', () => {
      // ECPT = 10,00,000, Bid = 7,00,000 (30% below)
      // 80% of ECPT = 8,00,000 -> APG = 8,00,000 - 7,00,000 = 1,00,000
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'cpwd',
        advertisedCost: 1000000,
        bidPrice: 700000,
      })
      expect(res.percentageBelow).toBe(30)
      expect(res.additionalSecurityAmount).toBe(100000)
      expect(res.isTriggered).toBe(true)
      expect(res.calculationFormulaText).toContain('80% ECPT')
    })
  })

  describe('3. MoRTH / NHAI Norms (Policy Circular 11.94/2026)', () => {
    it('returns Nil if bid is up to 15% below estimate', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'morth_nhai',
        advertisedCost: 10000000,
        bidPrice: 8500000, // 15% below
      })
      expect(res.additionalSecurityAmount).toBe(0)
      expect(res.isTriggered).toBe(false)
    })

    it('calculates 1% per point below 15% for bids between 15% and 30% below', () => {
      // Bid is 20% below -> 5 points below 15% -> 5% on bid price
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'morth_nhai',
        advertisedCost: 10000000,
        bidPrice: 8000000, // 20% below
      })
      expect(res.percentageBelow).toBe(20)
      expect(res.ratePercent).toBe(5)
      expect(res.additionalSecurityAmount).toBe(400000) // 5% of 80,00,000
      expect(res.isTriggered).toBe(true)
    })

    it('escalates to 15% base + 0.5% per point below 30% for severe ALB >= 30%', () => {
      // Bid is 35% below -> 15% + (5 * 0.5%) = 17.5% on bid price 65,00,000
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'morth_nhai',
        advertisedCost: 10000000,
        bidPrice: 6500000, // 35% below
      })
      expect(res.percentageBelow).toBe(35)
      expect(res.ratePercent).toBe(17.5)
      expect(res.additionalSecurityAmount).toBe(1137500)
      expect(res.instrumentWarning).toContain('Insurance Surety Bonds')
    })
  })

  describe('4. Maharashtra PWD (GR 2018/2019)', () => {
    it('returns 1% on Estimated Cost for 1% to 10% below', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'maharashtra_pwd',
        advertisedCost: 1000000,
        bidPrice: 950000, // 5% below
      })
      expect(res.percentageBelow).toBe(5)
      expect(res.additionalSecurityAmount).toBe(10000) // 1% of 10,00,000
      expect(res.isTriggered).toBe(true)
    })

    it('applies steep 6% + 2% per point below 15% for bids > 15% below', () => {
      // 20% below -> 6% + (5 * 2%) = 16% on Estimated Cost (10,00,000) = 1,60,000
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'maharashtra_pwd',
        advertisedCost: 1000000,
        bidPrice: 800000, // 20% below
      })
      expect(res.percentageBelow).toBe(20)
      expect(res.additionalSecurityAmount).toBe(160000)
      expect(res.isTriggered).toBe(true)
    })
  })

  describe('5. Odisha Works Dept (OPWD Code)', () => {
    it('returns differential below 90% of estimate for bids > 10% below', () => {
      // Estimated = 10,00,000, Bid = 8,50,000 (15% below)
      // 90% of 10,00,000 = 9,00,000 -> Diff = 9,00,000 - 8,50,000 = 50,000
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'odisha_pwd',
        advertisedCost: 1000000,
        bidPrice: 850000,
      })
      expect(res.percentageBelow).toBe(15)
      expect(res.additionalSecurityAmount).toBe(50000)
      expect(res.isTriggered).toBe(true)
    })
  })

  describe('6. West Bengal PWD (Memo 4608-F(Y))', () => {
    it('returns flat 10% on tendered amount for bids > 20% below estimate', () => {
      // 25% below estimate -> flat 10% of bid price 750,000 = 75,000
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'west_bengal_pwd',
        advertisedCost: 1000000,
        bidPrice: 750000,
      })
      expect(res.percentageBelow).toBe(25)
      expect(res.ratePercent).toBe(10)
      expect(res.additionalSecurityAmount).toBe(75000)
      expect(res.isTriggered).toBe(true)
    })
  })

  describe('7. Custom / NIT Rule', () => {
    it('calculates custom threshold and rate', () => {
      const res = calculateUnbalancedBidSecurity({
        ruleId: 'custom',
        advertisedCost: 1000000,
        bidPrice: 800000, // 20% below
        customThresholdPercent: 12,
        customRatePercent: 8,
      })
      expect(res.ratePercent).toBe(8)
      expect(res.additionalSecurityAmount).toBe(64000) // 8% of 8,00,000
      expect(res.isTriggered).toBe(true)
    })
  })
})
