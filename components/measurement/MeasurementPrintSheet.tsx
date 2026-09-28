'use client'

import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import {
  MeasurementAbstractItem,
  MeasurementBook,
  MeasurementEntry,
} from '@/lib/types/measurement'

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

  const totalAbstractValue = abstractItems.reduce((acc, i) => acc + i.cumulative_amount, 0)
  const totalCertifiedValue = abstractItems.reduce((acc, i) => acc + i.certified_amount, 0)

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4 md:p-8 flex justify-center items-start">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden print:shadow-none print:m-0 print:p-0">
        {/* Action bar (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {mode === 'abstract' ? 'Abstract of Measurements' : 'e-MB Measurement Register Sheet'}
            </span>
            <span className="text-xs text-slate-400">| CPWD / State PWD Standard Format</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handlePrint} className="bg-white text-slate-900">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
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
              {mode === 'abstract' ? 'ABSTRACT OF MEASUREMENTS & QUANTITY LEDGER' : 'DETAILED MEASUREMENT REGISTER'}
            </h2>
            <div className="grid grid-cols-2 text-left mt-4 text-[11px] gap-2 pt-2 border-t border-slate-200">
              <div>
                <p><span className="font-semibold">Work / Project:</span> {project.name}</p>
                <p><span className="font-semibold">Department / Agency:</span> {project.agency_name || 'Government Department'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Measurement Book No:</span> {measurementBook?.book_number || 'Consolidated MB'}</p>
                <p><span className="font-semibold">Date of Generation:</span> {new Date().toLocaleDateString('en-IN')}</p>
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
              <table className="w-full border-collapse border border-slate-800 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    <th className="border border-slate-800 p-1.5 text-center w-10">Entry #</th>
                    <th className="border border-slate-800 p-1.5 text-center w-20">Date</th>
                    <th className="border border-slate-800 p-1.5 text-left">Item &amp; Description</th>
                    <th className="border border-slate-800 p-1.5 text-left w-24">Location / Ch.</th>
                    <th className="border border-slate-800 p-1.5 text-center w-12">Nos</th>
                    <th className="border border-slate-800 p-1.5 text-right w-14">L (m)</th>
                    <th className="border border-slate-800 p-1.5 text-right w-14">B (m)</th>
                    <th className="border border-slate-800 p-1.5 text-right w-14">D/H (m)</th>
                    <th className="border border-slate-800 p-1.5 text-right w-20">Qty</th>
                    <th className="border border-slate-800 p-1.5 text-center w-14">Unit</th>
                    <th className="border border-slate-800 p-1.5 text-center w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td className="border border-slate-800 p-1.5 text-center font-mono font-semibold">{entry.entry_number}</td>
                      <td className="border border-slate-800 p-1.5 text-center">{formatDate(entry.measurement_date)}</td>
                      <td className="border border-slate-800 p-1.5">
                        <span className="font-bold">{entry.boq_items?.item_number}: </span>
                        <span>{entry.description}</span>
                      </td>
                      <td className="border border-slate-800 p-1.5">{entry.location || '—'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono">{entry.number_of_units || 1}</td>
                      <td className="border border-slate-800 p-1.5 text-right font-mono">{entry.length || '—'}</td>
                      <td className="border border-slate-800 p-1.5 text-right font-mono">{entry.breadth || '—'}</td>
                      <td className="border border-slate-800 p-1.5 text-right font-mono">{entry.depth_height || '—'}</td>
                      <td className="border border-slate-800 p-1.5 text-right font-mono font-bold">{entry.calculated_quantity}</td>
                      <td className="border border-slate-800 p-1.5 text-center">{entry.unit}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-semibold text-[10px]">{entry.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Statutory Sign-off signatures */}
          <div className="grid grid-cols-3 gap-6 pt-16 mt-8 border-t border-slate-300 text-center text-[11px]">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Recorded By</div>
              <div className="text-slate-500">Junior Engineer / Site Surveyor</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Checked By</div>
              <div className="text-slate-500">Assistant Engineer / Project In-Charge</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">Accepted &amp; Certified By</div>
              <div className="text-slate-500">Executive Engineer / Authorized Officer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
