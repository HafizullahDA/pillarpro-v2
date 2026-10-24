import { CalculationMode, MeasurementAbstractItem, MeasurementEntry, MeasurementSubRow } from '../types/measurement'
import { BOQItem } from '../types/boq'

export interface MeasurementQuantityParams {
  calculationMode: CalculationMode
  numberOfUnits?: number | null
  barsPerMember?: number | null
  length?: number | null
  breadth?: number | null
  depthHeight?: number | null
  manualQuantity?: number | null
  rebarDiameterMm?: number | null
  unitWeightKgPerM?: number | null
  boqUnit?: string | null
}

export function calculateMeasurementQuantity(params: MeasurementQuantityParams): number {
  const nos = Number(params.numberOfUnits) > 0 ? Number(params.numberOfUnits) : 1
  const bars = Number(params.barsPerMember) > 0 ? Number(params.barsPerMember) : 1
  const l = Number(params.length) || 0
  const b = Number(params.breadth) || 0
  const d = Number(params.depthHeight) || 0

  let result = 0

  switch (params.calculationMode) {
    case 'l_b_d':
    case 'num_l_b_h':
      result = nos * l * b * d
      break

    case 'l_b':
      result = nos * l * b
      break

    case 'l_h':
      result = nos * l * d
      break

    case 'running_length':
      result = nos * l
      break

    case 'steel_bbs': {
      const unitWeight = Number(params.unitWeightKgPerM) > 0
        ? Number(params.unitWeightKgPerM)
        : (params.rebarDiameterMm && params.rebarDiameterMm > 0
            ? Math.pow(params.rebarDiameterMm, 2) / 162.28
            : 1)
      const totalWeightKg = nos * bars * l * unitWeight

      // Convert based on BOQ Item unit (Metric Tonne / Quintal / Kg)
      const u = (params.boqUnit || '').trim().toLowerCase()
      if (u === 'mt' || u === 'tonne' || u === 'ton' || u === 'metric tonne' || u === 'metric ton') {
        result = totalWeightKg / 1000
      } else if (u === 'qtl' || u === 'quintal' || u === 'qtls') {
        result = totalWeightKg / 100
      } else {
        result = totalWeightKg
      }
      break
    }

    case 'weight':
      if (params.rebarDiameterMm && params.rebarDiameterMm > 0) {
        const unitWeightPerMeter = Math.pow(params.rebarDiameterMm, 2) / 162.28
        result = nos * l * unitWeightPerMeter
      } else {
        result = nos * l * (b > 0 ? b : 1)
      }
      break

    case 'count':
      result = nos
      break

    case 'manual':
      result = Number(params.manualQuantity) || 0
      break

    default:
      result = nos * l * b * (d > 0 ? d : 1)
  }

  return Number(result.toFixed(3))
}

export function calculateRowQuantity(
  row: MeasurementSubRow,
  calculationMode: CalculationMode,
  boqUnit?: string | null,
): number {
  return calculateMeasurementQuantity({
    calculationMode,
    numberOfUnits: row.nos,
    barsPerMember: row.barsPerMember,
    length: row.length,
    breadth: row.breadth,
    depthHeight: row.depthHeight,
    manualQuantity: row.manualQuantity,
    rebarDiameterMm: row.barDiameterMm,
    unitWeightKgPerM: row.unitWeightKgPerM,
    boqUnit,
  })
}

export function calculateNetMeasurementQuantity(
  rows: MeasurementSubRow[],
  calculationMode: CalculationMode,
  boqUnit?: string | null,
): {
  totalAdd: number
  totalDeduct: number
  netQuantity: number
} {
  let totalAdd = 0
  let totalDeduct = 0

  for (const r of rows) {
    const qty = calculateRowQuantity(r, calculationMode, boqUnit)
    if (r.mode === 'deduct') {
      totalDeduct += qty
    } else {
      totalAdd += qty
    }
  }

  const roundedAdd = Number(totalAdd.toFixed(3))
  const roundedDeduct = Number(totalDeduct.toFixed(3))
  const netQuantity = Number(Math.max(0, roundedAdd - roundedDeduct).toFixed(3))

  return {
    totalAdd: roundedAdd,
    totalDeduct: roundedDeduct,
    netQuantity,
  }
}

export function validateQuantityAgainstBOQ(params: {
  contractQuantity: number
  previousQuantity: number
  currentQuantity: number
}): {
  cumulativeQuantity: number
  balanceQuantity: number
  isExceeded: boolean
  exceededBy: number
  requiresDeviationAction: boolean
} {
  const contractQty = Number(params.contractQuantity) || 0
  const prevQty = Number(params.previousQuantity) || 0
  const currQty = Number(params.currentQuantity) || 0

  const cumulativeQuantity = Number((prevQty + currQty).toFixed(3))
  const balanceQuantity = Number((contractQty - cumulativeQuantity).toFixed(3))
  const isExceeded = balanceQuantity < 0
  const exceededBy = isExceeded ? Number(Math.abs(balanceQuantity).toFixed(3)) : 0

  return {
    cumulativeQuantity,
    balanceQuantity,
    isExceeded,
    exceededBy,
    requiresDeviationAction: isExceeded,
  }
}

export function buildAbstractOfMeasurements(
  boqItems: BOQItem[],
  entries: MeasurementEntry[],
): MeasurementAbstractItem[] {
  const abstractMap = new Map<string, MeasurementAbstractItem>()

  for (const boq of boqItems) {
    const contractQty = Number(boq.revised_quantity ?? (boq as any).contract_quantity ?? boq.tender_quantity ?? 0)
    const rate = Number(boq.revised_rate ?? (boq as any).contract_rate ?? boq.awarded_rate ?? 0)
    const amount = Number(boq.revised_amount ?? (boq as any).contract_amount ?? boq.total_amount ?? (contractQty * rate))

    abstractMap.set(boq.id, {
      boq_item_id: boq.id,
      item_number: boq.item_number,
      description: boq.description,
      unit: boq.unit,
      contract_quantity: contractQty,
      contract_rate: rate,
      contract_amount: amount,
      previous_quantity: 0,
      current_quantity: 0,
      cumulative_quantity: 0,
      balance_quantity: contractQty,
      cumulative_amount: 0,
      certified_quantity: 0,
      certified_amount: 0,
      is_exceeded: false,
      entry_count: 0,
    })
  }

  for (const entry of entries) {
    if (entry.status === 'REJECTED' || entry.status === 'CANCELLED') {
      continue
    }

    const item = abstractMap.get(entry.boq_item_id)
    if (!item) continue

    const qty = Number(entry.calculated_quantity) || 0
    item.cumulative_quantity = Number((item.cumulative_quantity + qty).toFixed(3))
    item.entry_count += 1

    if (entry.status === 'CERTIFIED') {
      item.certified_quantity = Number((item.certified_quantity + qty).toFixed(3))
    }

    if (entry.billed_in_ra_bill_id) {
      item.previous_quantity = Number((item.previous_quantity + qty).toFixed(3))
    } else {
      item.current_quantity = Number((item.current_quantity + qty).toFixed(3))
    }
  }

  return Array.from(abstractMap.values()).map(item => {
    item.balance_quantity = Number((item.contract_quantity - item.cumulative_quantity).toFixed(3))
    item.cumulative_amount = Number((item.cumulative_quantity * item.contract_rate).toFixed(2))
    item.certified_amount = Number((item.certified_quantity * item.contract_rate).toFixed(2))
    item.is_exceeded = item.balance_quantity < 0
    return item
  })
}

export function formatChainage(km?: number | null, m?: number | null): string {
  if (km === null || km === undefined) {
    if (m === null || m === undefined) return '—'
    return `RD ${m.toFixed(2)} m`
  }
  const metres = m !== null && m !== undefined ? m : 0
  return `RD ${km}+${metres.toFixed(1).padStart(5, '0')}`
}
