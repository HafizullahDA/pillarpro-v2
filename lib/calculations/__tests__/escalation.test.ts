import { describe, it, expect } from 'vitest'
import {
  calculateClause10CA,
  calculateClause10CC,
  Clause10CAMaterialInput,
  Clause10CCParams,
} from '../escalation'

describe('CPWD GCC Clause 10CA & 10CC Price Escalation Engine', () => {
  describe('Clause 10CA: Material Price Variation', () => {
    it('calculates price variation on Cement and TMT Steel with price increase', () => {
      // Cement: 50 MT consumed, Schedule F base rate: ₹6,500/MT, Base index: 120.0, Current index: 132.0 (+10%)
      // Steel: 30 MT consumed, Schedule F base rate: ₹65,000/MT, Base index: 140.0, Current index: 154.0 (+10%)
      const materials: Clause10CAMaterialInput[] = [
        {
          materialType: 'cement',
          materialName: 'OPC 43 Grade Cement',
          unit: 'MT',
          quantityConsumed: 50,
          scheduleFRate: 6500,
          baseIndex: 120,
          currentIndex: 132,
        },
        {
          materialType: 'tmt_steel',
          materialName: 'Fe 500D TMT Reinforcement',
          unit: 'MT',
          quantityConsumed: 30,
          scheduleFRate: 65000,
          baseIndex: 140,
          currentIndex: 154,
        },
      ]

      const result = calculateClause10CA(materials)

      expect(result.items.length).toBe(2)

      // Cement: 50 * 6500 * (12 / 120) = 50 * 6500 * 0.10 = 32,500
      expect(result.items[0].escalationAmount).toBe(32500)
      expect(result.items[0].percentageVariation).toBe(10)
      expect(result.items[0].isPayable).toBe(true)

      // Steel: 30 * 65000 * (14 / 140) = 30 * 65000 * 0.10 = 1,95,000
      expect(result.items[1].escalationAmount).toBe(195000)
      expect(result.items[1].percentageVariation).toBe(10)
      expect(result.items[1].isPayable).toBe(true)

      // Total = 32,500 + 1,95,000 = 2,27,500
      expect(result.totalEscalationAmount).toBe(227500)
      expect(result.netStatus).toBe('payable')
    })

    it('calculates departmental recovery when material wholesale index drops below base tender index', () => {
      // Bitumen price dropped: Base index 150.0, current index 135.0 (-10%)
      const materials: Clause10CAMaterialInput[] = [
        {
          materialType: 'bitumen',
          materialName: 'VG-30 Paving Bitumen',
          unit: 'MT',
          quantityConsumed: 20,
          scheduleFRate: 40000,
          baseIndex: 150,
          currentIndex: 135,
        },
      ]

      const result = calculateClause10CA(materials)

      // 20 * 40000 * (-15 / 150) = 8,00,000 * -0.10 = -80,000 (Recoverable from contractor)
      expect(result.items[0].escalationAmount).toBe(-80000)
      expect(result.items[0].percentageVariation).toBe(-10)
      expect(result.items[0].isPayable).toBe(false)
      expect(result.totalEscalationAmount).toBe(-80000)
      expect(result.netStatus).toBe('recoverable')
    })
  })

  describe('Clause 10CC: Overall Price Escalation During Extended Period', () => {
    it('computes composite Labour, Material, and POL escalation on effective work done', () => {
      // Gross Work: ₹50,00,000 in Quarter.
      // Clause 10CA deduction: ₹10,00,000. Effective Work W = ₹40,00,000.
      // Labour: 25% component, Base CPI: 300, Current CPI: 330 (+10%)
      // Material: 70% component, Base WPI: 120, Current WPI: 126 (+5%)
      // POL: 5% component, Base Fuel Index: 100, Current Fuel Index: 110 (+10%)
      const params: Clause10CCParams = {
        grossWorkCertified: 5000000,
        clause10CAWorkDeduction: 1000000,
        labourPercentage: 25,
        baseLabourIndex: 300,
        currentLabourIndex: 330,
        materialPercentage: 70,
        baseMaterialIndex: 120,
        currentMaterialIndex: 126,
        polPercentage: 5,
        basePolIndex: 100,
        currentPolIndex: 110,
      }

      const result = calculateClause10CC(params)

      expect(result.effectiveWorkValue).toBe(4000000)

      // Labour: 40,00,000 * 0.25 * (30 / 300) = 10,00,000 * 0.10 = 1,00,000
      expect(result.labourEscalation).toBe(100000)

      // Material: 40,00,000 * 0.70 * (6 / 120) = 28,00,000 * 0.05 = 1,40,000
      expect(result.materialEscalation).toBe(140000)

      // POL: 40,00,000 * 0.05 * (10 / 100) = 2,00,000 * 0.10 = 20,000
      expect(result.polEscalation).toBe(20000)

      // Total = 1,00,000 + 1,40,000 + 20,000 = 2,60,000
      expect(result.totalEscalationAmount).toBe(260000)
      expect(result.isPayable).toBe(true)
    })
  })
})
