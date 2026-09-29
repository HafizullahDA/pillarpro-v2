'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatINR } from '@/lib/format'
import {
  VariationType,
  VARIATION_TYPE_CONFIG,
  ContractVariation,
} from '@/lib/types/variations'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import { calculateVariationAmount } from '@/lib/calculations/variations'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (variation: ContractVariation) => void
  projects: Array<{ id: string; name: string; awarded_amount?: number | null }>
  contracts: ContractRecord[]
  boqItems: BOQItem[]
  preselectedProjectId?: string
}

export function NewVariationModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
  contracts,
  boqItems,
  preselectedProjectId,
}: Props) {
  const toast = useToast()
  const supabase = createClient()

  const [submitting, setSubmitting] = useState(false)
  const [projectId, setProjectId] = useState<string>(
    preselectedProjectId && preselectedProjectId !== 'all'
      ? preselectedProjectId
      : projects[0]?.id || ''
  )
  const [contractId, setContractId] = useState<string>('')
  const [type, setType] = useState<VariationType>('DEVIATION')
  const [referenceNumber, setReferenceNumber] = useState(
    `VO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  )
  const [instructionAuthority, setInstructionAuthority] = useState(
    'Executive Engineer, CPWD Division-I'
  )
  const [instructionDate, setInstructionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedBoqItemId, setSelectedBoqItemId] = useState<string>('')

  // Item Details
  const [proposedItemCode, setProposedItemCode] = useState('')
  const [proposedItemDescription, setProposedItemDescription] = useState('')
  const [proposedUnit, setProposedUnit] = useState('sqm')
  const [originalQuantity, setOriginalQuantity] = useState<number>(0)
  const [proposedQuantity, setProposedQuantity] = useState<number>(0)
  const [originalRate, setOriginalRate] = useState<number>(0)
  const [proposedRate, setProposedRate] = useState<number>(0)

  // Justification & References
  const [reason, setReason] = useState('')
  const [siteInstructionReference, setSiteInstructionReference] = useState('')
  const [supportingDocumentUrl, setSupportingDocumentUrl] = useState('')
  const [remarks, setRemarks] = useState('')

  // Filter project BOQ items
  const projectBoqItems = useMemo(() => {
    return boqItems.filter(b => b.project_id === projectId)
  }, [boqItems, projectId])

  // Handle BOQ item selection for Deviation / Substituted Item
  const handleBoqItemChange = (itemId: string) => {
    setSelectedBoqItemId(itemId)
    const found = projectBoqItems.find(b => b.id === itemId)
    if (found) {
      const origQty = Number(found.tender_quantity) || 0
      const origRt = Number(found.awarded_rate) || 0
      setOriginalQuantity(origQty)
      setOriginalRate(origRt)
      setProposedUnit(found.unit)
      setProposedItemCode(found.item_number)
      if (!proposedItemDescription) {
        setProposedItemDescription(found.description)
      }
      if (proposedQuantity === 0) {
        setProposedQuantity(origQty)
      }
      if (proposedRate === 0) {
        setProposedRate(origRt)
      }
    }
  }

  // Live Calculation
  const calc = useMemo(() => {
    return calculateVariationAmount(
      type,
      originalQuantity,
      proposedQuantity,
      originalRate,
      proposedRate
    )
  }, [type, originalQuantity, proposedQuantity, originalRate, proposedRate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('Please select a project.')
      return
    }
    if (!referenceNumber.trim()) {
      toast.error('Please enter a variation reference number.')
      return
    }
    if (!proposedItemDescription.trim()) {
      toast.error('Please enter proposed item description.')
      return
    }
    if (!reason.trim()) {
      toast.error('Please provide a contractual reason/justification.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        project_id: projectId,
        contract_id: contractId || null,
        reference_number: referenceNumber.trim(),
        type,
        instruction_date: instructionDate,
        instruction_authority: instructionAuthority.trim(),
        original_boq_item_id: selectedBoqItemId || null,
        proposed_item_code: proposedItemCode.trim() || null,
        proposed_item_description: proposedItemDescription.trim(),
        proposed_unit: proposedUnit.trim(),
        original_quantity: originalQuantity,
        proposed_quantity: proposedQuantity,
        difference_quantity: calc.differenceQuantity,
        original_rate: originalRate,
        proposed_rate: proposedRate,
        proposed_amount: calc.amount,
        is_deletion: calc.isDeletion,
        deleted_work_amount: calc.deletedAmount,
        reason: reason.trim(),
        site_instruction_reference: siteInstructionReference.trim() || null,
        supporting_document_url: supportingDocumentUrl.trim() || null,
        remarks: remarks.trim() || null,
        status: 'PROPOSED',
      }

      const { data, error } = await supabase
        .from('contract_variations')
        .insert(payload)
        .select(
          '*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title), boq_items(id, item_number, description, unit, tender_quantity, awarded_rate)'
        )
        .single()

      if (error) throw error

      toast.success(`Variation proposal ${referenceNumber} registered successfully.`)
      onSuccess(data)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to register variation proposal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              New Variation / Deviation Proposal
            </h2>
            <p className="text-xs text-slate-500">
              Clause 12 variation workflow. Keeps original BOQ baseline immutable.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Project & Contract */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project *
              </label>
              <select
                value={projectId}
                onChange={e => {
                  setProjectId(e.target.value)
                  setSelectedBoqItemId('')
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                required
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contract Master Link
              </label>
              <select
                value={contractId}
                onChange={e => setContractId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- No specific contract / General --</option>
                {contracts
                  .filter(c => !projectId || c.project_id === projectId)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.agreement_number} {c.contract_title ? `- ${c.contract_title}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Type & Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Variation Type *
              </label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as VariationType
                  setType(newType)
                  if (newType === 'EXTRA_ITEM') {
                    setOriginalQuantity(0)
                    setOriginalRate(0)
                    setSelectedBoqItemId('')
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
              >
                <option value="DEVIATION">DEVIATION (Qty Variation on Existing BOQ Item)</option>
                <option value="VARIATION">VARIATION (Scope / Specification Change)</option>
                <option value="EXTRA_ITEM">EXTRA ITEM (New Unscheduled Work Item)</option>
                <option value="SUBSTITUTED_ITEM">SUBSTITUTED ITEM (Replacing Original Item)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reference Number *
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Instruction Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Instruction Authority *
              </label>
              <input
                type="text"
                value={instructionAuthority}
                onChange={e => setInstructionAuthority(e.target.value)}
                placeholder="e.g. Executive Engineer, CPWD"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Instruction Date *
              </label>
              <input
                type="date"
                value={instructionDate}
                onChange={e => setInstructionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Original BOQ Item Link (if applicable) */}
          {type !== 'EXTRA_ITEM' ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Original BOQ Item (Tender Baseline) *
              </label>
              <select
                value={selectedBoqItemId}
                onChange={e => handleBoqItemChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- Select Original Item from Schedule --</option>
                {projectBoqItems.map(item => (
                  <option key={item.id} value={item.id}>
                    Item {item.item_number}: {item.description.slice(0, 70)}... (Tender Qty: {item.tender_quantity} {item.unit} @ ₹{item.awarded_rate})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
              <b>Extra Item Notice:</b> This item does not exist in the original tender schedule of quantities. It will be accounted as a new contractual addition.
            </div>
          )}

          {/* Item Specification & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Proposed Item Code / DSR Ref
              </label>
              <input
                type="text"
                value={proposedItemCode}
                onChange={e => setProposedItemCode(e.target.value)}
                placeholder="e.g. DSR-2021/4.1.3"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit of Measurement *
              </label>
              <input
                type="text"
                value={proposedUnit}
                onChange={e => setProposedUnit(e.target.value)}
                placeholder="e.g. sqm, cum, tonne, metre"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Proposed Item Description / Specification *
            </label>
            <textarea
              value={proposedItemDescription}
              onChange={e => setProposedItemDescription(e.target.value)}
              rows={2}
              placeholder="Describe work specification, grade, brand, thickness, or method of execution..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Quantities & Rates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Original Qty
              </label>
              <input
                type="number"
                step="any"
                value={originalQuantity}
                onChange={e => setOriginalQuantity(Number(e.target.value))}
                disabled={type === 'EXTRA_ITEM'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                Proposed Qty *
              </label>
              <input
                type="number"
                step="any"
                value={proposedQuantity}
                onChange={e => setProposedQuantity(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Original Rate (₹)
              </label>
              <input
                type="number"
                step="any"
                value={originalRate}
                onChange={e => setOriginalRate(Number(e.target.value))}
                disabled={type === 'EXTRA_ITEM'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                Proposed Rate (₹) *
              </label>
              <input
                type="number"
                step="any"
                value={proposedRate}
                onChange={e => setProposedRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Real-time Calculation Preview Card */}
          <div className={`p-3 rounded-xl border text-xs space-y-1 font-mono ${
            calc.isDeletion
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-indigo-50 border-indigo-200 text-indigo-950'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>
                {calc.isDeletion ? 'Scope Reduction / Deletion' : 'Proposed Financial Addition'}:
              </span>
              <span className="text-sm">
                {calc.isDeletion ? '-' : '+'}
                {formatINR(Math.abs(calc.amount))}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Quantity Difference:</span>
              <span>
                {calc.differenceQuantity > 0 ? '+' : ''}
                {calc.differenceQuantity} {proposedUnit}
              </span>
            </div>
          </div>

          {/* Reason & Justification */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Technical Justification *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="State the site conditions, architectural instructions, drawing changes, or soil investigation results requiring this change..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* References & Supporting Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site Instruction Reference
              </label>
              <input
                type="text"
                value={siteInstructionReference}
                onChange={e => setSiteInstructionReference(e.target.value)}
                placeholder="e.g. SI No. 14 / Letter 891"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supporting Document URL
              </label>
              <input
                type="text"
                value={supportingDocumentUrl}
                onChange={e => setSupportingDocumentUrl(e.target.value)}
                placeholder="e.g. /evidence/doc-123.pdf"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Variation Proposal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
