import { describe, it, expect } from 'vitest'
import { scanSuppliers } from '../suppliersScanner'

describe('Suppliers Credit Limit Scanner', () => {
  it('correctly catches suppliers with >85% and >100% credit utilization', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          suppliers: [
            {
              id: 'sup-crit',
              name: 'Ultratech Cements Dealer',
              contact_number: '+919876543210',
              credit_limit: 1000000,
              outstanding_balance: 890000, // 89% utilization
              credit_utilization_percent: 89,
            },
            {
              id: 'sup-breach',
              name: 'Jindal Steel Depot',
              contact_number: '+919876543211',
              credit_limit: 2000000,
              outstanding_balance: 2150000, // 107.5% utilization
              credit_utilization_percent: 107.5,
            },
            {
              id: 'sup-healthy',
              name: 'Local Aggregate Quarry',
              contact_number: '+919876543212',
              credit_limit: 500000,
              outstanding_balance: 150000, // 30% utilization
              credit_utilization_percent: 30,
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanSuppliers(mockSupabase, '2026-10-05')

    // Expect 2 alert candidates (sup-crit and sup-breach), healthy is skipped
    expect(candidates).toHaveLength(2)

    const supCrit = candidates.find(c => c.entityId === 'sup-crit')
    expect(supCrit).toBeDefined()
    expect(supCrit?.milestoneKey).toBe('CREDIT_85_PERCENT')
    expect(supCrit?.urgencyLabel).toContain('CREDIT LIMIT CRITICAL')

    const supBreach = candidates.find(c => c.entityId === 'sup-breach')
    expect(supBreach).toBeDefined()
    expect(supBreach?.milestoneKey).toBe('CREDIT_BREACHED')
    expect(supBreach?.urgencyLabel).toContain('CREDIT LIMIT EXCEEDED')
  })
})
