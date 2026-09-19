import { describe, it, expect } from 'vitest'
import { createDPRSchema } from '../../validations/dpr'

describe('Daily Progress Report (DPR) Validation', () => {
  it('validates a complete DPR submission with photos', () => {
    const validDPR = {
      project_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      report_date: '2026-09-19',
      weather: 'sunny_clear',
      work_completed_notes: 'Concreting of Pier P3 foundation slab completed (45 cum M30 concrete).',
      impediments_delays: 'Delayed aggregate dumpers due to highway jam for 1.5 hours.',
      total_manpower_count: 32,
      masons_count: 8,
      labourers_count: 24,
      machinery_active_count: 3,
      photos: [
        {
          url: 'https://example.com/storage/v1/object/public/documents/dpr_photos/photo1.jpg',
          caption: 'Pier P3 Concrete Pour',
          taken_at: '2026-09-19T14:30:00Z',
        },
      ],
      status: 'submitted',
    }

    const result = createDPRSchema.safeParse(validDPR)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.masons_count).toBe(8)
      expect(result.data.photos.length).toBe(1)
    }
  })

  it('fails if work_completed_notes is shorter than 5 characters', () => {
    const invalidDPR = {
      project_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      report_date: '2026-09-19',
      work_completed_notes: 'Done', // Too short
    }

    const result = createDPRSchema.safeParse(invalidDPR)
    expect(result.success).toBe(false)
  })

  it('rejects DPR with more than 12 photos', () => {
    const tooManyPhotos = Array.from({ length: 13 }).map((_, i) => ({
      url: `https://example.com/photo_${i}.jpg`,
      caption: `Photo ${i}`,
    }))

    const invalidDPR = {
      project_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      report_date: '2026-09-19',
      work_completed_notes: 'Good progress across all highway sections today.',
      photos: tooManyPhotos,
    }

    const result = createDPRSchema.safeParse(invalidDPR)
    expect(result.success).toBe(false)
  })
})

