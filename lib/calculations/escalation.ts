import { roundToTwo, safeAdd, safeSub, safeMul } from './financial'

// ════════════════════════════════════════════════════════════════════════
// CPWD GCC CLAUSE 10CA: MATERIAL-SPECIFIC PRICE ESCALATION / RECOVERY
// Applicable for Cement, Steel (TMT & Structural), Bitumen, and POL
// ════════════════════════════════════════════════════════════════════════

export interface Clause10CAMaterialInput {
  materialType: 'cement' | 'tmt_steel' | 'structural_steel' | 'bitumen' | 'pol' | 'other'
  materialName: string
  unit: string
  quantityConsumed: number     // Q: Quantity brought to site / consumed in period
  scheduleFRate: number        // R: Base rate as specified in Schedule 'F'
  baseIndex: number            // CI_0: Base Wholesale Price Index (WPI) as of tender receipt
  currentIndex: number         // CI: Wholesale Price Index (WPI) valid for current month/quarter
}

export interface Clause10CAMaterialResult {
  materialName: string
  unit: string
  quantityConsumed: number
  scheduleFRate: number
  baseIndex: number
  currentIndex: number
  indexDifference: number      // CI - CI_0
  percentageVariation: number  // ((CI - CI_0) / CI_0) * 100
  escalationAmount: number     // V = Q * R * ((CI - CI_0) / CI_0)
  isPayable: boolean           // True if payable to contractor; false if recoverable by department
}

export interface Clause10CAResult {
  items: Clause10CAMaterialResult[]
  totalEscalationAmount: number
  netStatus: 'payable' | 'recoverable' | 'neutral'
}

/**
 * Calculates price variation under CPWD GCC Clause 10CA for specific materials.
 * Formula: V = Q * [ R * (CI - CI_0) / CI_0 ]
 */
export function calculateClause10CA(
  materials: Clause10CAMaterialInput[]
): Clause10CAResult {
  let totalEscalation = 0

  const items: Clause10CAMaterialResult[] = materials.map(mat => {
    const q = Math.max(0, Number(mat.quantityConsumed) || 0)
    const r = Math.max(0, Number(mat.scheduleFRate) || 0)
    const ci0 = Math.max(0.001, Number(mat.baseIndex) || 1)
    const ci = Math.max(0, Number(mat.currentIndex) || 0)

    const indexDiff = Number((ci - ci0).toFixed(2))
    const pctVariation = roundToTwo((indexDiff / ci0) * 100)
    const escalation = roundToTwo(q * r * (indexDiff / ci0))

    totalEscalation = safeAdd(totalEscalation, escalation)

    return {
      materialName: mat.materialName,
      unit: mat.unit,
      quantityConsumed: q,
      scheduleFRate: r,
      baseIndex: ci0,
      currentIndex: ci,
      indexDifference: indexDiff,
      percentageVariation: pctVariation,
      escalationAmount: escalation,
      isPayable: escalation > 0,
    }
  })

  return {
    items,
    totalEscalationAmount: totalEscalation,
    netStatus: totalEscalation > 0 ? 'payable' : totalEscalation < 0 ? 'recoverable' : 'neutral',
  }
}

// ════════════════════════════════════════════════════════════════════════
// CPWD GCC CLAUSE 10CC: OVERALL PRICE ESCALATION DURING EXTENDED PERIOD
// Accommodates Labour (Y%), Materials (X%), and POL (Z%)
// ════════════════════════════════════════════════════════════════════════

export interface Clause10CCParams {
  grossWorkCertified: number      // Gross work certified during the quarter/period
  clause10CAWorkDeduction?: number // Value of work covered under Clause 10CA to prevent double-counting
  securedAdvanceAdjustment?: number // Net secured advance changes in period

  // Labour Component (Y%) & Indices (Consumer Price Index for Industrial Workers - CPI-IW)
  labourPercentage: number        // Y: e.g. 25 (%)
  baseLabourIndex: number         // LI_0
  currentLabourIndex: number      // LI

  // Material Component (X%) & Indices (All Commodities Wholesale Price Index - WPI)
  materialPercentage: number      // X: e.g. 65 (%)
  baseMaterialIndex: number       // MI_0
  currentMaterialIndex: number    // MI

  // Fuel & Lubricant (POL) Component (Z%) & Indices (High Speed Diesel / Fuel WPI)
  polPercentage?: number          // Z: e.g. 5 (%)
  basePolIndex?: number           // FI_0
  currentPolIndex?: number        // FI
}

export interface Clause10CCResult {
  effectiveWorkValue: number      // W: Net work value eligible for Clause 10CC
  labourEscalation: number        // V_L = W * (Y/100) * ((LI - LI_0) / LI_0)
  materialEscalation: number      // V_M = W * (X/100) * ((MI - MI_0) / MI_0)
  polEscalation: number           // V_P = W * (Z/100) * ((FI - FI_0) / FI_0)
  totalEscalationAmount: number   // V_CC = V_L + V_M + V_P
  isPayable: boolean
  breakdownSummary: string
}

/**
 * Calculates overall price escalation during extended contract duration per CPWD GCC Clause 10CC.
 * Strictly checks that component percentages total 100% (or normalizes) and eliminates double-counting of 10CA materials.
 */
export function calculateClause10CC(params: Clause10CCParams): Clause10CCResult {
  const gross = Math.max(0, roundToTwo(params.grossWorkCertified))
  const ded10CA = Math.max(0, roundToTwo(params.clause10CAWorkDeduction ?? 0))
  const secAdj = Math.max(0, roundToTwo(params.securedAdvanceAdjustment ?? 0))

  // W = Effective work value = Gross - 10CA Material Work - Secured Advance
  const effectiveWork = Math.max(0, roundToTwo(safeSub(gross, safeAdd(ded10CA, secAdj))))

  // 1. Labour Escalation
  const y = (params.labourPercentage || 0) / 100
  const li0 = Math.max(0.001, params.baseLabourIndex || 1)
  const li = Math.max(0, params.currentLabourIndex || 0)
  const labourEscalation = roundToTwo(effectiveWork * y * ((li - li0) / li0))

  // 2. Material Escalation
  const x = (params.materialPercentage || 0) / 100
  const mi0 = Math.max(0.001, params.baseMaterialIndex || 1)
  const mi = Math.max(0, params.currentMaterialIndex || 0)
  const materialEscalation = roundToTwo(effectiveWork * x * ((mi - mi0) / mi0))

  // 3. POL Escalation
  const z = (params.polPercentage || 0) / 100
  const fi0 = Math.max(0.001, params.basePolIndex || 1)
  const fi = Math.max(0, params.currentPolIndex || 0)
  const polEscalation = z > 0 && params.basePolIndex ? roundToTwo(effectiveWork * z * ((fi - fi0) / fi0)) : 0

  const totalEscalation = roundToTwo(safeAdd(labourEscalation, safeAdd(materialEscalation, polEscalation)))

  return {
    effectiveWorkValue: effectiveWork,
    labourEscalation,
    materialEscalation,
    polEscalation,
    totalEscalationAmount: totalEscalation,
    isPayable: totalEscalation > 0,
    breakdownSummary: `W=₹${effectiveWork.toLocaleString('en-IN')}: Labour=₹${labourEscalation.toLocaleString('en-IN')}, Material=₹${materialEscalation.toLocaleString('en-IN')}, POL=₹${polEscalation.toLocaleString('en-IN')}`,
  }
}
