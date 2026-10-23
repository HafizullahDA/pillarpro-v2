import { describe, it, expect } from 'vitest'
import { formatDateDDMMYYYY } from '../format'

describe('formatDateDDMMYYYY Indian Date Formatting', () => {
  it('formats ISO YYYY-MM-DD date strings into DD/MM/YYYY without timezone skew', () => {
    expect(formatDateDDMMYYYY('2026-10-23')).toBe('23/10/2026')
    expect(formatDateDDMMYYYY('2026-10-10')).toBe('10/10/2026')
    expect(formatDateDDMMYYYY('2026-01-05')).toBe('05/01/2026')
  })

  it('formats Date objects and ISO timestamps into DD/MM/YYYY', () => {
    const d = new Date(2026, 9, 23) // October is month index 9
    expect(formatDateDDMMYYYY(d)).toBe('23/10/2026')
  })

  it('handles empty, null, and undefined values gracefully', () => {
    expect(formatDateDDMMYYYY(null)).toBe('—')
    expect(formatDateDDMMYYYY(undefined)).toBe('—')
    expect(formatDateDDMMYYYY('')).toBe('—')
  })
})
