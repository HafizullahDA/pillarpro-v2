import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate } from '@/lib/format'
import { calculateSupplierLedger, calculateSupplierTotals } from '@/lib/calculations/supplier'
import { SupplierActions } from '../SupplierActions'
import { SupplierStatementButton } from './SupplierStatementButton'
import { DeleteSupplierDetailButton } from './DeleteSupplierDetailButton'
import { StitchMetric } from '@/components/ui/StitchMetric'
import { SupplierTransactionsLedgerClient } from '@/components/suppliers/SupplierTransactionsLedgerClient'

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
      .select('id, name, gst_number, contact_number, address, notes, credit_limit, created_at, updated_at')
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
              suppliers={[{ id: supplier.id, name: supplier.name, contact_number: supplier.contact_number, credit_limit: supplier.credit_limit }]}
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
      <div className={`grid grid-cols-1 ${supplier.credit_limit && supplier.credit_limit > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
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
        {supplier.credit_limit && supplier.credit_limit > 0 ? (
          <StitchMetric
            label="Agreed Credit Limit"
            value={formatINR(supplier.credit_limit)}
            sub={`${Math.round((balanceOwed / supplier.credit_limit) * 100)}% credit utilized`}
            tone={
              balanceOwed >= supplier.credit_limit
                ? 'rose'
                : balanceOwed >= 0.85 * supplier.credit_limit
                ? 'amber'
                : 'default'
            }
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        ) : null}
      </div>

      {/* Transaction Ledger Statement */}
      <SupplierTransactionsLedgerClient
        transactions={displayTransactions}
        supplierName={supplier.name}
        supplierId={supplier.id}
      />
    </div>
  )
}
