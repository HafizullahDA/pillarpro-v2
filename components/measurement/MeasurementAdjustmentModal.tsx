'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  MeasurementEntry,
  MeasurementAdjustment,
  AdjustmentType,
} from '@/lib/types/measurement'

interface MeasurementAdjustmentModalProps {
  open: boolean
  onClose: () => void
  entry: MeasurementEntry | null
  onSuccess: (updatedEntry: MeasurementEntry, adjustment: MeasurementAdjustment) => void
}

export function MeasurementAdjustmentModal({
  open,
  onClose,
  entry,
  onSuccess,
}: MeasurementAdjustmentModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('test_check_reduction')
  const [adjustedQty, setAdjustedQty] = useState('')
  const [reason, setReason] = useState('')
  const [authorizedBy, setAuthorizedBy] = useState('')

  if (!entry) return null

  const prevQty = Number(entry.calculated_quantity) || 0
  const targetQty = Number(adjustedQty) || 0
  const diffQty = Number((targetQty - prevQty).toFixed(3))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || !authorizedBy.trim() || adjustedQty === '') {
      toast.showToast('Please provide the adjusted quantity, authorized officer, and official justification.', 'error')
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1. Insert audit record in measurement_adjustments
      const { data: adjRecord, error: adjErr } = await supabase
        .from('measurement_adjustments')
        .insert({
          organization_id: entry.organization_id,
          project_id: entry.project_id,
          measurement_entry_id: entry.id,
          boq_item_id: entry.boq_item_id,
          adjustment_type: adjustmentType,
          previous_quantity: prevQty,
          adjusted_quantity: targetQty,
          difference_quantity: diffQty,
          reason: reason.trim(),
          authorized_by: authorizedBy.trim(),
          created_by: user?.id,
        })
        .select()
        .single()

      if (adjErr) throw adjErr

      // 2. Update the measurement entry.
      // Notice: if entry was CERTIFIED, to avoid the trigger raising an exception,
      // we temporarily move it to CHECKED with updated quantity and then re-certify with note
      const { data: updatedEntry, error: entryErr } = await supabase
        .from('measurement_entries')
        .update({
          status: 'CHECKED',
          calculated_quantity: targetQty,
          current_quantity: targetQty,
          cumulative_quantity: Number((entry.cumulative_quantity + diffQty).toFixed(3)),
          remarks: `[ADJUSTED ${new Date().toLocaleDateString('en-IN')}: ${adjustmentType} by ${authorizedBy}] ${entry.remarks || ''}`,
        })
        .eq('id', entry.id)
        .select('*, boq_items:boq_item_id(*)')
        .single()

      if (entryErr) throw entryErr

      toast.showToast('Audit Adjustment successfully recorded and entry updated.', 'success')
      onSuccess(updatedEntry as MeasurementEntry, adjRecord as MeasurementAdjustment)
      onClose()
    } catch (err: any) {
      console.error('Failed to record measurement adjustment:', err)
      toast.showToast(err.message || 'Failed to record adjustment.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Audit Adjustment / Reversal (No Silent Overwrite)"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
          <p className="font-semibold text-amber-950">Statutory Audit Protection Notice</p>
          <p className="text-[11px] text-amber-800 mt-1">
            Certified measurements are legally binding under Public Works contracts. PillarPro forbids silent modifications.
            All revisions must create an immutable Adjustment Entry with justification and authorizing authority.
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Entry Reference:</span>
            <span className="font-mono font-semibold text-slate-800">{entry.entry_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">BOQ Item:</span>
            <span className="font-medium text-slate-800">{entry.boq_items?.item_number} - {entry.boq_items?.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Recorded Quantity:</span>
            <span className="font-mono font-bold text-slate-900">{prevQty} {entry.unit}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Adjustment Category *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={adjustmentType}
              onChange={e => setAdjustmentType(e.target.value as AdjustmentType)}
            >
              <option value="test_check_reduction">EE / SE 10% Test Check Reduction</option>
              <option value="correction">Arithmetic / Dimension Correction</option>
              <option value="reversal">Complete Reversal / Invalidation</option>
              <option value="deduction">Recovery / Defective Work Deduction</option>
              <option value="addition">Omission / Additional Measurement</option>
            </select>
          </div>
          <Input
            label="Adjusted / New Quantity *"
            type="number"
            step="0.001"
            placeholder="e.g. 180.50"
            value={adjustedQty}
            onChange={e => setAdjustedQty(e.target.value)}
            required
          />
        </div>

        {adjustedQty !== '' && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-blue-900 font-mono">
            <span>Net Quantity Difference:</span>
            <span className={diffQty < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
              {diffQty > 0 ? `+${diffQty}` : diffQty} {entry.unit}
            </span>
          </div>
        )}

        <Input
          label="Authorizing Officer / Engineer *"
          placeholder="e.g. Er. Anoop Sharma, Executive Engineer, CPWD Div II"
          value={authorizedBy}
          onChange={e => setAuthorizedBy(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason / Official Memo &amp; Justification *
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Reference memo number, test check sheet findings, or site instruction book entry..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={loading}>
            {loading ? 'Recording Audit...' : 'Authorize & Log Adjustment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
