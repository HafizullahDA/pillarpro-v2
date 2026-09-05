import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { SupplierActions } from '../SupplierActions'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function SupplierDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: supplier }, { data: transactions }, { data: projects }] = await Promise.all([
    supabase
      .from('suppliers')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('supplier_transactions')
      .select(`
        id,
        supplier_id,
        project_id,
        transaction_type,
        description,
        amount,
        date,
        mode,
        reference,
        expense_id,
        notes,
        created_at,
        projects (name),
        expenses (description, receipt_url)
      `)
      .eq('supplier_id', params.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('id, name')
      .order('name'),
  ])

  if (!supplier) {
    notFound()
  }

  // Calculate chronological running balance
  let currentBalance = 0
  const txWithBalance = (transactions ?? []).map(tx => {
    const isProcurement = tx.transaction_type === 'procurement'
    const amt = Number(tx.amount) || 0
    currentBalance += isProcurement ? amt : -amt
    return {
      ...tx,
      runningBalance: currentBalance,
    }
  })

  // Totals
  const totalProcured = txWithBalance
    .filter(t => t.transaction_type === 'procurement')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const totalPaid = txWithBalance
    .filter(t => t.transaction_type === 'payment')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const balanceOwed = totalProcured - totalPaid

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

          <SupplierActions
            projects={projects ?? []}
            suppliers={[{ id: supplier.id, name: supplier.name }]}
            defaultSupplierId={supplier.id}
            showAddSupplier={false}
          />
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
        <SummaryTile
          label="Total Procured"
          value={formatINR(totalProcured)}
          sub={`${txWithBalance.filter(t => t.transaction_type === 'procurement').length} procurement deliveries`}
          accent="blue"
        />
        <SummaryTile
          label="Total Paid"
          value={formatINR(totalPaid)}
          sub={`${txWithBalance.filter(t => t.transaction_type === 'payment').length} settlement transactions`}
          accent="emerald"
        />
        <SummaryTile
          label="Outstanding Balance Owed"
          value={formatINR(balanceOwed)}
          sub={balanceOwed > 0 ? 'Amount payable to supplier' : 'All accounts settled'}
          accent={balanceOwed > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Transaction Ledger Statement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Account Statement & Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete history of materials procured and payments made
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Total entries: <span className="font-semibold text-slate-700">{displayTransactions.length}</span>
          </div>
        </div>

        {!displayTransactions.length ? (
          <EmptyState
            title="No transactions yet"
            description="Use '+ Procurement' to log material deliveries or '+ Payment' to record settlements."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Item / Description</th>
                  <th className="px-4 py-3 hidden md:table-cell">Site (Project)</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Ref / Mode</th>
                  <th className="px-4 py-3 text-right">Procurement (+)</th>
                  <th className="px-4 py-3 text-right">Payment (-)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayTransactions.map(tx => {
                  const isProc = tx.transaction_type === 'procurement'
                  const projObj = (Array.isArray(tx.projects) ? tx.projects[0] : tx.projects) as { name?: string } | null
                  const projName = projObj?.name ?? null
                  const expenseObj = (Array.isArray(tx.expenses) ? tx.expenses[0] : tx.expenses) as { receipt_url?: string } | null
                  const receiptUrl = expenseObj?.receipt_url

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap tabular-nums font-medium">
                        {formatDate(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isProc
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isProc ? 'Procurement' : 'Payment'}
                        </span>
                      </td>

                      {/* Description & Notes */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        {tx.notes && <div className="text-xs text-slate-400 mt-0.5">{tx.notes}</div>}
                        {receiptUrl && (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            View Attached Receipt
                          </a>
                        )}
                      </td>

                      {/* Project Site */}
                      <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                        {projName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {projName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">General / Central</span>
                        )}
                      </td>

                      {/* Reference & Mode */}
                      <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-600 whitespace-nowrap">
                        {tx.reference && <div className="font-mono">{tx.reference}</div>}
                        {tx.mode && (
                          <div className="text-slate-400 capitalize">{tx.mode.replace('_', ' ')}</div>
                        )}
                        {!tx.reference && !tx.mode && <span className="text-slate-400">—</span>}
                      </td>

                      {/* Procurement Amount */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-slate-900 whitespace-nowrap">
                        {isProc ? formatINR(tx.amount) : '—'}
                      </td>

                      {/* Payment Amount */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-emerald-600 whitespace-nowrap">
                        {!isProc ? formatINR(tx.amount) : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        <span className={tx.runningBalance > 0 ? 'text-red-600' : 'text-slate-700'}>
                          {formatINR(tx.runningBalance)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
