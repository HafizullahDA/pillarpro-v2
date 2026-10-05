import { describe, it, expect } from 'vitest'
import { scanWeeklyLabourPayout } from '../labourPayoutScanner'

describe('Weekly Labour Payout Scanner', () => {
  it('aggregates weekly labour liabilities and 1% BOCW Cess', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          weekly_labour_summary: [
            {
              project_id: 'proj-1',
              project_name: 'Highway NH-44',
              organization_id: 'org-1',
              week_start: '2026-09-29',
              week_end: '2026-10-05',
              total_workers: 24,
              total_mandays: 132.5,
              total_ot_hours: 42.0,
              regular_wages: 92750,
              ot_wages: 4200,
              gross_wage_liability: 96950,
              bocw_cess_estimate: 969.5,
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanWeeklyLabourPayout(mockSupabase, '2026-10-05')

    expect(candidates).toHaveLength(1)
    const p1 = candidates[0]
    expect(p1.entityType).toBe('labour_payout')
    expect(p1.milestoneKey).toBe('WEEKLY_LABOUR_PAYOUT')
    expect(p1.totalWorkers).toBe(24)
    expect(p1.grossWageLiability).toBe(96950)
    expect(p1.bocwCessEstimate).toBe(969.5)
  })
})
