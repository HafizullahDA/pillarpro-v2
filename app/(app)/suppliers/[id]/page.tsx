import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { calculateSupplierLedger, calculateSupplierTotals } from '@/lib/calculations/supplier'
import { SupplierActions } from '../SupplierActions'
import { SupplierStatementButton } from './SupplierStatementButton'
import { DeleteSupplierDetailButton } from './DeleteSupplierDetailButton'
import { StitchMetric } from '@/components/ui/StitchMetric'
import { StitchTable, StitchTableHead, StitchTableBody, StitchTableRow, StitchTableCell } from '@/components/ui/StitchTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { id: string }
}

export default async function SupplierDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: userRole }, { data: supplier }, { data: transactions }, { data: projects }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('suppliers')
      .select('id, name, gst_number, contact_number, address, notes, created_at, updated_at')
      .eq('id', params.id)
      .single(),
    supabase
      .from('supplier_transactions')
      .select(`
        *,
        projects (name),
        expenses (description, receipt_url)
      `)
      .eq('supplier_id', params.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('archived', false)
      .order('name'),
  ])

  if (!supplier) {
    notFound()
  }

  // Pure calculation engine: chronological running ledger & totals
  const txWithBalance = calculateSupplierLedger((transactions ?? []) as any[])
  const { totalProcured, totalPaid, balanceOwed } = calculateSupplierTotals((transactions ?? []) as any[])

  // Display newest transaction first in the statement
  const displayTransactions = [...txWithBalance].reverse()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/suppliers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Suppliers Directory
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
              {supplier.gst_number && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                  GST: {supplier.gst_number}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
              {supplier.contact_number && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {supplier.contact_number}
                </span>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {supplier.address}
                </span>
              )}
              <span className="text-slate-400">Added on {formatDate(supplier.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <SupplierStatementButton
              supplier={supplier}
              transactions={txWithBalance}
              totals={{ totalProcured, totalPaid, balanceOwed }}
            />
            <SupplierActions
              projects={projects ?? []}
              suppliers={[{ id: supplier.id, name: supplier.name }]}
              defaultSupplierId={supplier.id}
              showAddSupplier={false}
            />
            <DeleteSupplierDetailButton
              supplier={{
                ...supplier,
                total_procured: totalProcured,
                total_paid: totalPaid,
                outstanding_balance: balanceOwed,
              }}
              userRole={userRole as string}
            />
          </div>
        </div>
      </div>

      {/* Supplier Notes if any */}
      {supplier.notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 mr-1">Remarks / Terms:</span>
          {supplier.notes}
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StitchMetric
          label="Total Procured"
          value={formatINR(totalProcured)}
          sub={`${txWithBalance.filter(t => t.transaction_type === 'procurement').length} procurement deliveries`}
          tone="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StitchMetric
          label="Total Paid"
          value={formatINR(totalPaid)}
          sub={`${txWithBalance.filter(t => t.transaction_type === 'payment').length} settlement transactions`}
          tone="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StitchMetric
          label="Outstanding Balance Owed"
          value={formatINR(balanceOwed)}
          sub={balanceOwed > 0 ? 'Amount payable to supplier' : 'All accounts settled'}
          tone={balanceOwed > 0 ? 'rose' : 'default'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Transaction Ledger Statement */}
      <div className="space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Account Statement &amp; Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete history of materials procured and payments made
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Total entries: <span className="font-bold text-slate-800 tabular-nums">{displayTransactions.length}</span>
          </div>
        </div>

        {!displayTransactions.length ? (
          <EmptyState
            title="No transactions yet"
            description="Use '+ Procurement' to log material deliveries or '+ Payment' to record settlements."
          />
        ) : (
          <>
            {/* Mobile View: Stacked Cards */}
            <div className="block md:hidden space-y-3">
              {displayTransactions.map(tx => {
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
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isProc
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        }`}
                      >
                        {isProc ? 'Procurement' : 'Payment'}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm tracking-tight">{tx.description}</div>

                    {((tx as any).quantity != null && (tx as any).rate != null) && (
                      <div className="text-xs font-mono text-slate-500">
                        {Number((tx as any).quantity).toLocaleString()} {(tx as any).unit || 'nos'} @ {formatINR(Number((tx as any).rate))}/{(tx as any).unit || 'nos'}
                        {(Number((tx as any).carriage_amount) || 0) > 0 && (
                          <span className="text-blue-700 font-semibold ml-1.5">
                            (+ {formatINR(Number((tx as any).carriage_amount))} carriage)
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
                    </tr>
                  </StitchTableHead>
                  <StitchTableBody>
                    {displayTransactions.map(tx => {
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
                            {((tx as any).quantity != null && (tx as any).rate != null) && (
                              <div className="text-xs font-mono text-slate-500 mt-0.5">
                                {Number((tx as any).quantity).toLocaleString()} {(tx as any).unit || 'nos'} @ {formatINR(Number((tx as any).rate))}/{(tx as any).unit || 'nos'}
                                {(Number((tx as any).carriage_amount) || 0) > 0 && (
                                  <span className="text-blue-700 font-semibold ml-1.5">
                                    (+ {formatINR(Number((tx as any).carriage_amount))} carriage)
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
                        </StitchTableRow>
                      )
                    })}
                  </StitchTableBody>
                </table>
              </StitchTable>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
