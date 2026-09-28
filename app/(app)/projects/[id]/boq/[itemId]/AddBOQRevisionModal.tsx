'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { BOQItem, BOQItemRevision } from '@/lib/types/boq'
import { createClient } from '@/lib/supabase/client'

interface AddBOQRevisionModalProps {
  open: boolean
  onClose: () => void
  item: BOQItem
  projectId: string
  contractId?: string | null
  onSaved: (rev: BOQItemRevision, updatedItem: Partial<BOQItem>) => void
}

export function AddBOQRevisionModal({
  open,
  onClose,
  item,
  projectId,
  contractId,
  onSaved,
}: AddBOQRevisionModalProps) {
  const supabase = createClient()
  const [revisionType, setRevisionType] = useState<string>('deviation')
  const [revisionRef, setRevisionRef] = useState('')
  const [newQuantity, setNewQuantity] = useState<string>(
    String(item.revised_quantity ?? item.tender_quantity)
  )
  const [newRate, setNewRate] = useState<string>(
    String(item.revised_rate ?? item.awarded_rate)
  )
  const [sanctionedBy, setSanctionedBy] = useState('')
  const [sanctionDate, setSanctionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [justification, setJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const q = parseFloat(newQuantity)
    const r = parseFloat(newRate)

    if (isNaN(q) || q < 0) {
      setError('Please provide a valid non-negative revised quantity.')
      return
    }

    if (isNaN(r) || r < 0) {
      setError('Please provide a valid non-negative rate.')
      return
    }

    setSaving(true)
    try {
      const prevQty = Number(item.revised_quantity ?? item.tender_quantity)
      const prevRate = Number(item.revised_rate ?? item.awarded_rate)
      const prevAmount = Math.round(prevQty * prevRate * 100) / 100
      const newAmount = Math.round(q * r * 100) / 100

      // 1. Insert into public.boq_item_revisions
      const { data: revData, error: revError } = await supabase
        .from('boq_item_revisions')
        .insert({
          boq_item_id: item.id,
          project_id: projectId,
          contract_id: contractId || null,
          revision_type: revisionType,
          revision_reference: revisionRef.trim() || null,
          previous_quantity: prevQty,
          new_quantity: q,
          previous_rate: prevRate,
          new_rate: r,
          previous_amount: prevAmount,
          new_amount: newAmount,
          justification: justification.trim() || null,
          sanctioned_by: sanctionedBy.trim() || null,
          sanction_date: sanctionDate || null,
        })
        .select()
        .single()

      if (revError) throw revError

      // 2. Update boq_items with revised values
      const updatedFields: Partial<BOQItem> = {
        revised_quantity: q,
        revised_rate: r,
        revised_amount: newAmount,
        updated_at: new Date().toISOString(),
      }

      if (revisionType === 'deviation') {
        updatedFields.item_type = 'deviation'
        updatedFields.variation_quantity = Math.round((q - Number(item.tender_quantity)) * 1000) / 1000
      } else if (revisionType === 'extra_item') {
        updatedFields.item_type = 'extra_item'
        updatedFields.extra_quantity = q
      }

      const { error: updateError } = await supabase
        .from('boq_items')
        .update(updatedFields)
        .eq('id', item.id)

      if (updateError) throw updateError

      onSaved(revData as BOQItemRevision, updatedFields)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save revision')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Quantity / Rate Revision (Deviation / Variation)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-900">
            Item {item.item_number} &bull; {item.unit}
          </p>
          <p className="text-slate-500 line-clamp-1">{item.description}</p>
          <div className="flex gap-4 pt-1 font-mono text-[11px] text-slate-700">
            <span>Original Qty: <strong>{item.tender_quantity}</strong></span>
            <span>Awarded Rate: <strong>₹{item.awarded_rate}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Revision Type *
            </label>
            <select
              value={revisionType}
              onChange={e => setRevisionType(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="deviation">Deviation (+/- Quantity)</option>
              <option value="variation">Variation Order</option>
              <option value="extra_item">Extra Item Sanction</option>
              <option value="substitution">Substituted Item</option>
              <option value="rate_revision">Rate Revision</option>
              <option value="quantity_adjustment">Quantity Reconciliation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sanction / Order Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Deviation Statement #1"
              value={revisionRef}
              onChange={e => setRevisionRef(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New / Revised Quantity ({item.unit}) *
            </label>
            <input
              type="number"
              step="0.001"
              required
              value={newQuantity}
              onChange={e => setNewQuantity(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New / Revised Rate (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sanctioning Authority
            </label>
            <input
              type="text"
              placeholder="e.g. Superintending Engineer"
              value={sanctionedBy}
              onChange={e => setSanctionedBy(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sanction Date
            </label>
            <input
              type="date"
              value={sanctionDate}
              onChange={e => setSanctionDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Technical Justification / Reasons for Deviation
          </label>
          <textarea
            rows={2}
            placeholder="Site conditions, stratum variation, foundation deepening as directed by Engineer-in-Charge..."
            value={justification}
            onChange={e => setJustification(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            Save Revision
          </Button>
        </div>
      </form>
    </Modal>
  )
}
