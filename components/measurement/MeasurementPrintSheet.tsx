'use client'

import { Fragment } from 'react'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import {
  MeasurementAbstractItem,
  MeasurementBook,
  MeasurementEntry,
} from '@/lib/types/measurement'
import { exportEMBExcelCSV, formatIndianDate } from '@/lib/export/embAndTally'

interface MeasurementPrintSheetProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount: number
  }
  measurementBook?: MeasurementBook | null
  entries: MeasurementEntry[]
  abstractItems: MeasurementAbstractItem[]
  mode: 'register' | 'abstract'
  onClose: () => void
}

export function MeasurementPrintSheet({
  project,
  measurementBook,
  entries,
  abstractItems,
  mode,
  onClose,
}: MeasurementPrintSheetProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    exportEMBExcelCSV({
      project,
      entries,
      books: measurementBook ? [measurementBook] : [],
      abstractItems,
    })
  }

  const totalAbstractValue = abstractItems.reduce((acc, i) => acc + i.cumulative_amount, 0)
  const totalCertifiedValue = abstractItems.reduce((acc, i) => acc + i.certified_amount, 0)

  const totalDetailedAmount = entries.reduce((acc, e) => {
    const rate = Number(e.boq_items?.contract_rate || (e as any).boq_items?.awarded_rate || 0)
    return acc + Number(e.calculated_quantity || 0) * rate
  }, 0)

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4 md:p-8 flex justify-center items-start">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden print:shadow-none print:m-0 print:p-0">
        {/* Action bar (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {mode === 'abstract' ? 'Abstract of Measurements' : 'e-MB Detailed Measurement Register'}
            </span>
            <span className="text-xs text-slate-400">| CPWD / State PWD Standard Format</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel (CSV)
            </Button>
            <Button size="sm" variant="secondary" onClick={handlePrint} className="bg-white text-slate-900 text-xs">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 text-slate-900 text-xs font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight uppercase">ELECTRONIC MEASUREMENT BOOK (e-MB)</h1>
            <h2 className="text-sm font-semibold text-slate-700 mt-1">
              {mode === 'abstract' ? 'ABSTRACT OF MEASUREMENTS & QUANTITY LEDGER' : 'DETAILED MEASUREMENT BOOK & ABSTRACT REGISTER'}
            </h2>
            <div className="grid grid-cols-2 text-left mt-4 text-[11px] gap-2 pt-2 border-t border-slate-200">
              <div>
                <p><span className="font-semibold">Work / Project:</span> {project.name}</p>
                <p><span className="font-semibold">Department / Agency:</span> {project.agency_name || 'Government Department'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Measurement Book No:</span> {measurementBook?.book_number || 'Consolidated MB'}</p>
                <p><span className="font-semibold">Date of Generation:</span> {formatIndianDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {mode === 'abstract' ? (
            /* ABSTRACT TABLE */
            <div>
              <table className="w-full border-collapse border border-slate-800 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    <th className="border border-slate-800 p-2 text-center w-12">Item No</th>
                    <th className="border border-slate-800 p-2 text-left">Description of Item of Work</th>
                    <th className="border border-slate-800 p-2 text-center w-16">Unit</th>
                    <th className="border border-slate-800 p-2 text-right w-20">Contract Qty</th>
                    <th className="border border-slate-800 p-2 text-right w-20">Contract Rate</th>
                    <th className="border border-slate-800 p-2 text-right w-24">Cumulative Measured</th>
                    <th className="border border-slate-800 p-2 text-right w-20">Balance Qty</th>
                    <th className="border border-slate-800 p-2 text-right w-24">Measured Value</th>
                    <th className="border border-slate-800 p-2 text-right w-24">Certified Value</th>
                  </tr>
                </thead>
                <tbody>
                  {abstractItems.map(item => (
                    <tr key={item.boq_item_id} className={item.is_exceeded ? 'bg-rose-50/60' : ''}>
                      <td className="border border-slate-800 p-2 text-center font-bold">{item.item_number}</td>
                      <td className="border border-slate-800 p-2 font-medium">
                        {item.description}
                        {item.is_exceeded && (
                          <span className="block text-[10px] text-rose-700 font-bold uppercase mt-0.5">
                            * Measured exceeds BOQ Quantity (Requires Deviation Order)
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-800 p-2 text-center">{item.unit}</td>
                      <td className="border border-slate-800 p-2 text-right font-mono">{item.contract_quantity}</td>
                      <td className="border border-slate-800 p-2 text-right font-mono">{formatINR(item.contract_rate)}</td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-bold">{item.cumulative_quantity}</td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-bold">
                        <span className={item.balance_quantity < 0 ? 'text-rose-700' : ''}>
                          {item.balance_quantity}
                        </span>
                      </td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-bold">{formatINR(item.cumulative_amount)}</td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-bold text-emerald-800">{formatINR(item.certified_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 font-bold">
                    <td colSpan={7} className="border border-slate-800 p-2 text-right uppercase">Total Abstract Amount:</td>
                    <td className="border border-slate-800 p-2 text-right font-mono">{formatINR(totalAbstractValue)}</td>
                    <td className="border border-slate-800 p-2 text-right font-mono text-emerald-900">{formatINR(totalCertifiedValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* DETAILED REGISTER TABLE */
            <div>
              <table className="w-full border-collapse border border-slate-800 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    <th className="border border-slate-800 p-1 text-center w-14">MB Vol</th>
                    <th className="border border-slate-800 p-1 text-center w-10">Page</th>
                    <th className="border border-slate-800 p-1 text-center w-12">Entry #</th>
                    <th className="border border-slate-800 p-1 text-center w-18">Date</th>
                    <th className="border border-slate-800 p-1 text-left">BOQ Item &amp; Description</th>
                    <th className="border border-slate-800 p-1 text-left w-20">Location / Ch.</th>
                    <th className="border border-slate-800 p-1 text-center w-8">Nos</th>
                    <th className="border border-slate-800 p-1 text-right w-12">L (m)</th>
                    <th className="border border-slate-800 p-1 text-right w-12">B (m)</th>
                    <th className="border border-slate-800 p-1 text-right w-12">D (m)</th>
                    <th className="border border-slate-800 p-1 text-right w-14">Qty</th>
                    <th className="border border-slate-800 p-1 text-center w-10">Unit</th>
                    <th className="border border-slate-800 p-1 text-right w-14">Rate (₹)</th>
                    <th className="border border-slate-800 p-1 text-right w-18">Amount (₹)</th>
                    <th className="border border-slate-800 p-1 text-center w-12">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const mbVol = measurementBook?.book_number || 'MB-01'
                    const pageNo = entry.page_number || 1
                    const rate = Number(entry.boq_items?.contract_rate || (entry as any).boq_items?.awarded_rate || 0)
                    const subRows = Array.isArray(entry.measurement_rows) ? entry.measurement_rows : null
                    const entryAmount = Number(entry.calculated_quantity || 0) * rate

                    if (subRows && subRows.length > 1) {
                      return (
                        <Fragment key={entry.id}>
                          <tr className="bg-slate-100/80 font-semibold">
                            <td className="border border-slate-800 p-1 text-center font-mono">{mbVol}</td>
                            <td className="border border-slate-800 p-1 text-center font-mono">{pageNo}</td>
                            <td className="border border-slate-800 p-1 text-center font-mono">{entry.entry_number}</td>
                            <td className="border border-slate-800 p-1 text-center">{formatIndianDate(entry.measurement_date)}</td>
                            <td colSpan={6} className="border border-slate-800 p-1">
                              <span className="font-bold">{entry.boq_items?.item_number}: </span>
                              <span>{entry.description}</span>
                            </td>
                            <td className="border border-slate-800 p-1 text-right font-mono font-bold">{entry.calculated_quantity}</td>
                            <td className="border border-slate-800 p-1 text-center">{entry.unit}</td>
                            <td className="border border-slate-800 p-1 text-right font-mono">{rate > 0 ? formatINR(rate) : '—'}</td>
                            <td className="border border-slate-800 p-1 text-right font-mono font-bold">{entryAmount > 0 ? formatINR(entryAmount) : '—'}</td>
                            <td className="border border-slate-800 p-1 text-center font-semibold text-[9px]">{entry.status}</td>
                          </tr>
                          {subRows.map((row, rIdx) => {
                            const sign = row.mode === 'deduct' ? -1 : 1
                            const subQty = Number(row.quantity || 0) * sign
                            const subAmt = subQty * rate

                            return (
                              <tr key={`${entry.id}-${row.id || rIdx}`} className={row.mode === 'deduct' ? 'bg-rose-50/70 text-rose-900' : ''}>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px] text-slate-400 font-mono">{mbVol}</td>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px] text-slate-400 font-mono">{pageNo}</td>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px] text-slate-500 font-mono">{entry.entry_number}.{rIdx + 1}</td>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px] text-slate-500">{formatIndianDate(entry.measurement_date)}</td>
                                <td className="border border-slate-800 p-0.5 pl-3 text-[9px]">
                                  <span className="font-semibold text-slate-500 mr-1">{row.mode === 'deduct' ? '[-] Deduct:' : '[+] Add:'}</span>
                                  {row.particulars || '—'}
                                </td>
                                <td className="border border-slate-800 p-0.5 text-[9px] text-slate-600">{entry.location || '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-center font-mono text-[9px]">{row.nos ?? 1}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px]">{row.length ?? '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px]">{row.breadth ?? '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px]">{row.depthHeight ?? '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px] font-semibold">
                                  {row.mode === 'deduct' ? '-' : '+'}{Number(row.quantity || 0).toFixed(3)}
                                </td>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px]">{entry.unit}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px] text-slate-500">{rate > 0 ? formatINR(rate) : '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-right font-mono text-[9px] font-semibold">{subAmt !== 0 ? formatINR(subAmt) : '—'}</td>
                                <td className="border border-slate-800 p-0.5 text-center text-[9px] text-slate-400">—</td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    }

                    return (
                      <tr key={entry.id}>
                        <td className="border border-slate-800 p-1 text-center font-mono">{mbVol}</td>
                        <td className="border border-slate-800 p-1 text-center font-mono">{pageNo}</td>
                        <td className="border border-slate-800 p-1 text-center font-mono font-semibold">{entry.entry_number}</td>
                        <td className="border border-slate-800 p-1 text-center">{formatIndianDate(entry.measurement_date)}</td>
                        <td className="border border-slate-800 p-1">
                          <span className="font-bold">{entry.boq_items?.item_number}: </span>
                          <span>{entry.description}</span>
                        </td>
                        <td className="border border-slate-800 p-1">{entry.location || '—'}</td>
                        <td className="border border-slate-800 p-1 text-center font-mono">{entry.number_of_units || 1}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono">{entry.length || '—'}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono">{entry.breadth || '—'}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono">{entry.depth_height || '—'}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono font-bold">{entry.calculated_quantity}</td>
                        <td className="border border-slate-800 p-1 text-center">{entry.unit}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono">{rate > 0 ? formatINR(rate) : '—'}</td>
                        <td className="border border-slate-800 p-1 text-right font-mono font-bold">{entryAmount > 0 ? formatINR(entryAmount) : '—'}</td>
                        <td className="border border-slate-800 p-1 text-center font-semibold text-[9px]">{entry.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={10} className="border border-slate-800 p-1.5 text-right uppercase">
                      Total Measured Value:
                    </td>
                    <td className="border border-slate-800 p-1.5 text-right font-mono">
                      {entries.reduce((a, b) => a + Number(b.calculated_quantity || 0), 0).toFixed(3)}
                    </td>
                    <td className="border border-slate-800 p-1.5 text-center">—</td>
                    <td className="border border-slate-800 p-1.5 text-right">—</td>
                    <td className="border border-slate-800 p-1.5 text-right font-mono font-bold text-emerald-900">
                      {formatINR(totalDetailedAmount)}
                    </td>
                    <td className="border border-slate-800 p-1.5 text-center">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Statutory Sign-off signatures (Official 4-Tier CPWD/PWD Audit Block) */}
          <div className="grid grid-cols-4 gap-4 pt-16 mt-8 border-t border-slate-300 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Contractor / Site Engineer</div>
              <div className="text-slate-500">Recorded &amp; Billed on Site</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Junior Engineer (JE)</div>
              <div className="text-slate-500">Checked &amp; Recorded in e-MB</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Assistant Engineer (AE)</div>
              <div className="text-slate-500">50% Value Test-Checked</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Executive Engineer (EE)</div>
              <div className="text-slate-500">Certified &amp; Passed for Payment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
