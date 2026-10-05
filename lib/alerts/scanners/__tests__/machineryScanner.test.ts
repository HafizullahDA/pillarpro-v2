import { describe, it, expect } from 'vitest'
import { scanMachinery } from '../machineryScanner'

describe('Machinery Fleet & Compliance Scanner', () => {
  it('identifies machinery due for preventive service and expiring compliance documents', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          machinery: [
            {
              id: 'mch-excavator-01',
              asset_name: 'Tata Hitachi ZX210 Excavator',
              registration_number: 'JK02-EX-1001',
              current_meter: 1520,
              last_service_meter: 1250, // 1520 - 1250 = 270h >= 250h -> SERVICE DUE
              service_interval_meter: 250,
              insurance_expiry: '2026-10-12', // 7 days from 2026-10-05 -> T_MINUS_7
              fitness_expiry: '2026-12-01', // not expiring
              puc_expiry: null,
              project_name: 'Highway NH-44',
              organization_id: 'org-1',
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanMachinery(mockSupabase, '2026-10-05')

    // Expect 2 candidates for this excavator: 1 for service due, 1 for insurance T-7
    expect(candidates).toHaveLength(2)

    const serviceCandidate = candidates.find(c => c.complianceDocType === 'service')
    expect(serviceCandidate).toBeDefined()
    expect(serviceCandidate?.milestoneKey).toBe('SERVICE_DUE')
    expect(serviceCandidate?.hoursSinceLastService).toBe(270)

    const insuranceCandidate = candidates.find(c => c.complianceDocType === 'insurance')
    expect(insuranceCandidate).toBeDefined()
    expect(insuranceCandidate?.milestoneKey).toBe('T_MINUS_7')
    expect(insuranceCandidate?.daysRemaining).toBe(7)
  })
})
