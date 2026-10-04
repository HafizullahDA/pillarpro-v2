'use client'

import React, { useState } from 'react'
import { formatINR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { StitchTable, StitchTableHead, StitchTableBody, StitchTableRow, StitchTableCell } from '@/components/ui/StitchTable'
import { RecordActivityModal } from '@/components/audit/RecordActivityModal'

export interface SupplierTransactionItem {
  id: string
  date: string
  transaction_type: 'procurement' | 'payment' | string
  amount: number
  runningBalance: number
  description?: string
  mode?: string | null
  reference?: string | null
  notes?: string | null
  quantity?: number | null
  rate?: number | null
  unit?: string | null
  carriage_amount?: number | null
  projects?: { name?: string } | { name?: string }[] | null
  expenses?: { receipt_url?: string } | { receipt_url?: string }[] | null
  [key: string]: any
}

interface SupplierTransactionsLedgerClientProps {
  transactions: SupplierTransactionItem[] | any[]
  supplierName: string
  supplierId: string
}

export function SupplierTransactionsLedgerClient({
  transactions,
  supplierName,
  supplierId,
}: SupplierTransactionsLedgerClientProps) {
  const [selectedTxForAudit, setSelectedTxForAudit] = useState<SupplierTransactionItem | null>(null)
  const [showSupplierAudit, setShowSupplierAudit] = useState(false)

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Account Statement &amp; Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete history of materials procured and payments made
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSupplierAudit(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            title="Inspect audit trail for this supplier's profile & ledger"
          >
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Account Audit History
          </button>
          <div className="text-xs text-slate-500 border-l border-slate-200 pl-3">
            Total entries: <span className="font-bold text-slate-800 tabular-nums">{transactions.length}</span>
          </div>
        </div>
      </div>

      {!transactions.length ? (
        <EmptyState
          title="No transactions yet"
          description="Use '+ Procurement' to log material deliveries or '+ Payment' to record settlements."
        />
      ) : (
        <>
          {/* Mobile View: Stacked Cards */}
          <div className="block md:hidden space-y-3">
            {transactions.map(tx => {
              const isProc = tx.transaction_type === 'procurement'
              const projObj = (Array.isArray(tx.projects) ? tx.projects[0] : tx.projects) as { name?: string } | null
              const projName = projObj?.name ?? null
              const expenseObj = (Array.isArray(tx.expenses) ? tx.expenses[0] : tx.expenses) as { receipt_url?: string } | null
              const receiptUrl = expenseObj?.receipt_url

              return (
                <div key={tx.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                      {formatDate(tx.date)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isProc
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        }`}
                      >
                        {isProc ? 'Procurement' : 'Payment'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedTxForAudit(tx)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="View entry audit trail"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="font-bold text-slate-900 text-sm tracking-tight">{tx.description}</div>

                  {(tx.quantity != null && tx.rate != null) && (
                    <div className="text-xs font-mono text-slate-500">
                      {Number(tx.quantity).toLocaleString()} {tx.unit || 'nos'} @ {formatINR(Number(tx.rate))}/{tx.unit || 'nos'}
                      {(Number(tx.carriage_amount) || 0) > 0 && (
                        <span className="text-blue-700 font-semibold ml-1.5">
                          (+ {formatINR(Number(tx.carriage_amount))} carriage)
                        </span>
                      )}
                    </div>
                  )}

                  {projName && (
                    <div className="text-xs text-slate-600">
                      Site: <span className="font-semibold text-slate-800">{projName}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 mr-1">Amount:</span>
                      <span className={`font-mono font-bold ${isProc ? 'text-slate-900' : 'text-emerald-700'}`}>
                        {isProc ? '+' : '-'}{formatINR(tx.amount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 mr-1">Balance:</span>
                      <span className={`font-mono font-bold ${tx.runningBalance > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {formatINR(tx.runningBalance)}
                      </span>
                    </div>
                  </div>

                  {receiptUrl && (
                    <div className="pt-1 text-xs">
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Receipt
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop View: Full Table */}
          <div className="hidden md:block">
            <StitchTable>
              <table className="w-full text-sm">
                <StitchTableHead>
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Item / Description</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Site (Project)</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Ref / Mode</th>
                    <th className="px-4 py-3 text-right">Procurement (+)</th>
                    <th className="px-4 py-3 text-right">Payment (-)</th>
                    <th className="px-4 py-3 text-right">Running Balance</th>
                    <th className="px-3 py-3 text-right">Audit</th>
                  </tr>
                </StitchTableHead>
                <StitchTableBody>
                  {transactions.map(tx => {
                    const isProc = tx.transaction_type === 'procurement'
                    const projObj = (Array.isArray(tx.projects) ? tx.projects[0] : tx.projects) as { name?: string } | null
                    const projName = projObj?.name ?? null
                    const expenseObj = (Array.isArray(tx.expenses) ? tx.expenses[0] : tx.expenses) as { receipt_url?: string } | null
                    const receiptUrl = expenseObj?.receipt_url

                    return (
                      <StitchTableRow key={tx.id}>
                        {/* Date */}
                        <StitchTableCell className="text-xs text-slate-600 whitespace-nowrap tabular-nums font-medium">
                          {formatDate(tx.date)}
                        </StitchTableCell>

                        {/* Type Badge */}
                        <StitchTableCell className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              isProc
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            }`}
                          >
                            {isProc ? 'Procurement' : 'Payment'}
                          </span>
                        </StitchTableCell>

                        {/* Description & Notes */}
                        <StitchTableCell>
                          <div className="font-semibold text-slate-900">{tx.description}</div>
                          {(tx.quantity != null && tx.rate != null) && (
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {Number(tx.quantity).toLocaleString()} {tx.unit || 'nos'} @ {formatINR(Number(tx.rate))}/{tx.unit || 'nos'}
                              {(Number(tx.carriage_amount) || 0) > 0 && (
                                <span className="text-blue-700 font-semibold ml-1.5">
                                  (+ {formatINR(Number(tx.carriage_amount))} carriage)
                                </span>
                              )}
                            </div>
                          )}
                          {tx.notes && <div className="text-xs text-slate-400 mt-0.5">{tx.notes}</div>}
                          {receiptUrl && (
                            <a
                              href={receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5 font-medium"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              View Attached Receipt
                            </a>
                          )}
                        </StitchTableCell>

                        {/* Project Site */}
                        <StitchTableCell className="hidden md:table-cell whitespace-nowrap">
                          {projName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                              {projName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">General / Central</span>
                          )}
                        </StitchTableCell>

                        {/* Reference & Mode */}
                        <StitchTableCell className="hidden lg:table-cell text-xs text-slate-600 whitespace-nowrap">
                          {tx.reference && <div className="font-mono">{tx.reference}</div>}
                          {tx.mode && (
                            <div className="text-slate-400 capitalize">{tx.mode.replace('_', ' ')}</div>
                          )}
                          {!tx.reference && !tx.mode && <span className="text-slate-400">—</span>}
                        </StitchTableCell>

                        {/* Procurement Amount */}
                        <StitchTableCell align="right" className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {isProc ? formatINR(tx.amount) : '—'}
                        </StitchTableCell>

                        {/* Payment Amount */}
                        <StitchTableCell align="right" className="font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          {!isProc ? formatINR(tx.amount) : '—'}
                        </StitchTableCell>

                        {/* Running Balance */}
                        <StitchTableCell align="right" className="font-mono font-bold whitespace-nowrap">
                          <span className={tx.runningBalance > 0 ? 'text-rose-700' : 'text-slate-700'}>
                            {formatINR(tx.runningBalance)}
                          </span>
                        </StitchTableCell>

                        {/* Audit Action */}
                        <StitchTableCell align="right" className="whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTxForAudit(tx)}
                            title="Inspect immutable audit trail & edits"
                            className="inline-flex items-center gap-1 text-[11px] py-1 px-2 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-semibold transition-colors"
                          >
                            <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Audit
                          </button>
                        </StitchTableCell>
                      </StitchTableRow>
                    )
                  })}
                </StitchTableBody>
              </table>
            </StitchTable>
          </div>
        </>
      )}

      {/* Per-Transaction Audit Modal */}
      {selectedTxForAudit && (
        <RecordActivityModal
          open={!!selectedTxForAudit}
          onClose={() => setSelectedTxForAudit(null)}
          entityType="supplier_transactions"
          entityId={selectedTxForAudit.id}
          title={`Ledger Entry Audit Trail: ${selectedTxForAudit.description}`}
          subtitle={`Chronological modification record for ${isProcType(selectedTxForAudit) ? 'procurement' : 'payment'} voucher of ${formatINR(selectedTxForAudit.amount)}`}
        />
      )}

      {/* Supplier Profile / Overall Audit Modal */}
      {showSupplierAudit && (
        <RecordActivityModal
          open={showSupplierAudit}
          onClose={() => setShowSupplierAudit(false)}
          entityType="suppliers"
          entityId={supplierId}
          title={`${supplierName} Account & Master Audit Log`}
          subtitle="Audit history for supplier registration, terms amendments, and ledger activity."
        />
      )}
    </div>
  )
}

function isProcType(tx: SupplierTransactionItem): boolean {
  return tx.transaction_type === 'procurement'
}
