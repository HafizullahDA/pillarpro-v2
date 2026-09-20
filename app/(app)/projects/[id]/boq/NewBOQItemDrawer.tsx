'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { FieldWrapper, Input, Textarea, Select } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { formatINR } from '@/lib/format'
import { BOQItem } from '@/lib/types/boq'

interface NewBOQItemDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  itemToEdit?: BOQItem | null
  onSaved: () => void
}

const COMMON_UNITS = [
  { value: 'cum', label: 'Cubic Metre (cum / m³)' },
  { value: 'sqm', label: 'Square Metre (sqm / m²)' },
  { value: 'rmt', label: 'Running Metre (rmt / m)' },
  { value: 'MT', label: 'Metric Tonne (MT)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'quintal', label: 'Quintal (100 kg)' },
  { value: 'Nos', label: 'Numbers / Pieces (Nos)' },
  { value: 'bags', label: 'Bags (Cement/Lime)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'set', label: 'Set / Assembly' },
  { value: 'LS', label: 'Lump Sum (LS)' },
]

export function NewBOQItemDrawer({
  open,
  onClose,
  projectId,
  itemToEdit,
  onSaved,
}: NewBOQItemDrawerProps) {
  const supabase = createClient()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    item_number: '',
    description: '',
    unit: 'cum',
    tender_quantity: '',
    awarded_rate: '',
  })

  useEffect(() => {
    if (itemToEdit) {
      setForm({
        item_number: itemToEdit.item_number,
        description: itemToEdit.description,
        unit: itemToEdit.unit,
        tender_quantity: itemToEdit.tender_quantity.toString(),
        awarded_rate: itemToEdit.awarded_rate.toString(),
      })
    } else {
      setForm({
        item_number: '',
        description: '',
        unit: 'cum',
        tender_quantity: '',
        awarded_rate: '',
      })
    }
    setError('')
  }, [itemToEdit, open])

  const tenderQtyNum = parseFloat(form.tender_quantity) || 0
  const awardedRateNum = parseFloat(form.awarded_rate) || 0
  const computedTotal = Math.round(tenderQtyNum * awardedRateNum * 100) / 100

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.item_number.trim()) {
      setError('Please enter an Item Number or DSR code.')
      return
    }
    if (!form.description.trim()) {
      setError('Please provide a description of the work item.')
      return
    }
    if (tenderQtyNum <= 0) {
      setError('Tender quantity must be greater than zero.')
      return
    }
    if (awardedRateNum < 0) {
      setError('Awarded rate cannot be negative.')
      return
    }

    setSaving(true)
    try {
      if (itemToEdit) {
        const { error: updateError } = await supabase
          .from('boq_items')
          .update({
            item_number: form.item_number.trim(),
            description: form.description.trim(),
            unit: form.unit,
            tender_quantity: tenderQtyNum,
            awarded_rate: awardedRateNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemToEdit.id)

        if (updateError) throw updateError
        toast.success(`BOQ Item "${form.item_number}" updated successfully.`)
      } else {
        const { error: insertError } = await supabase
          .from('boq_items')
          .insert({
            project_id: projectId,
            item_number: form.item_number.trim(),
            description: form.description.trim(),
            unit: form.unit,
            tender_quantity: tenderQtyNum,
            awarded_rate: awardedRateNum,
          })

        if (insertError) throw insertError
        toast.success(`BOQ Item "${form.item_number}" added successfully.`)
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save BOQ item. Please check your inputs.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={itemToEdit ? `Edit BOQ Item ${itemToEdit.item_number}` : 'Add Bill of Quantities (BOQ) Item'}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Item No / DSR Code" required>
            <Input
              type="text"
              placeholder="e.g. 1.1 or DSR-4.1.5"
              value={form.item_number}
              onChange={(e) => setForm({ ...form, item_number: e.target.value })}
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Unit of Measurement" required>
            <Select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {COMMON_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <FieldWrapper label="Item Description (CPWD / PWD Schedule Specification)" required>
          <Textarea
            rows={3}
            placeholder="Detailed description of works, materials, specifications, and execution standard..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </FieldWrapper>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Tender / Agreement Quantity" required>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="e.g. 500"
              value={form.tender_quantity}
              onChange={(e) => setForm({ ...form, tender_quantity: e.target.value })}
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Awarded Unit Rate (₹)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 2450.00"
              value={form.awarded_rate}
              onChange={(e) => setForm({ ...form, awarded_rate: e.target.value })}
              required
            />
          </FieldWrapper>
        </div>

        {/* Live Total Calculation Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Estimated Tender Amount</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {tenderQtyNum > 0 && awardedRateNum > 0
                ? `${tenderQtyNum.toLocaleString('en-IN')} ${form.unit} × ₹${awardedRateNum.toLocaleString('en-IN')}`
                : 'Enter quantity and rate'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatINR(computedTotal)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-slate-900 hover:bg-black text-white"
            disabled={saving}
          >
            {saving ? 'Saving...' : itemToEdit ? 'Update Item' : 'Add to BOQ'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
