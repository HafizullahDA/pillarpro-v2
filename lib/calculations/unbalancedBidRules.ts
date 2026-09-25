import { roundToTwo } from './financial'

export type AsdRuleId =
  | 'jk_pwd'
  | 'cpwd'
  | 'morth_nhai'
  | 'maharashtra_pwd'
  | 'odisha_pwd'
  | 'west_bengal_pwd'
  | 'custom'

export interface AsdRuleMetadata {
  id: AsdRuleId
  name: string
  shortLabel: string
  authority: string
  circularRef: string
  basisDescription: string
  instrumentGuide: string
  instrumentWarning?: string
}

export const ASD_RULES: Record<AsdRuleId, AsdRuleMetadata> = {
  jk_pwd: {
    id: 'jk_pwd',
    name: 'J&K PWD (Circular 08-08-2025)',
    shortLabel: 'J&K PWD',
    authority: 'Finance Department, UT of Jammu & Kashmir',
    circularRef: 'Circular No. FD-Code/441/2021-02-158 dated 08.08.2025',
    basisDescription: 'Calculated on bidder’s quoted bid price: ≤10% Nil | >10%–20%: 0.1%/pt | ≥20%: 1% + 0.2%/pt',
    instrumentGuide: 'Term Deposit Receipt (TDR) / Cash Deposit Receipt (CDR, e.g. J&K Bank) or Bank Guarantee.',
  },
  cpwd: {
    id: 'cpwd',
    name: 'CPWD Norms (DG/Manual-2024/20: Feb 2026)',
    shortLabel: 'CPWD',
    authority: 'Directorate General, Central Public Works Department',
    circularRef: 'OM No. DG/Manual-2024/20 dated 27.02.2026 (Works Manual Para 5.6)',
    basisDescription: 'For bids < 80% of Estimated Cost (ECPT): APG = (80% of ECPT) - Quoted Bid Amount',
    instrumentGuide: 'Bank Guarantee (BG) or Fixed Deposit Receipt (FDR) pledged to the Executive Engineer.',
  },
  morth_nhai: {
    id: 'morth_nhai',
    name: 'MoRTH / NHAI (Circular 11.94/2026 & 2025)',
    shortLabel: 'MoRTH / NHAI',
    authority: 'Ministry of Road Transport & Highways / National Highways Authority of India',
    circularRef: 'NHAI Policy Circular No. 11.94/2026 & MoRTH Circular dated 30.04.2025',
    basisDescription: 'Trigger > 15% below estimate. Tiered surcharge with severe escalation (15% base + 0.5%/pt) for ≥30% below.',
    instrumentGuide: 'Mandatory irrevocable e-Bank Guarantee (e-BG).',
    instrumentWarning: 'Insurance Surety Bonds and paper BGs are strictly prohibited for APS by MoRTH/NHAI directives.',
  },
  maharashtra_pwd: {
    id: 'maharashtra_pwd',
    name: 'Maharashtra PWD (GR 2018/2019)',
    shortLabel: 'Maharashtra PWD',
    authority: 'Public Works Department, Govt of Maharashtra',
    circularRef: 'PWD GR No. CAT-2017/CR-08/Bldg-2 dated 26.11.2018 & 17.09.2019',
    basisDescription: 'Tiered on Estimated Cost: 1–10%: 1% | >10–15%: 1% + 1%/pt | >15%: 6% + 2%/pt (e.g. 16% ASD at 20% below)',
    instrumentGuide: 'Demand Draft (DD) / Fixed Deposit Receipt (FDR) / Bank Guarantee.',
  },
  odisha_pwd: {
    id: 'odisha_pwd',
    name: 'Odisha Works Dept (OPWD Code)',
    shortLabel: 'Odisha Works',
    authority: 'Works Department, Govt of Odisha',
    circularRef: 'OPWD Code Appendix & Departmental Circulars',
    basisDescription: 'For bids > 10% below estimate: Differential cost = (90% of Estimate) - Quoted Bid Price',
    instrumentGuide: 'Term Deposit Receipt (TDR) / NSC / KVP / Post Office Time Deposit / BG.',
  },
  west_bengal_pwd: {
    id: 'west_bengal_pwd',
    name: 'West Bengal PWD (Memo 4608-F(Y))',
    shortLabel: 'West Bengal PWD',
    authority: 'Finance Department, Govt of West Bengal',
    circularRef: 'Memo No. 4608-F(Y) dated 18.07.2018',
    basisDescription: 'For bids > 20% below estimate (less than 80%): Flat 10% Additional Security on tendered amount',
    instrumentGuide: 'Bank Guarantee from scheduled commercial bank.',
  },
  custom: {
    id: 'custom',
    name: 'Custom / NIT Tender Specific Clause',
    shortLabel: 'Custom / NIT',
    authority: 'Specific Tender Issuing Authority / RFP Special Conditions',
    circularRef: 'Notice Inviting Tender (NIT) / Instructions to Bidders (ITB)',
    basisDescription: 'Custom percentage rate or manual formula specified in contract Special Conditions.',
    instrumentGuide: 'As stipulated in the Notice Inviting Tender (NIT).',
  },
}

export interface CalculateAsdOptions {
  ruleId: AsdRuleId
  advertisedCost: number
  bidPrice: number
  calculationBase?: 'advertised_cost' | 'bid_price'
  customThresholdPercent?: number
  customRatePercent?: number
}

export interface AsdCalculationResult {
  ruleId: AsdRuleId
  ruleName: string
  authority: string
  circularRef: string
  percentageBelow: number
  isTriggered: boolean
  ratePercent: number
  additionalSecurityAmount: number
  slabDescription: string
  instrumentGuide: string
  instrumentWarning?: string
  calculationFormulaText: string
  departmentDemandAmount?: number
  circularTheoreticalAmount?: number
  calculationBaseUsed?: 'advertised_cost' | 'bid_price'
}

/**
 * Universal Multi-Rule Engine for Additional Performance Security (APS / ASD / CDR)
 * Supports J&K UT, CPWD, MoRTH/NHAI, Maharashtra PWD, Odisha Works, West Bengal, and Custom rules.
 */
export function calculateUnbalancedBidSecurity({
  ruleId,
  advertisedCost,
  bidPrice,
  calculationBase = 'advertised_cost',
  customThresholdPercent = 10,
  customRatePercent = 0,
}: CalculateAsdOptions): AsdCalculationResult {
  const meta = ASD_RULES[ruleId] || ASD_RULES.jk_pwd

  if (!advertisedCost || advertisedCost <= 0 || !bidPrice || bidPrice <= 0 || bidPrice >= advertisedCost) {
    return {
      ruleId,
      ruleName: meta.name,
      authority: meta.authority,
      circularRef: meta.circularRef,
      percentageBelow: 0,
      isTriggered: false,
      ratePercent: 0,
      additionalSecurityAmount: 0,
      slabDescription: 'Bid is at or above advertised cost (No Additional Security required)',
      instrumentGuide: meta.instrumentGuide,
      instrumentWarning: meta.instrumentWarning,
      calculationFormulaText: 'Quoted Bid ≥ Estimated Cost → ASD = ₹0',
      calculationBaseUsed: calculationBase,
    }
  }

  const diff = advertisedCost - bidPrice
  const percentageBelow = roundToTwo((diff / advertisedCost) * 100)

  let ratePercent = 0
  let additionalSecurityAmount = 0
  let isTriggered = false
  let slabDescription = ''
  let calculationFormulaText = ''
  let departmentDemandAmount: number | undefined
  let circularTheoreticalAmount: number | undefined

  switch (ruleId) {
    case 'jk_pwd': {
      // 1. Department Division Practice (Applied on Advertised Cost, as demanded in PWD Allotment Orders)
      // Rates: 26% discount -> 26 * 0.2% = 5.2% on Advertised Cost -> exactly ₹93,340 for ₹17.95L
      const pCeil = Math.ceil(percentageBelow)
      const deptRate = roundToTwo(pCeil * 0.2)
      departmentDemandAmount = percentageBelow <= 10 ? 0 : roundToTwo((deptRate / 100) * advertisedCost)

      // 2. Finance Dept Circular 08-08-2025 Literal Text (Applied on Quoted Bid Price)
      let circRate = 0
      if (percentageBelow <= 10) {
        circRate = 0
      } else if (percentageBelow < 20) {
        circRate = roundToTwo((percentageBelow - 10) * 0.1)
      } else {
        circRate = roundToTwo(1.0 + (percentageBelow - 20) * 0.2)
      }
      circularTheoreticalAmount = roundToTwo((circRate / 100) * bidPrice)

      if (calculationBase === 'advertised_cost') {
        // Department PWD Divisional Allotment Practice
        if (percentageBelow <= 10) {
          ratePercent = 0
          additionalSecurityAmount = 0
          slabDescription = 'Up to and including 10% below: Nil (No ASD required)'
          calculationFormulaText = `${percentageBelow}% below advertised cost ≤ 10% threshold → Nil (₹0)`
        } else {
          ratePercent = deptRate
          additionalSecurityAmount = departmentDemandAmount
          isTriggered = additionalSecurityAmount > 0
          slabDescription = `PWD Allotment Practice: ${pCeil}% discount × 0.2% = ${deptRate}% on Advertised Cost (₹${advertisedCost.toLocaleString('en-IN')})`
          calculationFormulaText = `${deptRate}% on Advertised Cost (₹${advertisedCost.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')} (Matches PWD Allotment Order)`
        }
      } else {
        // Finance Circular Literal Text on Bid Price
        ratePercent = circRate
        additionalSecurityAmount = circularTheoreticalAmount
        isTriggered = additionalSecurityAmount > 0
        if (percentageBelow <= 10) {
          slabDescription = 'Up to and including 10% below: Nil (No ASD required)'
          calculationFormulaText = `${percentageBelow}% below advertised cost ≤ 10% threshold → Nil (₹0)`
        } else if (percentageBelow < 20) {
          const pts = roundToTwo(percentageBelow - 10)
          slabDescription = `Finance Circular: >10% to <20% below: 0.1% per point below 10% (${pts}% × 0.1 = ${circRate}%) on Bid Price`
          calculationFormulaText = `${circRate}% applied to Bid Price (₹${bidPrice.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
        } else {
          const pts = roundToTwo(percentageBelow - 20)
          slabDescription = `Finance Circular: ≥20% below: 1.0% + 0.2% per point below 20% (${circRate}%) on Bid Price`
          calculationFormulaText = `${circRate}% applied to Bid Price (₹${bidPrice.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
        }
      }
      break
    }

    case 'cpwd': {
      // CPWD OM No. DG/Manual-2024/20 dated 27.02.2026
      // Trigger: Quoted amount < 80% of Estimated Cost Put to Tender (ECPT)
      // APG = 80% of ECPT - Quoted Amount
      const threshold80 = roundToTwo(0.8 * advertisedCost)
      if (bidPrice >= threshold80) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = `Quoted bid (₹${bidPrice.toLocaleString('en-IN')}) is ≥ 80% of ECPT (₹${threshold80.toLocaleString('en-IN')}): No APG required.`
        calculationFormulaText = `Bid Price ≥ 80% of ECPT (₹${threshold80.toLocaleString('en-IN')}) → APG = ₹0`
      } else {
        additionalSecurityAmount = roundToTwo(threshold80 - bidPrice)
        ratePercent = roundToTwo((additionalSecurityAmount / bidPrice) * 100)
        isTriggered = true
        slabDescription = `Abnormally Low Bid (< 80% of ECPT): APG = 80% of ECPT (₹${threshold80.toLocaleString('en-IN')}) - Quoted Bid (₹${bidPrice.toLocaleString('en-IN')})`
        calculationFormulaText = `₹${threshold80.toLocaleString('en-IN')} (80% ECPT) - ₹${bidPrice.toLocaleString('en-IN')} (Bid Price) = ₹${additionalSecurityAmount.toLocaleString('en-IN')} (Effective ${ratePercent}% on Bid)`
      }
      break
    }

    case 'morth_nhai': {
      // NHAI Policy Circular No. 11.94/2026 & MoRTH Circular dated 30.04.2025
      // Trigger: > 15% below estimate
      // If 15% - 30% below: 1% on bid price per point below 15%
      // If >= 30% below: 15% base + 0.5% per point below 30% on bid price
      if (percentageBelow <= 15) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = 'Up to 15% below estimate: Nil (Within standard permissible band).'
        calculationFormulaText = `${percentageBelow}% below estimate ≤ 15% threshold → Nil (₹0)`
      } else if (percentageBelow < 30) {
        const pointsBelow15 = roundToTwo(percentageBelow - 15)
        ratePercent = roundToTwo(pointsBelow15) // 1% for each % below 15%
        additionalSecurityAmount = roundToTwo((ratePercent / 100) * bidPrice)
        isTriggered = true
        slabDescription = `>15% to <30% below: 1% on bid price for every percentage point below 15% (${pointsBelow15}% pts = ${ratePercent}%)`
        calculationFormulaText = `${ratePercent}% applied to Bid Price = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
      } else {
        const pointsBelow30 = roundToTwo(percentageBelow - 30)
        ratePercent = roundToTwo(15.0 + pointsBelow30 * 0.5)
        additionalSecurityAmount = roundToTwo((ratePercent / 100) * bidPrice)
        isTriggered = true
        slabDescription = `≥30% below (Severe ALB): 15% base + 0.5% per point below 30% (15% + ${pointsBelow30}% × 0.5 = ${ratePercent}%)`
        calculationFormulaText = `${ratePercent}% applied to Bid Price = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
      }
      break
    }

    case 'maharashtra_pwd': {
      // PWD GR No. CAT-2017/CR-08/Bldg-2 dated 26.11.2018 & 17.09.2019
      // Tiered on Estimated Cost
      if (percentageBelow <= 1) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = 'Up to 1% below estimate: Nil (0%).'
        calculationFormulaText = `${percentageBelow}% below estimate ≤ 1% → Nil (₹0)`
      } else if (percentageBelow <= 10) {
        // Flat 1% of Estimated Cost
        additionalSecurityAmount = roundToTwo(0.01 * advertisedCost)
        ratePercent = roundToTwo((additionalSecurityAmount / bidPrice) * 100)
        isTriggered = true
        slabDescription = '1% to 10% below estimate: Flat 1% of Estimated Cost.'
        calculationFormulaText = `1% of Estimated Cost (₹${advertisedCost.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')} (Effective ${ratePercent}% on Bid)`
      } else if (percentageBelow <= 15) {
        // 1% + 1% for each % below 10% (on Estimated Cost)
        const pointsBelow10 = roundToTwo(percentageBelow - 10)
        const rateOnEst = roundToTwo(1.0 + pointsBelow10)
        additionalSecurityAmount = roundToTwo((rateOnEst / 100) * advertisedCost)
        ratePercent = roundToTwo((additionalSecurityAmount / bidPrice) * 100)
        isTriggered = true
        slabDescription = `>10% to 15% below: 1% + 1% for every point below 10% on Estimated Cost (${rateOnEst}% on Estimate)`
        calculationFormulaText = `${rateOnEst}% of Estimated Cost (₹${advertisedCost.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')} (Effective ${ratePercent}% on Bid)`
      } else {
        // >15% below: 6% + 2% for each % below 15% (on Estimated Cost)
        const pointsBelow15 = roundToTwo(percentageBelow - 15)
        const rateOnEst = roundToTwo(6.0 + pointsBelow15 * 2.0)
        additionalSecurityAmount = roundToTwo((rateOnEst / 100) * advertisedCost)
        ratePercent = roundToTwo((additionalSecurityAmount / bidPrice) * 100)
        isTriggered = true
        slabDescription = `>15% below: 6% + 2% for every point below 15% on Estimated Cost (${rateOnEst}% on Estimate)`
        calculationFormulaText = `${rateOnEst}% of Estimated Cost (₹${advertisedCost.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')} (Effective ${ratePercent}% on Bid)`
      }
      break
    }

    case 'odisha_pwd': {
      // OPWD Code: Bids > 10% below estimate -> Differential cost = (90% of Estimate) - Bid Price
      const threshold90 = roundToTwo(0.9 * advertisedCost)
      if (bidPrice >= threshold90) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = `Quoted bid is within 10% below estimate: No ASD required.`
        calculationFormulaText = `Bid Price ≥ 90% of Estimate (₹${threshold90.toLocaleString('en-IN')}) → ASD = ₹0`
      } else {
        additionalSecurityAmount = roundToTwo(threshold90 - bidPrice)
        ratePercent = roundToTwo((additionalSecurityAmount / bidPrice) * 100)
        isTriggered = true
        slabDescription = `>10% below estimate: Differential amount = 90% of Estimate (₹${threshold90.toLocaleString('en-IN')}) - Quoted Bid (₹${bidPrice.toLocaleString('en-IN')})`
        calculationFormulaText = `₹${threshold90.toLocaleString('en-IN')} (90% Estimate) - ₹${bidPrice.toLocaleString('en-IN')} (Bid Price) = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
      }
      break
    }

    case 'west_bengal_pwd': {
      // West Bengal Memo No. 4608-F(Y): If bid is > 20% below estimate (< 80%), flat 10% of tendered amount
      if (percentageBelow <= 20) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = 'Up to 20% below estimate: Nil (No Additional Security required).'
        calculationFormulaText = `${percentageBelow}% below estimate ≤ 20% threshold → Nil (₹0)`
      } else {
        ratePercent = 10
        additionalSecurityAmount = roundToTwo(0.1 * bidPrice)
        isTriggered = true
        slabDescription = 'More than 20% below estimate: Flat 10% Additional Performance Security on Tendered Amount.'
        calculationFormulaText = `10% of Quoted Bid (₹${bidPrice.toLocaleString('en-IN')}) = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
      }
      break
    }

    case 'custom':
    default: {
      const threshold = customThresholdPercent || 0
      if (percentageBelow <= threshold) {
        ratePercent = 0
        additionalSecurityAmount = 0
        slabDescription = `Bid discount (${percentageBelow}%) is within custom threshold (${threshold}%): Nil.`
        calculationFormulaText = `${percentageBelow}% below ≤ ${threshold}% custom threshold → ₹0`
      } else {
        ratePercent = customRatePercent || roundToTwo(percentageBelow - threshold)
        additionalSecurityAmount = roundToTwo((ratePercent / 100) * bidPrice)
        isTriggered = additionalSecurityAmount > 0
        slabDescription = `Custom Clause: ${ratePercent}% applied on Quoted Bid Price.`
        calculationFormulaText = `${ratePercent}% applied to Bid Price = ₹${additionalSecurityAmount.toLocaleString('en-IN')}`
      }
      break
    }
  }

  return {
    ruleId,
    ruleName: meta.name,
    authority: meta.authority,
    circularRef: meta.circularRef,
    percentageBelow,
    isTriggered,
    ratePercent,
    additionalSecurityAmount,
    slabDescription,
    instrumentGuide: meta.instrumentGuide,
    instrumentWarning: meta.instrumentWarning,
    calculationFormulaText,
    departmentDemandAmount,
    circularTheoreticalAmount,
    calculationBaseUsed: calculationBase,
  }
}
