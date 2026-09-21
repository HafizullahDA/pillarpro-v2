'use client'
/* eslint-disable @next/next/no-img-element */

import { formatINR, formatDate } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'
import { ContractorLedgerSummary } from '@/lib/types/contractorLedger'

interface ContractorLedgerPDFProps {
  projectName: string
  agencyName?: string | null
  agreementNumber?: string | null
  awardedAmount?: number | null
  ledger: ContractorLedgerSummary
  organization?: OrganizationProfile
  asOfDate?: string
}

export function ContractorLedgerPDF({
  projectName,
  agencyName,
  agreementNumber,
  awardedAmount,
  ledger,
  organization,
  asOfDate,
}: ContractorLedgerPDFProps) {
  const generatedAt = asOfDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="text-slate-900 font-sans leading-relaxed bg-white p-6 max-w-5xl mx-auto border border-slate-300 print:border-0 print:p-0">
      {/* Top Standard Government Form Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 max-w-2xl">
            {organization?.logo_url && (
              <img
                src={organization.logo_url}
                alt="Logo"
                className="h-14 max-w-[120px] object-contain shrink-0 mt-0.5"
              />
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                {organization?.name || 'Civil Engineering & Infrastructure'}
              </h1>
              <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-slate-600 mt-1">
                {organization?.registration_no && (
                  <span className="font-semibold text-slate-800">
                    Reg No: {organization.registration_no}
                  </span>
                )}
                {organization?.gstin && (
                  <span>· GSTIN: <strong className="font-mono text-slate-800">{organization.gstin}</strong></span>
                )}
                {organization?.address && <span>· {organization.address}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                  FORM CPWA 43 (P.W.A. 14)
                </span>
                <h2 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                  Contractor’s Running Ledger & Statement of Accounts
                </h2>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 shrink-0">
            <p><strong>Statement As Of:</strong> {generatedAt}</p>
            <p className="font-mono text-[11px] text-slate-400">CAG CPWA Rule 10.2</p>
            <span className="inline-block mt-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Audit Personal Ledger
            </span>
          </div>
        </div>

        {/* Project & Contract Metadata Strip */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Name of Work / Project</span>
            <p className="font-bold text-slate-900 mt-0.5">{projectName}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Executing Division / Client</span>
            <p className="font-bold text-slate-900 mt-0.5">{agencyName || 'Public Works Division'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Agreement / Work Order</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{agreementNumber || 'Sanctioned Contract'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Sanctioned Tender Value</span>
            <p className="font-semibold text-slate-900 mt-0.5">
              {awardedAmount ? formatINR(awardedAmount) : 'As per Sanction'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Financial Overview Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Work Certified</span>
          <p className="text-base font-black text-slate-900 mt-0.5">{formatINR(ledger.totalGrossCertified)}</p>
          <span className="text-[10px] text-slate-400">Account I (Gross Billed)</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Retention Held (DLP)</span>
          <p className="text-base font-black text-amber-800 mt-0.5">{formatINR(ledger.totalRetentionHeld)}</p>
          <span className="text-[10px] text-slate-400">Locked Govt Security Deposit</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Gross Treasury Disbursed</span>
          <p className="text-base font-black text-emerald-700 mt-0.5">{formatINR(ledger.totalBankDisbursed)}</p>
          <span className="text-[10px] text-slate-400">Actual Realized Bank Credits</span>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
          <span className="text-[10px] uppercase font-bold text-blue-900">Net Overdue Balance</span>
          <p className="text-base font-black text-blue-800 mt-0.5">{formatINR(ledger.netBalanceOutstanding)}</p>
          <span className="text-[10px] text-blue-600 font-medium">Pending Release by Division</span>
        </div>
      </div>

      {/* 5-Column CPWA Form 43 Running Ledger Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
        <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider">
            Ledger Account of Transactions (CPWA Form 43)
          </h3>
          <span className="font-mono text-[10px] text-slate-300">
            Chronological Account of Works, Deductions & Treasury Receipts
          </span>
        </div>

        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2 border-r border-slate-300 w-24">Date</th>
              <th className="p-2 border-r border-slate-300">Voucher / Bill Ref</th>
              <th className="p-2 border-r border-slate-300 text-right w-24">Gross Certified (₹)</th>
              <th className="p-2 border-r border-slate-300 text-right w-20">Advance (₹)</th>
              <th className="p-2 border-r border-slate-300 text-right w-24">Deductions (₹)</th>
              <th className="p-2 border-r border-slate-300 text-right w-24">Bank Paid (₹)</th>
              <th className="p-2 text-right w-28">Running Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ledger.transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-400">
                  No billing or payment ledger transactions recorded for this work.
                </td>
              </tr>
            ) : (
              ledger.transactions.map((tx, idx) => (
                <tr key={idx} className={tx.type === 'bill_passed' ? 'hover:bg-slate-50' : 'bg-emerald-50/30 hover:bg-emerald-50/50'}>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{tx.voucher_or_bill_number}</span>
                      {tx.bill_type === 'final' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold uppercase">
                          Final
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500">{tx.description}</p>
                    {tx.mb_reference && (
                      <p className="text-[10px] text-blue-700 font-mono mt-0.5">{tx.mb_reference}</p>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {tx.gross_work_certified > 0 ? formatINR(tx.gross_work_certified) : '—'}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 tabular-nums">
                    {tx.advance_payments > 0 ? formatINR(tx.advance_payments) : '—'}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono text-red-600 tabular-nums">
                    {tx.total_deductions > 0 ? `(-) ${formatINR(tx.total_deductions)}` : '—'}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                    {tx.bank_payment_disbursed > 0 ? formatINR(tx.bank_payment_disbursed) : '—'}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-slate-900 tabular-nums">
                    {formatINR(tx.running_balance_due)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-[11px]">
            <tr>
              <td colSpan={2} className="p-2 border-r border-slate-300 text-right uppercase tracking-wider text-[10px]">
                Total Contract Position
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono text-slate-900">
                {formatINR(ledger.totalGrossCertified)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono text-slate-700">
                {formatINR(ledger.totalAdvancesGranted)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono text-red-600">
                (-) {formatINR(ledger.totalAllDeductions)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-700">
                {formatINR(ledger.totalBankDisbursed)}
              </td>
              <td className="p-2 text-right font-mono font-black text-blue-800 text-xs">
                {formatINR(ledger.netBalanceOutstanding)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Statutory Deductions & Tax Deposit Reconciliation Box */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-8">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">
            Breakdown of Deductions & Recoveries Booked
          </p>
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Contractual Security Deposit / Retention (5%):</span>
              <span className="font-semibold text-amber-800">{formatINR(ledger.totalRetentionHeld)}</span>
            </div>
            <div className="flex justify-between">
              <span>Departmental Stores Recovery (Cement & Steel Form 35-A):</span>
              <span className="font-semibold text-slate-900">{formatINR(ledger.totalMaterialRecoveries)}</span>
            </div>
            <div className="flex justify-between">
              <span>Statutory Taxes Withheld (IT TDS, GST TDS, Labour Cess):</span>
              <span className="font-semibold text-red-600">{formatINR(ledger.totalStatutoryTaxes)}</span>
            </div>
            {ledger.totalOtherDeductions > 0 && (
              <div className="flex justify-between">
                <span>Other Recoveries (Mineral Royalty, Testing, Misc):</span>
                <span className="font-semibold text-slate-900">{formatINR(ledger.totalOtherDeductions)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
              <span>Total Deductions Booked Creditable to Work:</span>
              <span>{formatINR(ledger.totalAllDeductions)}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
          <div>
            <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">
              Divisional Balance Clearance Summary
            </p>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Gross Value of Work Done:</span>
                <span className="font-semibold text-slate-900">{formatINR(ledger.totalGrossCertified)}</span>
              </div>
              <div className="flex justify-between">
                <span>Less Deductions Booked by Division:</span>
                <span className="font-semibold text-red-600">(-) {formatINR(ledger.totalAllDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span>Less Net Cash Released into Bank:</span>
                <span className="font-semibold text-emerald-700">(-) {formatINR(ledger.totalBankDisbursed)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t-2 border-slate-300 text-slate-900 font-black text-sm">
                <span>Net Amount Legally Overdue to Contractor:</span>
                <span className="text-blue-800 font-mono">{formatINR(ledger.netBalanceOutstanding)}</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            Prepared under Section 10.2 of the CPWA Code. All transactions reconciled against official treasury vouchers.
          </p>
        </div>
      </div>

      {/* Official Sign-off Block */}
      <div className="border-t-2 border-slate-900 pt-6 mt-6 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Signature of Contractor</span>
          </div>
          <p className="font-bold text-slate-900">Contractor / Authorized Signatory</p>
          <p className="text-[10px] text-slate-500">{organization?.name || 'Contractor Agency'}</p>
        </div>

        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Checked by DA</span>
          </div>
          <p className="font-bold text-slate-900">Divisional Accountant (DA)</p>
          <p className="text-[10px] text-slate-500">Verified against Divisional Cash Book</p>
        </div>

        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Approved by EE</span>
          </div>
          <p className="font-bold text-slate-900">Executive Engineer (EE)</p>
          <p className="text-[10px] text-slate-500">Public Works Division</p>
        </div>
      </div>
    </div>
  )
}

