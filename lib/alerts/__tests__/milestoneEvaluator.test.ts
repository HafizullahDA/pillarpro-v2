import { describe, it, expect } from 'vitest'
import { evaluateMilestone } from '../milestoneEvaluator'

describe('Milestone Evaluator', () => {
  const asOf = '2026-10-05'

  it('correctly classifies a 30-day deadline', () => {
    // 30 days from 2026-10-05 is 2026-11-04
    const result = evaluateMilestone('2026-11-04', asOf)
    expect(result.daysRemaining).toBe(30)
    expect(result.milestoneKey).toBe('T_MINUS_30')
    expect(result.urgencyLabel).toContain('30-DAY NOTICE')
  })

  it('correctly classifies a 15-day deadline', () => {
    // 15 days from 2026-10-05 is 2026-10-20
    const result = evaluateMilestone('2026-10-20', asOf)
    expect(result.daysRemaining).toBe(15)
    expect(result.milestoneKey).toBe('T_MINUS_15')
    expect(result.urgencyLabel).toContain('15-DAY URGENT')
  })

  it('correctly classifies a 7-day critical deadline', () => {
    // 7 days from 2026-10-05 is 2026-10-12
    const result = evaluateMilestone('2026-10-12', asOf)
    expect(result.daysRemaining).toBe(7)
    expect(result.milestoneKey).toBe('T_MINUS_7')
    expect(result.urgencyLabel).toContain('CRITICAL 7-DAY ALERT')
  })

  it('correctly catches a weekend gap bracket (e.g. 5 days remaining)', () => {
    // 5 days remaining falls in the T_MINUS_7 bracket (4-7 days)
    const result = evaluateMilestone('2026-10-10', asOf)
    expect(result.daysRemaining).toBe(5)
    expect(result.milestoneKey).toBe('T_MINUS_7')
  })

  it('correctly classifies a 3-day emergency deadline', () => {
    const result = evaluateMilestone('2026-10-08', asOf)
    expect(result.daysRemaining).toBe(3)
    expect(result.milestoneKey).toBe('T_MINUS_3')
    expect(result.urgencyLabel).toContain('EMERGENCY 3-DAY ALERT')
  })

  it('correctly classifies a 1-day deadline (due tomorrow)', () => {
    const result = evaluateMilestone('2026-10-06', asOf)
    expect(result.daysRemaining).toBe(1)
    expect(result.milestoneKey).toBe('T_MINUS_1')
    expect(result.urgencyLabel).toContain('DUE TOMORROW')
  })

  it('correctly classifies day 0 (due today)', () => {
    const result = evaluateMilestone('2026-10-05', asOf)
    expect(result.daysRemaining).toBe(0)
    expect(result.milestoneKey).toBe('T_0')
    expect(result.urgencyLabel).toContain('DUE TODAY')
  })

  it('correctly classifies overdue dates (e.g. -2 days)', () => {
    const result = evaluateMilestone('2026-10-03', asOf)
    expect(result.daysRemaining).toBe(-2)
    expect(result.milestoneKey).toBe('OVERDUE')
    expect(result.urgencyLabel).toContain('2d OVERDUE')
  })

  it('ignores dates far in the future (> 30 days)', () => {
    const result = evaluateMilestone('2026-12-25', asOf)
    expect(result.daysRemaining).toBeGreaterThan(30)
    expect(result.milestoneKey).toBeNull()
  })

  it('safely handles empty or invalid dates', () => {
    expect(evaluateMilestone('').milestoneKey).toBeNull()
    expect(evaluateMilestone('invalid-date').milestoneKey).toBeNull()
  })
})
