import { describe, it, expect } from 'vitest'
import {
  calculateSupplierLedger,
  calculateSupplierTotals,
  RawSupplierTransaction,
} from '../supplier'

describe('Supplier Khata & Running Balance Calculations', () => {
  const transactions: RawSupplierTransaction[] = [
    { date: '2026-09-01', transaction_type: 'procurement', amount: 500000, description: 'Cement bags delivery' },
    { date: '2026-09-05', transaction_type: 'payment', amount: 200000, description: 'RTGS Advance payment' },
    { date: '2026-09-10', transaction_type: 'procurement', amount: 350000, description: 'TMT Steel 16mm' },
    { date: '2026-09-12', transaction_type: 'payment', amount: 400000, description: 'Cheque clearance' },
  ]

  it('correctly tracks chronological running balance', () => {
    const ledger = calculateSupplierLedger(transactions, 0)

    expect(ledger[0].runningBalance).toBe(500000) // +500k = 500k
    expect(ledger[1].runningBalance).toBe(300000) // -200k = 300k
    expect(ledger[2].runningBalance).toBe(650000) // +350k = 650k
    expect(ledger[3].runningBalance).toBe(250000) // -400k = 250k
  })

  it('accurately incorporates opening balance', () => {
    const openingBalance = 100000 // ₹1 Lakh prior liability
    const ledger = calculateSupplierLedger(transactions, openingBalance)

    expect(ledger[0].runningBalance).toBe(600000)
    expect(ledger[1].runningBalance).toBe(400000)
    expect(ledger[2].runningBalance).toBe(750000)
    expect(ledger[3].runningBalance).toBe(350000)
  })

  it('calculates aggregate supplier totals', () => {
    const totals = calculateSupplierTotals(transactions, 50000)

    expect(totals.totalProcured).toBe(850000) // 500k + 350k
    expect(totals.totalPaid).toBe(600000)     // 200k + 400k
    expect(totals.balanceOwed).toBe(300000)   // 50k opening + 850k - 600k = 300k
  })
})

