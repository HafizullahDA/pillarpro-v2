'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { ContractVariation, VariationStatus } from '@/lib/types/variations'
import { VariationStatusBadge } from './VariationStatusBadge'
import { VariationTypeBadge } from './VariationTypeBadge'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface Props {
  variation: ContractVariation | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updated: ContractVariation) => void
  onPrint: (variation: ContractVariation) => void
}

export function VariationDetailModal({
  variation,
  isOpen,
  onClose,
  onUpdate,
  onPrint,
}: Props) {
  const toast = useToast()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [showSanctionForm, setShowSanctionForm] = useState(false)

  // Sanction form inputs
  const [sanctionStatus, setSanctionStatus] = useState<VariationStatus>(
    variation?.status || 'APPROVED'
  )
  const [approvedAuthority, setApprovedAuthority] = useState(
    variation?.approved_authority || 'Superintending Engineer, PWD'
  )
  const [approvedOrderNumber, setApprovedOrderNumber] = useState(
    variation?.approved_order_number || `VO-SANC-${new Date().getFullYear()}-01`
  )
  const [approvalDate, setApprovalDate] = useState(
    variation?.approval_date || new Date().toISOString().split('T')[0]
  )
  const [approvedQuantity, setApprovedQuantity] = useState<number>(
    variation?.approved_quantity || variation?.proposed_quantity || 0
  )
  const [approvedRate, setApprovedRate] = useState<number>(
    variation?.approved_rate || variation?.proposed_rate || 0
  )
  const [approvedAmount, setApprovedAmount] = useState<number>(
    variation?.approved_amount || variation?.proposed_amount || 0
  )

  if (!isOpen || !variation) return null

  const handleSaveSanction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        status: sanctionStatus,
        approved_authority: approvedAuthority.trim(),
        approved_order_number: approvedOrderNumber.trim(),
        approval_date: approvalDate,
        approved_quantity: approvedQuantity,
        approved_rate: approvedRate,
        approved_amount: approvedAmount,
      }

      const { data, error } = await supabase
        .from('contract_variations')
        .update(payload)
        .eq('id', variation.id)
        .select(
          '*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)'
        )
        .single()

      if (error) throw error

      toast.success('Department sanction status updated.')
      onUpdate(data)
      setShowSanctionForm(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sanction status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <VariationTypeBadge type={variation.type} />
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono">
                {variation.reference_number}
              </h2>
              <p className="text-xs text-slate-500">
                {variation.projects?.name || 'Project Variation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VariationStatusBadge status={variation.status} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Comparison Matrix */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/75 px-3 py-2 font-bold text-[11px] text-slate-700 uppercase tracking-wider">
              Quantities &amp; Rates Comparison (Original vs Proposed vs Sanctioned)
            </div>
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px]">
                <tr>
                  <th className="p-2.5">Stage</th>
                  <th className="p-2.5 text-right">Quantity</th>
                  <th className="p-2.5 text-right">Rate (₹)</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700 font-sans">1. Original Tender Baseline</td>
                  <td className="p-2.5 text-right">{variation.original_quantity} {variation.proposed_unit}</td>
                  <td className="p-2.5 text-right">{formatINR(variation.original_rate)}</td>
                  <td className="p-2.5 text-right">{formatINR(variation.original_quantity * variation.original_rate)}</td>
                </tr>
                <tr className="bg-amber-50/40">
                  <td className="p-2.5 font-semibold text-amber-900 font-sans">
                    2. Proposed by Contractor
                    <span className="text-[10px] text-amber-700 block font-normal">
                      Diff: {variation.difference_quantity > 0 ? '+' : ''}{variation.difference_quantity} {variation.proposed_unit}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-900">{variation.proposed_quantity} {variation.proposed_unit}</td>
                  <td className="p-2.5 text-right">{formatINR(variation.proposed_rate)}</td>
                  <td className="p-2.5 text-right font-bold text-amber-900">
                    {variation.is_deletion ? '-' : '+'}{formatINR(Math.abs(variation.proposed_amount))}
                  </td>
                </tr>
                <tr className="bg-emerald-50/40">
                  <td className="p-2.5 font-semibold text-emerald-900 font-sans">
                    3. Sanctioned by Department
                    {variation.approved_order_number && (
                      <span className="text-[10px] text-emerald-700 block font-normal">
                        Order: {variation.approved_order_number}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-bold text-emerald-900">{variation.approved_quantity} {variation.proposed_unit}</td>
                  <td className="p-2.5 text-right">{formatINR(variation.approved_rate)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-900">
                    {variation.is_deletion ? '-' : '+'}{formatINR(Math.abs(variation.approved_amount))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Work Realization */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Site Executed (e-MB)</span>
              <span className="font-bold text-slate-900">{variation.executed_quantity} {variation.proposed_unit}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Billed in RA Bills</span>
              <span className="font-bold text-slate-900">{variation.billed_quantity} {variation.proposed_unit}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Disbursed Amount</span>
              <span className="font-bold text-emerald-700">{formatINR(variation.paid_amount)}</span>
            </div>
          </div>

          {/* Description & Technical Justification */}
          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                Item Description &amp; Technical Specification
              </span>
              <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 whitespace-pre-line">
                {variation.proposed_item_description}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                Contractual Justification / Reason
              </span>
              <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 whitespace-pre-line">
                {variation.reason}
              </p>
            </div>
          </div>

          {/* Authority & References */}
          <div className="grid grid-cols-2 gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Instructing Authority</span>
              <span className="font-semibold text-slate-900">{variation.instruction_authority}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Instruction Date</span>
              <span className="font-semibold text-slate-900">{formatDate(variation.instruction_date)}</span>
            </div>
            {variation.site_instruction_reference && (
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Site Instruction Ref</span>
                <span className="font-mono text-slate-900">{variation.site_instruction_reference}</span>
              </div>
            )}
            {variation.supporting_document_url && (
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Supporting Document</span>
                <a
                  href={variation.supporting_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-mono"
                >
                  View Attachment &rarr;
                </a>
              </div>
            )}
          </div>


          {/* UNIFIED RELATED RECORDS PANEL */}
          <RelatedRecordsPanel
            title="Traceable Related Records (Variation Audit Trail)"
            records={[
              ...(variation.original_boq_item_id ? [{
                id: variation.original_boq_item_id,
                type: 'boq' as const,
                title: variation.boq_items?.description ? `BOQ Item ${variation.boq_items.item_number}: ${variation.boq_items.description.slice(0, 45)}...` : `BOQ Item ${variation.original_boq_item_id.slice(0, 8)}`,
                subtitle: `Tender Qty: ${variation.original_quantity} ${variation.proposed_unit} @ ₹${variation.original_rate}`,
                referenceNumber: variation.boq_items?.item_number,
                href: `/projects/${variation.project_id}/boq/${variation.original_boq_item_id}`,
              }] : []),
              {
                id: variation.project_id,
                type: 'project' as const,
                title: variation.projects?.name || 'Project Master Record',
                href: `/projects/${variation.project_id}`,
              },
              ...(variation.contract_id ? [{
                id: variation.contract_id,
                type: 'contract' as const,
                title: variation.contracts?.agreement_number ? `Agreement: ${variation.contracts.agreement_number}` : 'Contract Master',
                subtitle: variation.contracts?.contract_title || undefined,
                referenceNumber: variation.contracts?.agreement_number || undefined,
                href: `/projects/${variation.project_id}/contract`,
              }] : []),
              {
                id: `meas-${variation.id}`,
                type: 'measurement' as const,
                title: 'e-MB Measurements Under Variation',
                subtitle: `Executed realization: ${variation.executed_quantity} ${variation.proposed_unit}`,
                status: 'e-MB',
                href: `/measurement?projectId=${variation.project_id}`,
              },
              {
                id: `ra-${variation.id}`,
                type: 'ra_bill' as const,
                title: 'RA Bills Realization',
                subtitle: `Billed realization: ${variation.billed_quantity} ${variation.proposed_unit}`,
                status: 'RA BILL',
                href: `/ledgers/ra-bills?projectId=${variation.project_id}`,
              },
              {
                id: `clm-${variation.id}`,
                type: 'claim' as const,
                title: 'Contractual Claims & Disputes',
                subtitle: 'Dispute & damage compensation records',
                status: 'DISPUTE',
                href: `/claims?projectId=${variation.project_id}`,
              },
              ...(variation.supporting_document_url ? [{
                id: `doc-${variation.id}`,
                type: 'evidence' as const,
                title: 'Supporting Document / Order Attachment',
                subtitle: 'Contemporaneous proof record',
                href: variation.supporting_document_url,
              }] : []),
            ]}
          />

          {/* Record Department Sanction Drawer / Form */}
          {showSanctionForm ? (
            <form onSubmit={handleSaveSanction} className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  Record Department Sanction Order
                </span>
                <button
                  type="button"
                  onClick={() => setShowSanctionForm(false)}
                  className="text-emerald-700 font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Approval Status
                  </label>
                  <select
                    value={sanctionStatus}
                    onChange={e => setSanctionStatus(e.target.value as VariationStatus)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900 font-bold"
                  >
                    <option value="UNDER_APPROVAL">UNDER_APPROVAL</option>
                    <option value="APPROVED">APPROVED (Official Sanction)</option>
                    <option value="REJECTED">REJECTED (Disallowed)</option>
                    <option value="EXECUTED">EXECUTED</option>
                    <option value="BILLED">BILLED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanction Authority
                  </label>
                  <input
                    type="text"
                    value={approvedAuthority}
                    onChange={e => setApprovedAuthority(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanction Order Number
                  </label>
                  <input
                    type="text"
                    value={approvedOrderNumber}
                    onChange={e => setApprovedOrderNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanction Date
                  </label>
                  <input
                    type="date"
                    value={approvalDate}
                    onChange={e => setApprovalDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanctioned Qty
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={approvedQuantity}
                    onChange={e => setApprovedQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanctioned Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={approvedRate}
                    onChange={e => setApprovedRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Sanctioned Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-emerald-900"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowSanctionForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Sanction Record'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Department Approval Workflow
                </span>
                <span className="text-[11px] text-slate-500">
                  Record official variation order or SE technical sanction details
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSanctionForm(true)}
              >
                Record Department Sanction
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPrint(variation)}
            className="flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print Variation Order (VO)</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
