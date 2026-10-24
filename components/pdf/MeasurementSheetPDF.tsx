'use client'
/* eslint-disable @next/next/no-img-element */

import { formatINR, formatDate } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'
import { RABillRow } from '@/app/(app)/ra-bills/RABillsClient'
import { RABillItem } from '@/lib/types/boq'
import { calculateDLPReleaseDate, calculateCPWAMemorandum } from '@/lib/calculations/raBill'
import {
  exportForm26AbstractCSV,
  exportRABillTallyVoucherCSV,
  exportRABillTallyVoucherXML,
  formatIndianDate,
} from '@/lib/export/embAndTally'

interface MeasurementSheetPDFProps {
  bill: RABillRow
  items: RABillItem[]
  organization?: OrganizationProfile
  onViewSupportingMeasurements?: (item: RABillItem) => void
}

export function MeasurementSheetPDF({
  bill,
  items,
  organization,
  onViewSupportingMeasurements,
}: MeasurementSheetPDFProps) {
  const generatedAt = formatIndianDate(new Date().toISOString())

  const isFinal = bill.bill_type === 'final'
  const isFirstAndFinal = bill.bill_type === 'first_and_final'
  const isCumulative = bill.billing_mode === 'cumulative'

  const formCode = isFinal ? 'FORM CPWA 27-B' : isFirstAndFinal ? 'FORM CPWA 24' : 'FORM CPWA 26'
  const formTitle = isFinal
    ? 'FINAL BILL (PRINTED ON YELLOW PAPER)'
    : isFirstAndFinal
    ? 'FIRST & FINAL BILL'
    : 'RUNNING ACCOUNT BILL'

  const dlpReleaseDate = isFinal && bill.actual_completion_date
    ? calculateDLPReleaseDate(bill.actual_completion_date, bill.dlp_months || 12)
    : null

  const totalCurrentAmount = items.reduce(
    (acc, it) => acc + (Number(it.current_amount) || 0),
    0
  )
  const totalCumulativeAmount = items.reduce(
    (acc, it) => acc + (Number(it.cumulative_amount) || 0),
    0
  )

  const workCertifiedMeasured = Number(bill.cumulative_certified_amount) || Number(bill.work_certified_amount) || 0
  const unmeasuredAdvance = Number(bill.advance_payments_unmeasured) || 0
  const prevReceived = Number(bill.previous_received_amount) || Number(bill.amount_received) || 0
  const retentionAmt = Number(bill.retention_amount) || 0
  const cementRec = Number(bill.cement_recovery) || 0
  const steelRec = Number(bill.steel_recovery) || 0
  const otherMatRec = Number(bill.other_material_recovery) || 0
  const totalDepartmentalRecoveries = cementRec + steelRec + otherMatRec

  // Full Statutory Deductions
  const itTds = Number(bill.it_tds_amount || bill.tds_deducted) || 0
  const gstTds = Number(bill.gst_tds_amount || bill.gst_tds_deducted) || 0
  const labourCess = Number(bill.labour_cess_amount || bill.labour_cess_deducted) || 0
  const royalty = Number(bill.royalty_recovery) || 0
  const mobAdv = Number(bill.mobilization_advance_recovery) || 0
  const withheld = Number(bill.withheld_amount) || 0
  const otherTaxes = Number(bill.other_deductions) || 0

  const customDeds = bill.bill_deductions || []
  const customDedsTotal = customDeds.reduce((acc, d) => acc + (Number(d.deduction_amount) || 0), 0)

  const totalStatutoryTaxes = itTds + gstTds + labourCess
  const totalOtherRecoveries = royalty + mobAdv + withheld + otherTaxes + customDedsTotal
  const totalAllDeductions = retentionAmt + totalDepartmentalRecoveries + totalStatutoryTaxes + totalOtherRecoveries

  // Account III Memorandum computation
  const memorandum = calculateCPWAMemorandum({
    measuredWorkValue: workCertifiedMeasured,
    advanceUnmeasured: unmeasuredAdvance,
    securedAdvance: 0,
    retentionPercent: Number(bill.retention_percentage) || 5,
    previousPaymentsAlreadyMade: isCumulative ? prevReceived : 0,
    cementRecovery: cementRec,
    steelRecovery: steelRec,
    otherWorkRecoveries: otherMatRec,
  })

  const netPayable = bill.net_payable_this_bill != null
    ? Number(bill.net_payable_this_bill)
    : (bill.net_payable_amount != null
        ? Number(bill.net_payable_amount)
        : Math.max(0, workCertifiedMeasured - totalAllDeductions - (isCumulative ? prevReceived : 0)))

  return (
    <div
      className={`text-slate-900 font-sans leading-relaxed p-6 max-w-5xl mx-auto border transition-colors ${
        isFinal
          ? 'bg-[#FFFDF3] border-amber-300 shadow-sm print:bg-[#FFFDF3]'
          : 'bg-white border-slate-200 print:bg-white'
      }`}
    >
      {/* Action Toolbar (Hidden when printing) */}
      <div className="mb-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Department Exports:
          </span>
          <span className="text-[11px] text-slate-500">CPWA Form 26 Abstract &amp; Tally Vouchers</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportForm26AbstractCSV(bill as any, items, organization?.name)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-xs"
            title="Download Form 26 Abstract CSV for Excel & PWD Audits"
          >
            <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Form 26 (CSV)
          </button>
          <button
            type="button"
            onClick={() => exportRABillTallyVoucherCSV(bill as any, organization?.name)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 transition-colors shadow-xs"
            title="Export for Tally Prime (Double-Entry Ledger CSV)"
          >
            <svg className="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export for Tally (CSV)
          </button>
          <button
            type="button"
            onClick={() => exportRABillTallyVoucherXML(bill as any, organization?.name)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 transition-colors shadow-xs"
            title="Export for Tally Prime (Direct XML Import)"
          >
            <svg className="w-3.5 h-3.5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Export for Tally (XML)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Historic Yellow Paper Watermark / Header Ribbon for Final Bill */}
      {isFinal && (
        <div className="mb-4 -mx-6 -mt-6 bg-amber-400 text-amber-950 font-bold px-6 py-2 flex items-center justify-between text-xs tracking-wider uppercase border-b border-amber-500">
          <span className="flex items-center gap-2">
            CPWA CODE COMPLIANT FINAL BILL — PRINTED ON YELLOW PAPER (PARAS 10.2.14 &amp; 10.2.20)
          </span>
          <span className="font-mono bg-amber-500/80 px-2 py-0.5 rounded text-[11px]">
            FORM CPWA 27-B
          </span>
        </div>
      )}

      {/* Header */}
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
                  <span className="font-semibold text-slate-800">{organization.registration_no}</span>
                )}
                {organization?.gstin && (
                  <span>· GSTIN: <strong className="font-mono text-slate-800">{organization.gstin}</strong></span>
                )}
                {organization?.address && <span>· {organization.address}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                  {formCode}
                </span>
                <h2 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                  {formTitle} — Measurement Sheet &amp; Memorandum of Payments
                </h2>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p><strong>Print Date:</strong> {generatedAt}</p>
            <p className="font-mono text-[11px] text-slate-400">Bill Ref: {bill.bill_number}</p>
            {isFinal && (
              <span className="inline-block mt-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                Final Settlement
              </span>
            )}
          </div>
        </div>

        {/* Project & Bill Info Grid */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Project / Work Name</span>
            <p className="font-bold text-slate-900 mt-0.5">{bill.projects?.name || 'Project Site'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Executing Agency / Dept</span>
            <p className="font-bold text-slate-900 mt-0.5">{bill.projects?.agency_name || 'Public Works'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Bill Number &amp; Type</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">
              {bill.bill_number} <span className="font-sans font-normal text-slate-500 text-[11px]">({bill.bill_type || 'running'})</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Submission Date</span>
            <p className="font-semibold text-slate-900 mt-0.5">{formatDate(bill.submission_date)}</p>
          </div>
        </div>

        {/* Measurement Book (MB) Reference Citations */}
        <div className="mt-3 pt-3 border-t border-dashed border-slate-300 bg-slate-50/80 -mx-6 px-6 py-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-900 flex items-center gap-1">
              Measurement Book No.
            </span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">
              {bill.mb_number ? `MB #${bill.mb_number}` : 'e-MB Registered'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-900">MB Page Range</span>
            <p className="font-mono font-semibold text-slate-900 mt-0.5">
              {bill.mb_page_start ? `Pages ${bill.mb_page_start} to ${bill.mb_page_end || bill.mb_page_start}` : 'Electronic Records'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-900">Date of Measurement</span>
            <p className="font-semibold text-slate-900 mt-0.5">
              {bill.measurement_date ? formatDate(bill.measurement_date) : formatDate(bill.submission_date)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-900">Measuring Officer</span>
            <p className="font-semibold text-slate-900 mt-0.5">
              {bill.measuring_officer_name ? (
                <>
                  {bill.measuring_officer_name} <span className="text-slate-500 font-normal text-[11px]">({bill.measuring_officer_designation || 'JE'})</span>
                </>
              ) : (
                'Junior Engineer (Civil)'
              )}
            </p>
          </div>
        </div>

        {/* Final Bill DLP Details */}
        {isFinal && (
          <div className="mt-3 pt-2.5 border-t border-amber-300 bg-amber-100/60 -mx-6 px-6 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-950">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900">Actual Date of Completion:</span>
              <p className="font-bold mt-0.5">{bill.actual_completion_date ? formatDate(bill.actual_completion_date) : 'Completed'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900">Defect Liability Period (DLP):</span>
              <p className="font-bold mt-0.5">{bill.dlp_months || 12} Calendar Months</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900">Retention Release Milestone:</span>
              <p className="font-mono font-bold mt-0.5 text-emerald-900">
                {dlpReleaseDate ? formatDate(dlpReleaseDate) : 'Upon Completion of DLP'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Account I: Schedule of Quantities Executed (CPWA Form 26) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
            Account I — Items of Work Executed (Schedule of Rates &amp; Quantities)
          </h3>
          <span className="text-[10px] font-semibold text-slate-500">
            CPWA Form 26 (Page 1)
          </span>
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-12">Item</th>
                <th className="p-2 border-r border-slate-300">Description of Work (Tender Item)</th>
                <th className="p-2 border-r border-slate-300 text-center w-14">Unit</th>
                <th className="p-2 border-r border-slate-300 text-right w-20">Awarded Rate</th>
                <th className="p-2 border-r border-slate-300 text-right w-20">Previous Qty</th>
                <th className="p-2 border-r border-slate-300 text-right w-20">Current Qty</th>
                <th className="p-2 border-r border-slate-300 text-right w-20">Total Up to Date</th>
                <th className="p-2 border-r border-slate-300 text-right w-24">Current Amount</th>
                <th className="p-2 text-right w-24">Cumulative Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-400">
                    No individual measurement book items recorded for this bill. Gross work value certified per sanction: {formatINR(workCertifiedMeasured)}
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                      {it.boq_items?.item_number || `${idx + 1}`}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-800">
                      <p className="font-medium">{it.boq_items?.description || 'Item of work'}</p>
                      {onViewSupportingMeasurements && (
                        <button
                          type="button"
                          onClick={() => onViewSupportingMeasurements(it)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors print:hidden"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Supporting Measurements
                        </button>
                      )}
                      {it.remarks && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">Note: {it.remarks}</p>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center uppercase text-slate-600 font-medium">
                      {it.boq_items?.unit || 'Nos'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right tabular-nums text-slate-700">
                      ₹{Number(it.rate).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right tabular-nums text-slate-600">
                      {Number(it.previous_quantity).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right tabular-nums font-bold text-slate-900">
                      {Number(it.current_quantity).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right tabular-nums font-semibold text-slate-800">
                      {Number(it.cumulative_quantity).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right tabular-nums font-semibold text-slate-900">
                      {formatINR(it.current_amount)}
                    </td>
                    <td className="p-2 text-right tabular-nums font-bold text-slate-900">
                      {formatINR(it.cumulative_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td colSpan={7} className="p-2 border-r border-slate-300 text-right uppercase tracking-wider text-[10px]">
                  Total Work Value Certified (e-MB Abstract)
                </td>
                <td className="p-2 border-r border-slate-300 text-right tabular-nums text-slate-900">
                  {formatINR(totalCurrentAmount || bill.work_certified_amount)}
                </td>
                <td className="p-2 text-right tabular-nums text-slate-900">
                  {formatINR(totalCumulativeAmount || workCertifiedMeasured)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Account II: Certificates of Measurement */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2">
        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">
          Account II — Certificates of Measurement (CPWA Form 26 / CPWD Manual)
        </h3>
        <div className="space-y-1.5 text-slate-700 leading-relaxed text-[11px]">
          <p>
            <strong>1. Certificate of Execution:</strong> Certified that the whole of the work mentioned in this bill was done under my supervision and that the quantities entered in Measurement Book No.{' '}
            <strong className="font-mono text-slate-900">{bill.mb_number || 'e-MB'}</strong> at pages{' '}
            <strong className="font-mono text-slate-900">{bill.mb_page_start ? `${bill.mb_page_start} to ${bill.mb_page_end || bill.mb_page_start}` : 'recorded electronically'}</strong> have been correctly recorded and test-checked.
          </p>
          <p>
            <strong>2. Certificate of Specification:</strong> Certified that the materials and workmanship conform to approved CPWD/PWD specifications and contract drawings, and rates billed are strictly per awarded contract agreement.
          </p>
          {isFinal && (
            <p className="text-amber-900 font-medium bg-amber-100/70 p-2 rounded border border-amber-200">
              <strong>3. Final Settlement Certificate:</strong> Certified that no further claims or bills remain outstanding against the executing department for this contract, and that all departmental stores have been fully recovered.
            </p>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Account III: Memorandum of Payments (CPWA Form 26 Official Audit) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mb-6 border border-slate-300 rounded-lg overflow-hidden">
        <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider">
            Account III — Memorandum of Payments (CPWA Form 26 / 27-B)
          </h3>
          <span className="font-mono text-[10px] text-slate-300">
            (1 + 2) - 5 - 7 - 8(a) - 8(b) = 8(c)
          </span>
        </div>

        <table className="w-full text-xs text-left">
          <tbody className="divide-y divide-slate-200">
            {/* Item 1: Measured work */}
            <tr className="bg-white">
              <td className="p-2 font-mono font-bold text-slate-700 w-16">Item 1</td>
              <td className="p-2 text-slate-800">
                Total value of work actually measured up to date (as per Account I, Entry A)
              </td>
              <td className="p-2 text-right font-mono font-semibold text-slate-900 w-36">
                {formatINR(workCertifiedMeasured)}
              </td>
            </tr>

            {/* Item 2: Unmeasured work advance */}
            {unmeasuredAdvance > 0 && (
              <tr className="bg-slate-50/60">
                <td className="p-2 font-mono font-bold text-emerald-700">Item 2</td>
                <td className="p-2 text-slate-800">
                  Total advance payments for work not yet measured (On-account advance)
                </td>
                <td className="p-2 text-right font-mono font-semibold text-emerald-700">
                  (+) {formatINR(unmeasuredAdvance)}
                </td>
              </tr>
            )}

            {/* Total (1 + 2) */}
            <tr className="bg-slate-100 font-semibold text-slate-900">
              <td className="p-2 font-mono font-bold">Total</td>
              <td className="p-2">Total Gross Work Value Passed to Date (Items 1 + 2) [A]</td>
              <td className="p-2 text-right font-mono font-bold">
                {formatINR(workCertifiedMeasured + unmeasuredAdvance)}
              </td>
            </tr>

            {/* Item 5: Retention */}
            <tr className="bg-white">
              <td className="p-2 font-mono font-bold text-red-600">Item 5</td>
              <td className="p-2 text-slate-800">
                Deduct: Amount withheld as Security Deposit / Retention ({bill.retention_percentage || 5}%)
                {bill.bg_offset_amount && Number(bill.bg_offset_amount) > 0 && (
                  <span className="block text-[10px] text-emerald-700 font-medium">
                    (Offset with Bank Guarantee under CPWD GCC Clause 1A: {formatINR(Number(bill.bg_offset_amount))})
                  </span>
                )}
                {isFinal && (
                  <span className="block text-[10px] text-slate-500">
                    Held until Defect Liability Period ({bill.dlp_months || 12}M) expiry: {dlpReleaseDate ? formatDate(dlpReleaseDate) : 'DLP release'}
                  </span>
                )}
              </td>
              <td className="p-2 text-right font-mono font-semibold text-red-600">
                (-) {formatINR(retentionAmt)}
              </td>
            </tr>

            {/* Item 7: Previous payments */}
            {isCumulative && prevReceived > 0 && (
              <tr className="bg-white">
                <td className="p-2 font-mono font-bold text-slate-700">Item 7</td>
                <td className="p-2 text-slate-800">
                  Deduct: Total payments already made as per previous running bills
                </td>
                <td className="p-2 text-right font-mono font-semibold text-slate-700">
                  (-) {formatINR(prevReceived)}
                </td>
              </tr>
            )}

            {/* Item 8(a): Departmental Store Recoveries */}
            {totalDepartmentalRecoveries > 0 && (
              <tr className="bg-amber-50/50">
                <td className="p-2 font-mono font-bold text-amber-800">Item 8(a)</td>
                <td className="p-2 text-slate-800">
                  Deduct: Departmental Store Recoveries creditable to this work (CPWA Form 35-A):
                  <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                    {cementRec > 0 && <div>· Cement Recovery (Store Issue): {formatINR(cementRec)}</div>}
                    {steelRec > 0 && <div>· Steel Recovery (Store Issue): {formatINR(steelRec)}</div>}
                    {otherMatRec > 0 && <div>· Other Material / Plant &amp; Equipment: {formatINR(otherMatRec)}</div>}
                  </div>
                </td>
                <td className="p-2 text-right font-mono font-semibold text-amber-800 align-top">
                  (-) {formatINR(totalDepartmentalRecoveries)}
                </td>
              </tr>
            )}

            {/* Item 8(b): Statutory Deductions & Recoveries */}
            {(totalStatutoryTaxes > 0 || totalOtherRecoveries > 0) && (
              <tr className="bg-slate-50/70">
                <td className="p-2 font-mono font-bold text-slate-700">Item 8(b)</td>
                <td className="p-2 text-slate-800">
                  Deduct: Statutory Audit &amp; Departmental Tax Recoveries:
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {itTds > 0 && (
                      <div>
                        · IT-TDS u/s 194C ({bill.it_tds_percentage || 2}%): <strong className="text-slate-900">{formatINR(itTds)}</strong>
                      </div>
                    )}
                    {gstTds > 0 && (
                      <div>
                        · GST-TDS u/s 51 ({bill.gst_tds_percentage || 2}%): <strong className="text-slate-900">{formatINR(gstTds)}</strong>
                      </div>
                    )}
                    {labourCess > 0 && (
                      <div>
                        · BOCW Labour Cess ({bill.labour_cess_percentage || 1}%): <strong className="text-slate-900">{formatINR(labourCess)}</strong>
                      </div>
                    )}
                    {royalty > 0 && (
                      <div>
                        · Royalty / Mineral Recovery: <strong className="text-slate-900">{formatINR(royalty)}</strong>
                      </div>
                    )}
                    {mobAdv > 0 && (
                      <div>
                        · Mobilization Advance Recovery: <strong className="text-slate-900">{formatINR(mobAdv)}</strong>
                      </div>
                    )}
                    {withheld > 0 && (
                      <div>
                        · Temporary Withheld Amount: <strong className="text-slate-900">{formatINR(withheld)}</strong>
                      </div>
                    )}
                    {customDeds.map((d, i) => (
                      <div key={i}>
                        · {d.deduction_label}: <strong className="text-slate-900">{formatINR(Number(d.deduction_amount) || 0)}</strong>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-2 text-right font-mono font-semibold text-red-600 align-top">
                  (-) {formatINR(totalStatutoryTaxes + totalOtherRecoveries)}
                </td>
              </tr>
            )}

            {/* Total Deductions Summary Row */}
            <tr className="bg-rose-50/50 font-semibold text-slate-800 border-t border-slate-200">
              <td className="p-2 font-mono font-bold text-rose-800">Total [B]</td>
              <td className="p-2 text-slate-900">
                Total Statutory &amp; Departmental Deductions (Items 5 + 8a + 8b)
              </td>
              <td className="p-2 text-right font-mono font-bold text-rose-800">
                (-) {formatINR(totalAllDeductions)}
              </td>
            </tr>

            {/* Item 8(c): Net Amount Payable */}
            <tr className="bg-blue-50/90 font-bold text-slate-900 border-t-2 border-slate-400">
              <td className="p-2.5 font-mono text-blue-900 text-sm">Item 8(c)</td>
              <td className="p-2.5 text-blue-950">
                <div>
                  <span className="text-sm font-black">Net Passed for Payment [A - B]</span>
                  <span className="block text-[11px] font-normal text-blue-900">
                    Passed for Cheque / PFMS / Treasury RTGS Disbursement
                  </span>
                </div>
              </td>
              <td className="p-2.5 text-right font-mono text-base text-blue-950 font-black">
                {formatINR(netPayable)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Verification Block (Official 4-Tier CPWD/PWD Format) */}
      <div className="border-t-2 border-slate-900 pt-6 mt-8 grid grid-cols-4 gap-4 text-center text-xs">
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Signature of Contractor</span>
          </div>
          <p className="font-bold text-slate-900">Contractor / Firm Signatory</p>
          <p className="text-[10px] text-slate-500">{organization?.name || 'Authorized Agency'}</p>
        </div>

        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">
              {bill.measuring_officer_name || 'Signature of JE'}
            </span>
          </div>
          <p className="font-bold text-slate-900">Junior Engineer (JE)</p>
          <p className="text-[10px] text-slate-500">
            {bill.measuring_officer_name ? `${bill.measuring_officer_name} (${bill.measuring_officer_designation || 'JE'})` : 'Measuring Officer'}
          </p>
        </div>

        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Signature of AE</span>
          </div>
          <p className="font-bold text-slate-900">Assistant Engineer (AE)</p>
          <p className="text-[10px] text-slate-500">50% Value Test-Checked</p>
        </div>

        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">Signature of EE / DDO</span>
          </div>
          <p className="font-bold text-slate-900">Executive Engineer (EE)</p>
          <p className="text-[10px] text-slate-500">Certified &amp; Passed for Payment</p>
        </div>
      </div>
    </div>
  )
}
