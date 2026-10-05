/**
 * Inventory Reorder Level Scanner (Phase 3)
 * Scans site inventory items that have breached their minimum safety stock buffer.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'

export async function scanInventory(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const asOf = asOfDateStr || new Date().toISOString().split('T')[0]
  const candidates: AlertCandidate[] = []

  // 1. Try dedicated Phase 3 RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_operations_candidates',
      { p_as_of_date: asOf }
    )

    if (!rpcError && rpcData && Array.isArray(rpcData.low_inventory)) {
      for (const item of rpcData.low_inventory) {
        const curStock = Number(item.current_stock || 0)
        const minStock = Number(item.minimum_stock_alert || 0)
        const isCritical = curStock <= 0.25 * minStock || curStock <= 0

        candidates.push({
          entityType: 'inventory',
          entityId: item.id,
          entityReference: item.item_name,
          organizationId: item.organization_id,
          projectId: item.project_id,
          projectName: item.project_name,
          targetDate: asOf,
          daysRemaining: 0,
          milestoneKey: isCritical ? 'STOCK_CRITICAL' : 'STOCK_LOW',
          urgencyLabel: isCritical ? 'CRITICAL DEPLETION' : 'REORDER BUFFER BREACHED',
          itemName: item.item_name,
          itemCode: item.item_code,
          currentStock: curStock,
          minimumStock: minStock,
          unit: item.unit,
        })
      }
      return candidates
    }
  } catch (err) {
    // Fall back to direct query
  }

  // 2. Direct query fallback
  try {
    const { data: items, error: invError } = await supabase
      .from('inventory_items')
      .select('id, organization_id, project_id, item_name, item_code, unit, current_stock, minimum_stock_alert, projects(name)')
      .gt('minimum_stock_alert', 0)

    if (invError) {
      console.warn('[INVENTORY SCANNER] Error querying inventory_items:', invError.message)
      return candidates
    }

    if (!items || items.length === 0) {
      return candidates
    }

    for (const item of items as any[]) {
      const curStock = Number(item.current_stock || 0)
      const minStock = Number(item.minimum_stock_alert || 0)

      if (curStock <= minStock) {
        const isCritical = curStock <= 0.25 * minStock || curStock <= 0
        const projName = item.projects?.name || undefined

        candidates.push({
          entityType: 'inventory',
          entityId: item.id,
          entityReference: item.item_name,
          organizationId: item.organization_id,
          projectId: item.project_id,
          projectName: projName,
          targetDate: asOf,
          daysRemaining: 0,
          milestoneKey: isCritical ? 'STOCK_CRITICAL' : 'STOCK_LOW',
          urgencyLabel: isCritical ? 'CRITICAL DEPLETION' : 'REORDER BUFFER BREACHED',
          itemName: item.item_name,
          itemCode: item.item_code,
          currentStock: curStock,
          minimumStock: minStock,
          unit: item.unit,
        })
      }
    }
  } catch (err: any) {
    console.error('[INVENTORY SCANNER] Unhandled exception:', err.message)
  }

  return candidates
}
