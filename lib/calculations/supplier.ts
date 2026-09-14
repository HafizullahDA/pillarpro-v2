import { roundToTwo, safeAdd, safeSub } from './financial'

export interface RawSupplierTransaction {
  id?: string
  date: string
  transaction_type: string // 'procurement' | 'payment'
  amount: number
  [key: string]: any
}

export interface SupplierLedgerItem extends RawSupplierTransaction {
  runningBalance: number
}

export interface SupplierTotals {
  totalProcured: number
  totalPaid: number
  balanceOwed: number
}

/**
 * Computes chronological running balance for a supplier ledger.
 * - Procurements (materials delivered to site) INCREASE balance owed (+).
 * - Payments (bank transfers / cash to vendor) DECREASE balance owed (-).
 */
export function calculateSupplierLedger(
  transactions: RawSupplierTransaction[],
  openingBalance = 0
): SupplierLedgerItem[] {
  let currentBalance = roundToTwo(openingBalance)

  // Sort ascending by date (and created_at) for correct running balance computation
  const sorted = [...transactions].sort((a, b) => {
    const cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (cmp !== 0) return cmp
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return 0
  })

  return sorted.map(tx => {
    const amt = Math.max(0, roundToTwo(tx.amount || 0))
    const isProcurement = tx.transaction_type?.toLowerCase() === 'procurement'

    if (isProcurement) {
      currentBalance = safeAdd(currentBalance, amt)
    } else {
      currentBalance = safeSub(currentBalance, amt)
    }

    return {
      ...tx,
      amount: amt,
      runningBalance: currentBalance,
    }
  })
}

/**
 * Computes aggregated financial totals for a supplier khata account.
 */
export function calculateSupplierTotals(
  transactions: RawSupplierTransaction[],
  openingBalance = 0
): SupplierTotals {
  let totalProcured = 0
  let totalPaid = 0

  for (const tx of transactions) {
    const amt = Math.max(0, roundToTwo(tx.amount || 0))
    const isProcurement = tx.transaction_type?.toLowerCase() === 'procurement'

    if (isProcurement) {
      totalProcured = safeAdd(totalProcured, amt)
    } else {
      totalPaid = safeAdd(totalPaid, amt)
    }
  }

  const balanceOwed = safeSub(safeAdd(openingBalance, totalProcured), totalPaid)

  return {
    totalProcured,
    totalPaid,
    balanceOwed,
  }
}

