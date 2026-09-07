'use client'

import { formatINR, formatDate } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'

type Supplier = {
  id: string
  name: string
  contact_number?: string | null
  gst_number?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
}

type SupplierTx = {
  id: string
  date: string
  transaction_type: string
  description?: string | null
  quantity?: number | null
  rate?: number | null
  unit?: string | null
  amount: number
  runningBalance: number
  mode?: string | null
  reference?: string | null
  projects?: { name: string } | null
}

interface SupplierStatementPDFProps {
  supplier: Supplier
  transactions: SupplierTx[]
  totals: {
    totalProcured: number
    totalPaid: number
    balanceOwed: number
  }
  organization?: OrganizationProfile
}

export function SupplierStatementPDF({
  supplier,
  transactions,
  totals,
  organization,
}: SupplierStatementPDFProps) {
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="text-slate-900 font-sans leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
              {organization?.name || 'Civil Engineering & Construction'}
            </h1>
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-slate-600 mt-1">
              {organization?.registration_no && (
                <span className="font-semibold text-slate-800">{organization.registration_no}</span>
              )}
              {organization?.gstin && (
                <span>· GSTIN: <strong className="font-mono text-slate-800">{organization.gstin}</strong></span>
              )}
              {organization?.address && (
                <span>· {organization.address}</span>
              )}
            </div>
            <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase mt-2">
              Supplier Statement of Account
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p><strong>Statement Date:</strong> {generatedAt}</p>
            <p className="font-mono text-[11px] text-slate-400">Account Ref: {supplier.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Vendor Profile & Metadata */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Vendor / Supplier Details</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{supplier.name}</p>
            {supplier.gst_number && (
              <p className="font-mono text-slate-700 mt-0.5"><strong>GSTIN:</strong> {supplier.gst_number}</p>
            )}
            {supplier.contact_number && (
              <p className="text-slate-600"><strong>Contact:</strong> {supplier.contact_number}</p>
            )}
            {supplier.address && (
              <p className="text-slate-600 mt-0.5">{supplier.address}</p>
            )}
          </div>

          <div className="text-right flex flex-col justify-end">
            {supplier.notes && (
              <p className="text-slate-500 italic mb-1">
                <strong>Terms:</strong> {supplier.notes}
              </p>
            )}
            <p className="text-slate-500">
              Account Registered: {formatDate(supplier.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Purchases (Debit)</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{formatINR(totals.totalProcured)}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Paid (Credit)</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{formatINR(totals.totalPaid)}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Balance Due</p>
          <p className={`text-lg font-black mt-0.5 ${totals.balanceOwed > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {formatINR(totals.balanceOwed)}
          </p>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Project</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Description / Details</th>
              <th className="py-2.5 px-3 text-right">Purchases (₹)</th>
              <th className="py-2.5 px-3 text-right">Payments (₹)</th>
              <th className="py-2.5 px-3 text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!transactions.length ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                  No transactions recorded for this supplier account yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => {
                const isProcurement = tx.transaction_type === 'procurement'
                const amt = Number(tx.amount) || 0

                return (
                  <tr key={tx.id} className={index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {tx.projects?.name || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isProcurement
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isProcurement ? 'Purchase' : 'Payment'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      <div>{tx.description || (isProcurement ? 'Material Procurement' : 'Vendor Payment')}</div>
                      {tx.quantity && tx.rate && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {tx.quantity} {tx.unit ?? 'units'} @ ₹{tx.rate}
                        </div>
                      )}
                      {tx.reference && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: {tx.reference} ({tx.mode ?? 'cash'})
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-900">
                      {isProcurement ? formatINR(amt) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700">
                      {!isProcurement ? formatINR(amt) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                      {formatINR(tx.runningBalance)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
              <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                Total Balance Outstanding:
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-black text-slate-900">
                {formatINR(totals.totalProcured)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-black text-emerald-700">
                {formatINR(totals.totalPaid)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-black text-rose-700">
                {formatINR(totals.balanceOwed)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sign-off & Verification */}
      <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">For {supplier.name}</p>
          <p className="text-[11px] text-slate-500">Supplier / Authorized Representative</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">For {organization?.name || 'Contractor'}</p>
          <p className="text-[11px] text-slate-500">Authorized Account Signatory</p>
        </div>
      </div>

      {/* Document Footer Notice */}
      <div className="mt-8 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        <span>Statement of account issued by {organization?.name || 'Contractor'}</span>
        <span>Powered by PillarPro Construction System</span>
      </div>
    </div>
  )
}
