'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createInventoryItemSchema } from '@/lib/validations/inventory'

const UNIT_OPTIONS = [
  { value: 'bags',   label: 'Bags (Cement, Putty)' },
  { value: 'mt',     label: 'MT / Metric Tonnes (TMT Steel, Bitumen)' },
  { value: 'cft',    label: 'CFT / Cubic Feet (Sand, Aggregates, Stone)' },
  { value: 'sqft',   label: 'Sq. Ft (Tiles, Plywood, Glass)' },
  { value: 'liters', label: 'Liters (Chemical Admixtures, Primer, Paint)' },
  { value: 'kg',     label: 'KG (Binding Wire, Nails, Hardware)' },
  { value: 'nos',    label: 'Numbers / Pieces (Bricks, Paver Blocks, Pipes)' },
  { value: 'trips',  label: 'Dumper Trips (Soil, Muck Filling)' },
]

interface NewItemDrawerProps {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
}

export function NewItemDrawer({ open, onClose, projects }: NewItemDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    item_name: '',
    item_code: '',
    category: 'material',
    unit: 'bags',
    current_stock: '0',
    minimum_stock_alert: '10',
    project_id: '',
    notes: '',
  })

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setError('')
    const parsed = createInventoryItemSchema.safeParse({
      ...form,
      current_stock: Number(form.current_stock) || 0,
      minimum_stock_alert: Number(form.minimum_stock_alert) || 0,
      project_id: form.project_id || undefined,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check item details.')
      return
    }

    setSaving(true)

    const { data: orgProfile, error: orgErr } = await supabase.rpc('get_organization_profile')
    if (orgErr || !orgProfile || !(orgProfile as any).id) {
      setSaving(false)
      setError('Could not verify organization profile.')
      return
    }

    const orgId = (orgProfile as any).id

    const { error: insertErr } = await supabase.from('inventory_items').insert({
      organization_id: orgId,
      item_name: form.item_name.trim(),
      item_code: form.item_code.trim() || null,
      category: form.category.trim() || 'material',
      unit: form.unit as any,
      current_stock: Number(form.current_stock) || 0,
      minimum_stock_alert: Number(form.minimum_stock_alert) || 0,
      project_id: form.project_id || null,
      notes: form.notes.trim() || null,
    })

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      return
    }

    showToast('Inventory item registered successfully!', 'success')
    setForm({
      item_name: '',
      item_code: '',
      category: 'material',
      unit: 'bags',
      current_stock: '0',
      minimum_stock_alert: '10',
      project_id: '',
      notes: '',
    })
    onClose()
    router.refresh()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Material to Store Register"
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <FieldWrapper label="Material / Item Name *" hint="e.g. UltraTech OPC 43 Cement, 12mm TMT Steel">
          <Input
            value={form.item_name}
            onChange={e => setField('item_name', e.target.value)}
            placeholder="e.g. UltraTech OPC 43 Cement"
          />
        </FieldWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Measurement Unit *">
            <Select value={form.unit} onChange={e => setField('unit', e.target.value)}>
              {UNIT_OPTIONS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Item Code / SKU" hint="Optional">
            <Input
              value={form.item_code}
              onChange={e => setField('item_code', e.target.value)}
              placeholder="e.g. MAT-CEM-01"
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Initial Opening Stock">
            <Input
              type="number"
              step="any"
              min="0"
              value={form.current_stock}
              onChange={e => setField('current_stock', e.target.value)}
              placeholder="0"
            />
          </FieldWrapper>

          <FieldWrapper label="Min Buffer Alert" hint="Triggers low-stock warning">
            <Input
              type="number"
              step="any"
              min="0"
              value={form.minimum_stock_alert}
              onChange={e => setField('minimum_stock_alert', e.target.value)}
              placeholder="10"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Assigned Site Yard" hint="Leave unassigned for central warehouse">
          <Select value={form.project_id} onChange={e => setField('project_id', e.target.value)}>
            <option value="">-- Firm Central Warehouse / Base Yard --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Notes / Brand Specs" hint="Optional">
          <Textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={2}
            placeholder="Grade, storage guidelines or supplier preferences..."
          />
        </FieldWrapper>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add Material'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

