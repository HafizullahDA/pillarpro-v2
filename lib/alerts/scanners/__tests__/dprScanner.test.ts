import { describe, it, expect } from 'vitest'
import { scanMissingDPRs } from '../dprScanner'

describe('DPR Evening Missing Scanner', () => {
  it('correctly identifies active projects missing DPR for the target date', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          missing_dprs: [
            {
              project_id: 'proj-1',
              project_name: 'Highway NH-44 Widening',
              project_code: 'HW-44',
              organization_id: 'org-1',
              as_of_date: '2026-10-05',
            },
            {
              project_id: 'proj-2',
              project_name: 'Smart Bridge Package B',
              project_code: 'BR-02',
              organization_id: 'org-1',
              as_of_date: '2026-10-05',
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanMissingDPRs(mockSupabase, '2026-10-05')

    expect(candidates).toHaveLength(2)

    const c1 = candidates.find(c => c.entityId === 'proj-1')
    expect(c1).toBeDefined()
    expect(c1?.milestoneKey).toBe('DPR_MISSING_EVENING')
    expect(c1?.entityType).toBe('dpr')
    expect(c1?.entityReference).toBe('Highway NH-44 Widening')
    expect(c1?.projectName).toBe('Highway NH-44 Widening')
  })

  it('uses fallback direct query when RPC is unavailable', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: null,
        error: { message: 'function does not exist' },
      }),
      from: (table: string) => {
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    { id: 'proj-active-1', name: 'Canal Lining Project', organization_id: 'org-1' },
                    { id: 'proj-active-2', name: 'Flyover Pier P3', organization_id: 'org-1' },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'daily_progress_reports') {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ project_id: 'proj-active-1' }], // proj-active-1 has a DPR logged
                error: null,
              }),
            }),
          }
        }
        return {}
      },
    } as any

    const candidates = await scanMissingDPRs(mockSupabase, '2026-10-05')

    // Only proj-active-2 is missing a DPR
    expect(candidates).toHaveLength(1)
    expect(candidates[0].entityId).toBe('proj-active-2')
    expect(candidates[0].milestoneKey).toBe('DPR_MISSING_EVENING')
  })
})
