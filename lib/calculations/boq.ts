import { BOQSummaryItem, ProjectBOQOverallProgress, CSVBOQRow } from '../types/boq'
import { roundToTwo } from './financial'

/**
 * Calculates overall financial and item progress from a list of BOQ summary items.
 */
export function calculateBOQProgress(items: BOQSummaryItem[]): ProjectBOQOverallProgress {
  if (!items || items.length === 0) {
    return {
      totalTenderAmount: 0,
      totalExecutedAmount: 0,
      overallWorkDonePct: 0,
      totalItemsCount: 0,
      completedItemsCount: 0,
      inProgressItemsCount: 0,
      unstartedItemsCount: 0,
    }
  }

  let totalTender = 0
  let totalExecuted = 0
  let completed = 0
  let inProgress = 0
  let unstarted = 0

  for (const item of items) {
    const tAmount = Number(item.tender_amount) || 0
    const eAmount = Number(item.cumulative_executed_amount) || 0
    const pct = Number(item.work_done_percentage) || 0

    totalTender += tAmount
    totalExecuted += eAmount

    if (pct >= 100) {
      completed++
    } else if (pct > 0) {
      inProgress++
    } else {
      unstarted++
    }
  }

  const overallPct = totalTender > 0 
    ? Math.min(100, roundToTwo((totalExecuted / totalTender) * 100))
    : 0

  return {
    totalTenderAmount: roundToTwo(totalTender),
    totalExecutedAmount: roundToTwo(totalExecuted),
    overallWorkDonePct: overallPct,
    totalItemsCount: items.length,
    completedItemsCount: completed,
    inProgressItemsCount: inProgress,
    unstartedItemsCount: unstarted,
  }
}

/**
 * Parses CSV lines considering quotes and commas.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  result.push(cell.trim())
  return result
}

/**
 * Parses user-uploaded BOQ CSV text.
 * Expected headers (case-insensitive, flexible):
 * Item No / Code, Description, Unit, Quantity / Tender Qty, Rate / Awarded Rate
 */
export function parseBOQCSV(csvContent: string): { data: CSVBOQRow[]; errors: string[] } {
  const lines = csvContent
    .split(/\r\n|\n|\r/)
    .map(line => line.trim())
    .filter(line => line.length > 0)

  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must contain a header row and at least one data row.'] }
  }

  const headerRow = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  
  // Find column indices
  let itemNoIdx = headerRow.findIndex(h => h.includes('item') || h.includes('code') || h === 'no' || h === 'sr')
  let descIdx = headerRow.findIndex(h => h.includes('desc') || h.includes('particular'))
  let unitIdx = headerRow.findIndex(h => h.includes('unit') || h === 'uom')
  let qtyIdx = headerRow.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('tender'))
  let rateIdx = headerRow.findIndex(h => h.includes('rate') || h.includes('price') || h.includes('unitrate'))

  // Default fallback if standard 5 columns in order: [Item No, Description, Unit, Qty, Rate]
  if (itemNoIdx === -1 && headerRow.length >= 5) itemNoIdx = 0
  if (descIdx === -1 && headerRow.length >= 5) descIdx = 1
  if (unitIdx === -1 && headerRow.length >= 5) unitIdx = 2
  if (qtyIdx === -1 && headerRow.length >= 5) qtyIdx = 3
  if (rateIdx === -1 && headerRow.length >= 5) rateIdx = 4

  const missingColumns: string[] = []
  if (itemNoIdx === -1) missingColumns.push('Item Number / Code')
  if (descIdx === -1) missingColumns.push('Description')
  if (unitIdx === -1) missingColumns.push('Unit')
  if (qtyIdx === -1) missingColumns.push('Quantity')
  if (rateIdx === -1) missingColumns.push('Rate')

  if (missingColumns.length > 0) {
    return {
      data: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}. Expected: Item No, Description, Unit, Quantity, Rate.`],
    }
  }

  const data: CSVBOQRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const rawCells = parseCsvLine(lines[i])
    if (rawCells.length < 3 || rawCells.every(c => !c)) continue // skip empty or incomplete lines

    const itemNo = rawCells[itemNoIdx] || `Item ${i}`
    const desc = rawCells[descIdx] || ''
    const unit = rawCells[unitIdx] || 'Nos'
    const rawQty = rawCells[qtyIdx]?.replace(/,/g, '') || '0'
    const rawRate = rawCells[rateIdx]?.replace(/,/g, '') || '0'

    const qty = parseFloat(rawQty)
    const rate = parseFloat(rawRate)

    if (!desc) {
      errors.push(`Row ${i + 1}: Item "${itemNo}" is missing a description.`)
      continue
    }

    if (isNaN(qty) || qty < 0) {
      errors.push(`Row ${i + 1} (${itemNo}): Invalid quantity "${rawCells[qtyIdx]}". Must be a non-negative number.`)
      continue
    }

    if (isNaN(rate) || rate < 0) {
      errors.push(`Row ${i + 1} (${itemNo}): Invalid rate "${rawCells[rateIdx]}". Must be a non-negative number.`)
      continue
    }

    data.push({
      item_number: itemNo,
      description: desc,
      unit: unit.toLowerCase(),
      tender_quantity: roundToTwo(qty),
      awarded_rate: roundToTwo(rate),
    })
  }

  return { data, errors }
}

/**
 * Validates entered measurement quantities against tender quantities.
 * Returns warnings if cumulative execution exceeds tender quantity (variation alert).
 */
export function validateMeasurementQuantities(
  items: { itemNumber: string; tenderQty: number; prevQty: number; currentQty: number }[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const item of items) {
    if (item.currentQty < 0) {
      errors.push(`Item ${item.itemNumber}: Executed quantity cannot be negative.`)
    }

    const cumulative = item.prevQty + item.currentQty
    if (item.tenderQty > 0 && cumulative > item.tenderQty) {
      const excess = roundToTwo(cumulative - item.tenderQty)
      const excessPct = roundToTwo((excess / item.tenderQty) * 100)
      warnings.push(
        `Item ${item.itemNumber}: Cumulative executed quantity (${cumulative}) exceeds tender quantity (${item.tenderQty}) by ${excess} (${excessPct}% variation).`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

