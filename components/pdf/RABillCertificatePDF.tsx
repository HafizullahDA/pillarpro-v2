'use client'

import { formatINR, formatDate } from '@/lib/format'
import { RABillRow } from '@/app/(app)/ra-bills/RABillsClient'
import { OrganizationProfile } from '@/lib/organization'

interface RABillCertificatePDFProps {
  bill: RABillRow
  organization?: OrganizationProfile
}

export function RABillCertificatePDF({ bill, organization }: RABillCertificatePDFProps) {
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const isCum = bill.billing_mode === 'cumulative'
  const workCertified = isCum && bill.this_bill_work_certified != null
    ? Number(bill.this_bill_work_certified)
    : Number(bill.work_certified_amount)

  const retention = Number(bill.retention_amount) || 0
  const tds = Number(bill.tds_deducted) || 0
  const gstTds = Number(bill.gst_tds_deducted) || 0
  const labourCess = Number(bill.labour_cess_deducted) || 0
  const otherDeductions = Number(bill.other_deductions) || 0
  const totalDeductions = Number(bill.total_deductions) || (retention + tds + gstTds + labourCess + otherDeductions)

  const netPassed = bill.net_payable_this_bill != null
    ? Number(bill.net_payable_this_bill)
    : (Number(bill.net_payable_amount) != null && !isNaN(Number(bill.net_payable_amount))
      ? Number(bill.net_payable_amount)
      : (workCertified - retention))

  const received = Number(bill.amount_received) || 0
  const netBankReceived = Number(bill.net_bank_received) || (received > 0 ? Math.max(0, received - totalDeductions) : 0)
  const outstanding = Math.max(0, netPassed - received)

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
              Running Account (RA) Bill Certificate
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p><strong>Date:</strong> {generatedAt}</p>
            <p className="font-mono text-[11px] text-slate-400">Bill ID: {bill.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Project & Bill Metadata */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Work Order & Project</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{bill.projects?.name || 'Project Site'}</p>
            {bill.projects?.agency_name && (
              <p className="text-slate-700 mt-0.5"><strong>Client / Department:</strong> {bill.projects.agency_name}</p>
            )}
            <p className="text-slate-600 mt-0.5">
              <strong>Billing Mode:</strong> {isCum ? 'Cumulative Bill' : 'Standalone Bill'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Bill Details</p>
            <p className="text-base font-mono font-bold text-blue-700 mt-0.5">{bill.bill_number}</p>
            <p className="text-slate-600 mt-0.5"><strong>Submission Date:</strong> {formatDate(bill.submission_date)}</p>
            <p className="text-slate-600 mt-0.5">
              <strong>Bill Status:</strong>{' '}
              <span className="uppercase font-semibold">{bill.status.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Work Certified This Bill</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{formatINR(workCertified)}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Statutory Deductions & Retention</p>
          <p className="text-lg font-black text-amber-800 mt-0.5">{formatINR(totalDeductions)}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Payable / Bank Passed</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{formatINR(netPassed)}</p>
        </div>
      </div>

      {/* Section 1: Measurement & Certification Breakdown */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
          1. Work Certified & Measurements
        </h3>
        <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
          <tbody>
            {isCum && (
              <>
                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 text-slate-600">Cumulative Work Certified to Date (Gross Measurement)</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums">
                    {formatINR(Number(bill.cumulative_certified_amount) || Number(bill.work_certified_amount))}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <td className="py-2 px-3 text-slate-600">Less: Work Certified in Previous Bills</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums text-slate-500">
                    - {formatINR(Number(bill.previous_certified_amount) || 0)}
                  </td>
                </tr>
              </>
            )}
            <tr className="bg-slate-100 font-bold">
              <td className="py-2 px-3 text-slate-900">Gross Work Certified for this Bill (A)</td>
              <td className="py-2 px-3 text-right font-black tabular-nums text-slate-900">
                {formatINR(workCertified)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Statutory Deductions & Department Withholdings */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
          2. Statutory Deductions & Departmental Withholdings
        </h3>
        <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <th className="py-2 px-3 text-left">Deduction Description</th>
              <th className="py-2 px-3 text-center w-24">Rate / Basis</th>
              <th className="py-2 px-3 text-right w-36">Withheld Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2 px-3">Security Deposit / Retention Money Withheld</td>
              <td className="py-2 px-3 text-center text-slate-500 font-mono">{bill.retention_percentage}%</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium text-amber-800">{formatINR(retention)}</td>
            </tr>
            {tds > 0 && (
              <tr>
                <td className="py-2 px-3">Income Tax TDS (Section 194C)</td>
                <td className="py-2 px-3 text-center text-slate-500 font-mono">1% / 2%</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-800">{formatINR(tds)}</td>
              </tr>
            )}
            {gstTds > 0 && (
              <tr>
                <td className="py-2 px-3">GST TDS (CGST + SGST)</td>
                <td className="py-2 px-3 text-center text-slate-500 font-mono">2.0%</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-800">{formatINR(gstTds)}</td>
              </tr>
            )}
            {labourCess > 0 && (
              <tr>
                <td className="py-2 px-3">Building & Other Construction Workers (BOCW) Labour Welfare Cess</td>
                <td className="py-2 px-3 text-center text-slate-500 font-mono">1.0%</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-800">{formatINR(labourCess)}</td>
              </tr>
            )}
            {bill.bill_deductions && bill.bill_deductions.map((d, i) => (
              <tr key={i}>
                <td className="py-2 px-3">{d.deduction_label}</td>
                <td className="py-2 px-3 text-center text-slate-500 font-mono">Dept. Withholding</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-800">{formatINR(d.deduction_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={2} className="py-2 px-3 text-right uppercase text-[11px]">Total Deductions Withheld (B)</td>
              <td className="py-2 px-3 text-right font-black tabular-nums text-amber-900">
                {formatINR(totalDeductions)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Section 3: Net Payable & Receipt Summary */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
          3. Net Payable & Treasury Disbursement
        </h3>
        <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
          <tbody>
            <tr className="border-b border-slate-200 bg-emerald-50/50">
              <td className="py-2.5 px-3 font-bold text-slate-900">Net Passed Amount for this Bill (A - Retention)</td>
              <td className="py-2.5 px-3 text-right font-black text-sm text-emerald-800 tabular-nums">
                {formatINR(netPassed)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2 px-3 text-slate-600">Gross Amount Released by Treasury / Client</td>
              <td className="py-2 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatINR(received)}
              </td>
            </tr>
            {netBankReceived > 0 && (
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 text-slate-600">Actual Net Bank Cash Credited (After Deductions)</td>
                <td className="py-2 px-3 text-right font-bold tabular-nums text-teal-700">
                  {formatINR(netBankReceived)}
                </td>
              </tr>
            )}
            <tr className="bg-slate-50">
              <td className="py-2.5 px-3 font-bold text-slate-800">Pending Balance Receivable</td>
              <td className="py-2.5 px-3 text-right font-black tabular-nums text-rose-700">
                {formatINR(outstanding)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Remarks if any */}
      {bill.remarks && (
        <div className="mb-8 p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
          <p className="font-bold text-slate-700">Engineer / Contractor Remarks:</p>
          <p className="mt-0.5">{bill.remarks}</p>
        </div>
      )}

      {/* Sign-off & Certification Block */}
      <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">For {organization?.name || 'Contractor / Agency'}</p>
          <p className="text-[11px] text-slate-500">Authorized Signature & Seal</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">Junior / Site Engineer</p>
          <p className="text-[11px] text-slate-500">Measured & Certified</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">Executive Engineer / DDO</p>
          <p className="text-[11px] text-slate-500">Passed & Verified</p>
        </div>
      </div>

      {/* Document Footer Notice */}
      <div className="mt-8 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        <span>Certified under {organization?.name || 'Contractor'}</span>
        <span>PillarPro Running Account Billing System · Standard Form CPWD/PWD-26 Compatible</span>
      </div>
    </div>
  )
}
