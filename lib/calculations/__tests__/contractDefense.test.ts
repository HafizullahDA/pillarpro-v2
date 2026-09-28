import { describe, it, expect } from 'vitest'
import {
  calculateEventDelayDays,
  buildContractTimeline,
  calculateDefenseMetrics,
} from '../contractDefense'
import { ContractEvent, DetailedHindrance } from '../../types/contractDefense'

describe('Contract Defense & Hindrance Register Engine', () => {
  it('calculates event delay days accurately including inclusive bounds', () => {
    // 2026-09-01 to 2026-09-10 = 10 days
    expect(calculateEventDelayDays('2026-09-01', '2026-09-10')).toBe(10)
    // Single day event
    expect(calculateEventDelayDays('2026-09-15', '2026-09-15')).toBe(1)
  })

  it('builds chronological Contract Timeline merging events and hindrances without duplicates', () => {
    const mockEvents: ContractEvent[] = [
      {
        id: 'ev-1',
        organization_id: 'org-1',
        project_id: 'proj-1',
        hindrance_id: 'h-1', // Linked to h-1, so h-1 must not be duplicated!
        event_number: 'CE-001',
        event_type: 'site_not_handed_over',
        event_date: '2026-09-01',
        start_date: '2026-09-01',
        end_date: '2026-09-15',
        location: 'Ch 0+000 to 2+500',
        description: 'Site possession pending due to forest demarcation',
        estimated_delay_days: 15,
        actual_delay_days: 15,
        financial_impact: 120000,
        eot_relevance: true,
        claim_relevance: true,
        status: 'OPEN',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'ev-2',
        organization_id: 'org-1',
        project_id: 'proj-1',
        event_number: 'CE-002',
        event_type: 'drawing_delay',
        event_date: '2026-09-20',
        start_date: '2026-09-20',
        location: 'Bridge Pier P2',
        description: 'Pier foundation structural design details awaited',
        estimated_delay_days: 10,
        actual_delay_days: 0,
        financial_impact: 0,
        eot_relevance: true,
        claim_relevance: false,
        status: 'UNDER_REVIEW',
        created_at: '2026-09-20T10:00:00Z',
        updated_at: '2026-09-20T10:00:00Z',
      },
    ]

    const mockHindrances: DetailedHindrance[] = [
      {
        id: 'h-1', // already linked to ev-1
        organization_id: 'org-1',
        project_id: 'proj-1',
        hindrance_number: 1,
        category: 'site_handover',
        description: 'Site handover delay',
        start_date: '2026-09-01',
        status: 'active',
        delay_type: 'compensable',
        overlapping_days: 0,
        net_delay_days: 15,
        notice_served: true,
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'h-2', // Standalone hindrance not yet linked to an event
        organization_id: 'org-1',
        project_id: 'proj-1',
        hindrance_number: 2,
        category: 'utility_shifting',
        description: '11KV HT line crossing clearance pending',
        start_date: '2026-09-10',
        status: 'active',
        delay_type: 'compensable',
        overlapping_days: 0,
        net_delay_days: 8,
        notice_served: true,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      },
    ]

    const timeline = buildContractTimeline(mockEvents, mockHindrances)

    // Total nodes must be 3 (ev-1, h-2, ev-2) - h-1 is NOT duplicated!
    expect(timeline.length).toBe(3)

    // Chronological order: 2026-09-01 -> 2026-09-10 -> 2026-09-20
    expect(timeline[0].date).toBe('2026-09-01')
    expect(timeline[0].id).toBe('event-ev-1')
    expect(timeline[1].date).toBe('2026-09-10')
    expect(timeline[1].id).toBe('hindrance-h-2')
    expect(timeline[2].date).toBe('2026-09-20')
    expect(timeline[2].id).toBe('event-ev-2')
  })

  it('aggregates defense exposure and EOT relevance days accurately', () => {
    const mockEvents: ContractEvent[] = [
      {
        id: 'ev-1',
        organization_id: 'org-1',
        project_id: 'proj-1',
        event_number: 'CE-001',
        event_type: 'site_not_handed_over',
        event_date: '2026-09-01',
        start_date: '2026-09-01',
        description: 'Site obstruction',
        estimated_delay_days: 12,
        actual_delay_days: 12,
        financial_impact: 85000,
        eot_relevance: true,
        claim_relevance: true,
        status: 'OPEN',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      },
    ]

    const metrics = calculateDefenseMetrics(mockEvents, [])
    expect(metrics.totalEvents).toBe(1)
    expect(metrics.openEvents).toBe(1)
    expect(metrics.totalFinancialExposure).toBe(85000)
    expect(metrics.totalEOTRelevantDays).toBe(12)
  })
})
