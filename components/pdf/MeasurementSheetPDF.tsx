'use client'
/* eslint-disable @next/next/no-img-element */

import { formatINR, formatDate } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'
import { RABillRow } from '@/app/(app)/ra-bills/RABillsClient'
import { RABillItem } from '@/lib/types/boq'

interface MeasurementSheetPDFProps {
  bill: RABillRow
  items: RABillItem[]
  organization?: OrganizationProfile
}

export function MeasurementSheetPDF({
  bill,
  items,
  organization,
}: MeasurementSheetPDFProps) {
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const totalCurrentAmount = items.reduce(
    (acc, it) => acc + (Number(it.current_amount) || 0),
    0
  )
  const totalCumulativeAmount = items.reduce(
    (acc, it) => acc + (Number(it.cumulative_amount) || 0),
    0
  )

  return (
    <div className="text-slate-900 font-sans leading-relaxed bg-white p-6 max-w-5xl mx-auto">
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
                {organization?.address && (
                  <span>· {organization.address}</span>
                )}
              </div>
              <h2 className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-2">
                CPWD / PWD Standard Form 26 — Abstract of Quantities & Measurement Sheet (e-MB)
              </h2>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p><strong>Print Date:</strong> {generatedAt}</p>
            <p className="font-mono text-[11px] text-slate-400">Bill Ref: {bill.bill_number}</p>
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
            <span className="text-[10px] uppercase font-bold text-slate-500">Running Account Bill</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{bill.bill_number}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Measurement Date</span>
            <p className="font-semibold text-slate-900 mt-0.5">{formatDate(bill.submission_date)}</p>
          </div>
        </div>
      </div>

      {/* Measurement Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2 border-r border-slate-300 text-center w-12">Item No</th>
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
                  No individual measurement book items recorded for this bill.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                    {it.boq_items?.item_number || `${idx + 1}`}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-800">
                    <p className="font-medium">{it.boq_items?.description || 'Item of work'}</p>
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
                {formatINR(totalCumulativeAmount || (bill.cumulative_certified_amount ?? bill.work_certified_amount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Statutory Deductions & Net Payable Summary */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-8">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">
            Audit & Deductions Abstract
          </p>
          <div className="space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Gross Work Value (This Bill):</span>
              <span className="font-semibold text-slate-900">{formatINR(bill.work_certified_amount)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Retention Money ({bill.retention_percentage}%):</span>
              <span className="font-semibold">(-) {formatINR(bill.retention_amount)}</span>
            </div>
            {bill.tds_deducted != null && bill.tds_deducted > 0 && (
              <div className="flex justify-between text-red-600">
                <span>IT-TDS:</span>
                <span className="font-semibold">(-) {formatINR(bill.tds_deducted)}</span>
              </div>
            )}
            {bill.gst_tds_deducted != null && bill.gst_tds_deducted > 0 && (
              <div className="flex justify-between text-red-600">
                <span>GST-TDS:</span>
                <span className="font-semibold">(-) {formatINR(bill.gst_tds_deducted)}</span>
              </div>
            )}
            {bill.labour_cess_deducted != null && bill.labour_cess_deducted > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Labour Welfare Cess (1%):</span>
                <span className="font-semibold">(-) {formatINR(bill.labour_cess_deducted)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
          <div>
            <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">
              Net Certified Payable
            </p>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Net Passed For Payment:</span>
                <span className="text-base font-bold text-slate-900">
                  {formatINR(bill.net_payable_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount Received Till Date:</span>
                <span className="font-semibold text-emerald-700">{formatINR(bill.amount_received)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-800">Outstanding Balance:</span>
                <span className="font-bold text-amber-700">{formatINR(bill.outstanding_balance)}</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Disbursement Mode: {bill.projects?.agency_name?.toLowerCase().includes('pwd') ? 'State Treasury' : bill.projects?.agency_name?.toLowerCase().includes('cpwd') ? 'PFMS Credit' : 'Corporate Finance RTGS'}
          </p>
        </div>
      </div>

      {/* Signature Verification Block (Standard CPWD/PWD Format) */}
      <div className="border-t border-slate-200 pt-8 mt-10 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-2"></div>
          <p className="font-bold text-slate-900">Contractor / Authorised Signatory</p>
          <p className="text-[10px] text-slate-500">{organization?.name || 'Contractor Firm'}</p>
        </div>

        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-2"></div>
          <p className="font-bold text-slate-900">Site Engineer / Junior Engineer</p>
          <p className="text-[10px] text-slate-500">Measurements Recorded in e-MB</p>
        </div>

        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-2"></div>
          <p className="font-bold text-slate-900">Assistant / Executive Engineer</p>
          <p className="text-[10px] text-slate-500">Checked & Passed for Payment</p>
        </div>
      </div>
    </div>
  )
}

