import { describe, it, expect } from 'vitest'
import { scanInventory } from '../inventoryScanner'

describe('Inventory Reorder Level Scanner', () => {
  it('identifies items with low stock and critical stock depletion', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          low_inventory: [
            {
              id: 'inv-cement',
              item_name: 'UltraTech OPC 43 Cement',
              item_code: 'MAT-CEM-01',
              unit: 'bags',
              current_stock: 40,
              minimum_stock_alert: 200, // 40 <= 0.25 * 200 (50) -> CRITICAL
              project_name: 'Highway NH-44',
              organization_id: 'org-1',
            },
            {
              id: 'inv-diesel',
              item_name: 'HSD Commercial Diesel',
              item_code: 'FUEL-DSL-01',
              unit: 'liters',
              current_stock: 350,
              minimum_stock_alert: 500, // 350 <= 500, but > 125 -> LOW
              project_name: 'Highway NH-44',
              organization_id: 'org-1',
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanInventory(mockSupabase, '2026-10-05')

    expect(candidates).toHaveLength(2)

    const cement = candidates.find(c => c.entityId === 'inv-cement')
    expect(cement).toBeDefined()
    expect(cement?.milestoneKey).toBe('STOCK_CRITICAL')
    expect(cement?.currentStock).toBe(40)
    expect(cement?.minimumStock).toBe(200)

    const diesel = candidates.find(c => c.entityId === 'inv-diesel')
    expect(diesel).toBeDefined()
    expect(diesel?.milestoneKey).toBe('STOCK_LOW')
    expect(diesel?.currentStock).toBe(350)
  })
})
