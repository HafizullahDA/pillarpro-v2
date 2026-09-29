'use client'

import { formatINR, formatDate } from '@/lib/format'
import { ContractVariation, VARIATION_TYPE_CONFIG } from '@/lib/types/variations'
import { Button } from '@/components/ui/Button'

interface Props {
  variation: ContractVariation | null
  isOpen: boolean
  onClose: () => void
}

export function VariationPrintOrderModal({ variation, isOpen, onClose }: Props) {
  if (!isOpen || !variation) return null

  const typeConfig = VARIATION_TYPE_CONFIG[variation.type]
  const diffQty = Number(variation.difference_quantity)
  const isAddition = diffQty >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <span className="font-bold text-slate-800 text-sm">
            Formal Variation Order Preview
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-blue-600 text-white font-bold"
            >
              🖨️ Print / Save as PDF
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-900 font-sans print:p-0 text-xs">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block">
              Government of India / State Public Works Department
            </span>
            <h1 className="text-lg font-black tracking-tight uppercase">
              Formal Variation / Deviation Order
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              Issued under Clause 12 of General Conditions of Contract ({typeConfig.clauseRef})
            </p>
          </div>

          {/* Contract Particulars */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded text-[11px]">
            <div>
              <span className="text-slate-500 block">Project:</span>
              <span className="font-bold text-slate-900">{variation.projects?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Agreement Number:</span>
              <span className="font-bold text-slate-900 font-mono">
                {variation.contracts?.agreement_number || 'Under Main Contract'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Variation Order No:</span>
              <span className="font-bold text-slate-900 font-mono">
                {variation.approved_order_number || variation.reference_number}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Order Date:</span>
              <span className="font-bold text-slate-900">
                {formatDate(variation.approval_date || variation.instruction_date)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Instructing Authority:</span>
              <span className="font-semibold text-slate-900">{variation.instruction_authority}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Classification:</span>
              <span className="font-bold text-slate-900">
                {typeConfig.label} ({variation.type})
              </span>
            </div>
          </div>

          {/* Variation Schedule Table */}
          <div className="space-y-1">
            <span className="font-bold text-xs uppercase tracking-wider block">
              Schedule of Varied Quantities &amp; Rates
            </span>
            <table className="w-full border-collapse border border-slate-300 text-left font-mono text-[11px]">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Item No</th>
                  <th className="p-2 border-r border-slate-300 font-sans">Description</th>
                  <th className="p-2 border-r border-slate-300 text-center">Unit</th>
                  <th className="p-2 border-r border-slate-300 text-right">Tender Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Varied Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Diff Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-r border-slate-300 font-bold">
                    {variation.proposed_item_code || variation.boq_items?.item_number || 'EXTRA'}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-sans whitespace-pre-line">
                    {variation.proposed_item_description}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center">{variation.proposed_unit}</td>
                  <td className="p-2 border-r border-slate-300 text-right">{variation.original_quantity}</td>
                  <td className="p-2 border-r border-slate-300 text-right font-bold">
                    {variation.approved_quantity || variation.proposed_quantity}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-bold">
                    {isAddition ? '+' : ''}{diffQty}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right">
                    {formatINR(variation.approved_rate || variation.proposed_rate)}
                  </td>
                  <td className="p-2 text-right font-bold">
                    {isAddition ? '+' : '-'}{formatINR(Math.abs(variation.approved_amount || variation.proposed_amount))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Justification & Reference */}
          <div className="space-y-1">
            <span className="font-bold text-xs uppercase tracking-wider block">
              Contractual Justification &amp; Site Necessity
            </span>
            <p className="border border-slate-300 p-3 rounded text-slate-800 bg-slate-50/50 whitespace-pre-line">
              {variation.reason}
            </p>
          </div>

          {/* Legal Certification */}
          <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-200 pt-3">
            Note: Original BOQ quantities remain undisturbed as the contractual baseline. The quantities and rates sanctioned herein are governed strictly by the provisions of Clause 12 of the Agreement.
          </p>

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
            <div className="border-t border-slate-900 pt-2 space-y-1">
              <span className="font-bold block">Contractor&apos;s Authorized Representative</span>
              <span className="text-[10px] text-slate-500 block">Accepted &amp; Acknowledged</span>
            </div>
            <div className="border-t border-slate-900 pt-2 space-y-1">
              <span className="font-bold block">Executive Engineer / Engineer-in-Charge</span>
              <span className="text-[10px] text-slate-500 block">Public Works Department</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
