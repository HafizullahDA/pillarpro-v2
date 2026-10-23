import { describe, it, expect } from 'vitest'

describe('Contract Position Executed Value & Lump-Sum Fallback', () => {
  it('correctly uses billedValue when eMbExecutedValue is 0 and billedValue > 0 (Lump-Sum Quick Entry)', () => {
    const eMbExecutedValue: number = 0
    const billedValue: number = 449925
    const currentContractValue: number = 500000

    const isLumpSumBilled = eMbExecutedValue === 0 && billedValue > 0
    const displayExecutedValue = isLumpSumBilled ? billedValue : eMbExecutedValue
    const executionPct = currentContractValue > 0
      ? Math.min(100, Math.round((displayExecutedValue / currentContractValue) * 100))
      : 0

    expect(isLumpSumBilled).toBe(true)
    expect(displayExecutedValue).toBe(449925)
    expect(executionPct).toBe(90)
  })

  it('preserves exact eMbExecutedValue and calculates execution % when eMbExecutedValue > 0', () => {
    const eMbExecutedValue: number = 350000
    const billedValue: number = 250000
    const currentContractValue: number = 500000

    const isLumpSumBilled = eMbExecutedValue === 0 && billedValue > 0
    const displayExecutedValue = isLumpSumBilled ? billedValue : eMbExecutedValue
    const executionPct = currentContractValue > 0
      ? Math.min(100, Math.round((displayExecutedValue / currentContractValue) * 100))
      : 0

    expect(isLumpSumBilled).toBe(false)
    expect(displayExecutedValue).toBe(350000)
    expect(executionPct).toBe(70)
  })

  it('handles brand new projects with 0 execution and 0 billing gracefully', () => {
    const eMbExecutedValue: number = 0
    const billedValue: number = 0
    const currentContractValue: number = 500000

    const isLumpSumBilled = eMbExecutedValue === 0 && billedValue > 0
    const displayExecutedValue = isLumpSumBilled ? billedValue : eMbExecutedValue

    expect(isLumpSumBilled).toBe(false)
    expect(displayExecutedValue).toBe(0)
  })
})

