import { describe, it, expect } from 'vitest'
import {
  calculateEvidenceCompleteness,
  getRequiredEvidenceChecklist,
  filterEvidenceRecords,
} from '../evidenceCompleteness'
import { EvidenceRecord } from '../../types/evidence'

describe('Evidence Completeness Engine', () => {
  it('returns default checklist for drawing_delay with 6 standard evidentiary items', () => {
    const checklist = getRequiredEvidenceChecklist('drawing_delay')
    expect(checklist).toHaveLength(6)
    expect(checklist.map(c => c.id)).toContain('dept_letter')
    expect(checklist.map(c => c.id)).toContain('contractor_reminder')
    expect(checklist.map(c => c.id)).toContain('site_photo')
    expect(checklist.map(c => c.id)).toContain('daily_report')
    expect(checklist.map(c => c.id)).toContain('measurement')
    expect(checklist.map(c => c.id)).toContain('engineer_ack')
  })

  it('calculates 0/6 completeness when no evidence is linked', () => {
    const completeness = calculateEvidenceCompleteness('drawing_delay', [])
    expect(completeness.totalRequired).toBe(6)
    expect(completeness.fulfilledCount).toBe(0)
    expect(completeness.ratioString).toBe('0/6')
    expect(completeness.percentage).toBe(0)
    expect(completeness.isComplete).toBe(false)
    expect(completeness.items.every(i => !i.fulfilled)).toBe(true)
  })

  it('calculates exactly 5/6 completeness matching the user prompt example', () => {
    const mockEvidence: EvidenceRecord[] = [
      {
        id: 'ev-1',
        organization_id: 'org-1',
        project_id: 'prj-1',
        evidence_number: 'EV-2026-001',
        type: 'LETTER',
        title: 'Department tender schedule letter of drawings',
        document_date: '2026-01-10',
        file_url: 'https://storage/letter1.pdf',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-01-10T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z',
      },
      {
        id: 'ev-2',
        organization_id: 'org-1',
        project_id: 'prj-1',
        evidence_number: 'EV-2026-002',
        type: 'LETTER',
        title: 'Contractor reminder letter on pending bridge pier drawings',
        document_date: '2026-01-20',
        file_url: 'https://storage/letter2.pdf',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-01-20T00:00:00Z',
        updated_at: '2026-01-20T00:00:00Z',
      },
      {
        id: 'ev-3',
        organization_id: 'org-1',
        project_id: 'prj-1',
        evidence_number: 'EV-2026-003',
        type: 'PHOTO',
        title: 'Site photograph of stalled pier foundation',
        document_date: '2026-01-25',
        file_url: 'https://storage/site.jpg',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z',
      },
      {
        id: 'ev-4',
        organization_id: 'org-1',
        project_id: 'prj-1',
        evidence_number: 'EV-2026-004',
        type: 'DOCUMENT',
        title: 'Daily progress report recording idle shuttering gang',
        document_date: '2026-01-26',
        file_url: 'https://storage/dpr.pdf',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-01-26T00:00:00Z',
        updated_at: '2026-01-26T00:00:00Z',
      },
      {
        id: 'ev-5',
        organization_id: 'org-1',
        project_id: 'prj-1',
        evidence_number: 'EV-2026-005',
        type: 'MEASUREMENT',
        title: 'Measurement sheet cross-reference for initial excavation levels',
        document_date: '2026-01-28',
        file_url: 'https://storage/mb.pdf',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-01-28T00:00:00Z',
        updated_at: '2026-01-28T00:00:00Z',
      },
    ]

    const completeness = calculateEvidenceCompleteness('drawing_delay', mockEvidence)
    expect(completeness.totalRequired).toBe(6)
    expect(completeness.fulfilledCount).toBe(5)
    expect(completeness.ratioString).toBe('5/6')
    expect(completeness.percentage).toBe(83)
    expect(completeness.isComplete).toBe(false)

    // Verify 5 fulfilled, 1 unfulfilled
    const fulfilledIds = completeness.items.filter(i => i.fulfilled).map(i => i.id)
    expect(fulfilledIds).toEqual(['dept_letter', 'contractor_reminder', 'site_photo', 'daily_report', 'measurement'])

    const unfulfilled = completeness.items.find(i => !i.fulfilled)
    expect(unfulfilled?.id).toBe('engineer_ack')
  })

  it('filters evidence records correctly by search, type, and related entity', () => {
    const records: EvidenceRecord[] = [
      {
        id: 'e1',
        organization_id: 'o1',
        project_id: 'p1',
        evidence_number: 'EV-2026-101',
        type: 'PHOTO',
        title: 'Pier 2 Foundation Photo',
        document_date: '2026-02-01',
        related_contract_event_id: 'ev-01',
        file_url: 'https://storage/p1.jpg',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'e2',
        organization_id: 'o1',
        project_id: 'p2',
        evidence_number: 'EV-2026-102',
        type: 'LETTER',
        title: 'Executive Engineer Reminder Letter',
        document_date: '2026-02-05',
        related_hindrance_id: 'hind-01',
        file_url: 'https://storage/l1.pdf',
        version_number: 1,
        status: 'ACTIVE',
        created_at: '2026-02-05T00:00:00Z',
        updated_at: '2026-02-05T00:00:00Z',
      },
    ]

    const filterByType = filterEvidenceRecords(records, { type: 'PHOTO' })
    expect(filterByType).toHaveLength(1)
    expect(filterByType[0].id).toBe('e1')

    const filterBySearch = filterEvidenceRecords(records, { search: 'reminder' })
    expect(filterBySearch).toHaveLength(1)
    expect(filterBySearch[0].id).toBe('e2')

    const filterByRelated = filterEvidenceRecords(records, { relatedType: 'event' })
    expect(filterByRelated).toHaveLength(1)
    expect(filterByRelated[0].id).toBe('e1')
  })
})
