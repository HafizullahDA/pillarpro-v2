'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { getTodayIST } from '@/lib/date'
import { createInventoryTrxSchema } from '@/lib/validations/inventory'

interface ItemOption {
  id: string
  item_name: string
  unit: string
  current_stock: number
  minimum_stock_alert: number
}

interface LogTransactionDrawerProps {
  open: boolean
  onClose: () => void
  items: ItemOption[]
  projects: { id: string; name: string }[]
  suppliers: { id: string; name: string }[]
  initialType?: 'receipt_in' | 'issue_out' | 'return_in' | 'wastage_adjustment'
  preselectedItemId?: string
}

export function LogTransactionDrawer({
  open,
  onClose,
  items,
  projects,
  suppliers,
  initialType = 'receipt_in',
  preselectedItemId,
}: LogTransactionDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initialItem = items.find(i => i.id === preselectedItemId) || items[0]

  const [form, setForm] = useState<{
    item_id: string
    transaction_type: 'receipt_in' | 'issue_out' | 'return_in' | 'wastage_adjustment'
    quantity: string
    transaction_date: string
    project_id: string
    supplier_id: string
    destination_location: string
    issued_to_person: string
    challan_number: string
    vehicle_number: string
    remarks: string
  }>({
    item_id: preselectedItemId || (initialItem ? initialItem.id : ''),
    transaction_type: initialType,
    quantity: '',
    transaction_date: getTodayIST(),
    project_id: '',
    supplier_id: '',
    destination_location: '',
    issued_to_person: '',
    challan_number: '',
    vehicle_number: '',
    remarks: '',
  })

  const selectedItem = items.find(i => i.id === form.item_id)
  const isReceipt = form.transaction_type === 'receipt_in' || form.transaction_type === 'return_in'

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setError('')
    const qtyNum = Number(form.quantity)

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid quantity greater than 0.')
      return
    }

    if (!isReceipt && selectedItem && qtyNum > selectedItem.current_stock) {
      setError(`Cannot issue ${qtyNum} ${selectedItem.unit}. Available balance is only ${selectedItem.current_stock} ${selectedItem.unit}.`)
      return
    }

    const payload = {
      ...form,
      quantity: qtyNum,
      project_id: form.project_id || undefined,
      supplier_id: form.supplier_id || undefined,
    }

    const parsed = createInventoryTrxSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check transaction fields.')
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

    const { error: insertErr } = await supabase.from('inventory_transactions').insert({
      organization_id: orgId,
      item_id: form.item_id,
      transaction_type: form.transaction_type as any,
      quantity: qtyNum,
      transaction_date: form.transaction_date,
      project_id: form.project_id || null,
      supplier_id: isReceipt && form.supplier_id ? form.supplier_id : null,
      destination_location: form.destination_location.trim() || null,
      issued_to_person: form.issued_to_person.trim() || null,
      challan_number: form.challan_number.trim() || null,
      vehicle_number: form.vehicle_number.trim() || null,
      remarks: form.remarks.trim() || null,
    })

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      if (
        insertErr.message?.includes('schema cache') ||
        insertErr.message?.includes('inventory_transactions') ||
        (insertErr as any).code === 'PGRST205'
      ) {
        setError(
          "Database table 'public.inventory_transactions' has not been created in Supabase yet. Please run migration 033_store_inventory.sql in your Supabase Dashboard SQL Editor."
        )
      } else {
        setError(insertErr.message)
      }
      return
    }

    const actionText = isReceipt ? 'Received in store' : 'Issued out to site'
    showToast(`${qtyNum} ${selectedItem?.unit || 'units'} ${actionText} successfully!`, 'success')
    onClose()
    router.refresh()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isReceipt ? 'Goods Received Note (GRN - Stock In)' : 'Site Material Issue Slip (Stock Out)'}
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setField('transaction_type', 'receipt_in')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isReceipt ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock In (GRN)
          </button>
          <button
            type="button"
            onClick={() => setField('transaction_type', 'issue_out')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isReceipt ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Issue Out (Site Use)
          </button>
        </div>

        <FieldWrapper label="Select Material / Item *">
          <Select value={form.item_id} onChange={e => setField('item_id', e.target.value)}>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.item_name} (Current: {i.current_stock} {i.unit})
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label={`Quantity to ${isReceipt ? 'Receive' : 'Issue'} *`}>
            <div className="relative">
              <Input
                type="number"
                step="any"
                min="0.01"
                value={form.quantity}
                onChange={e => setField('quantity', e.target.value)}
                placeholder="0"
              />
              {selectedItem && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {selectedItem.unit}
                </span>
              )}
            </div>
          </FieldWrapper>

          <FieldWrapper label="Date *">
            <Input
              type="date"
              value={form.transaction_date}
              onChange={e => setField('transaction_date', e.target.value)}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Project / Job Site Location">
          <Select value={form.project_id} onChange={e => setField('project_id', e.target.value)}>
            <option value="">-- Central Firm Warehouse / Yard --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </FieldWrapper>

        {isReceipt ? (
          <>
            <FieldWrapper label="Received from Supplier / Vendor" hint="Optional link to supplier">
              <Select value={form.supplier_id} onChange={e => setField('supplier_id', e.target.value)}>
                <option value="">-- Direct Delivery / Unknown --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrapper label="Challan / Bill No." hint="Optional">
                <Input
                  value={form.challan_number}
                  onChange={e => setField('challan_number', e.target.value)}
                  placeholder="e.g. DC-2026-99"
                />
              </FieldWrapper>

              <FieldWrapper label="Delivery Vehicle No." hint="Optional">
                <Input
                  value={form.vehicle_number}
                  onChange={e => setField('vehicle_number', e.target.value)}
                  placeholder="e.g. JK02-AZ-1122"
                />
              </FieldWrapper>
            </div>
          </>
        ) : (
          <>
            <FieldWrapper label="Destination Structure / Work Location *" hint="e.g. Pier P3 Foundation, Slab Chainage 4+200">
              <Input
                value={form.destination_location}
                onChange={e => setField('destination_location', e.target.value)}
                placeholder="Where will this material be consumed?"
              />
            </FieldWrapper>

            <FieldWrapper label="Issued to Person / Subcontractor">
              <Input
                value={form.issued_to_person}
                onChange={e => setField('issued_to_person', e.target.value)}
                placeholder="e.g. Ramesh Mason / Foreman"
              />
            </FieldWrapper>
          </>
        )}

        <FieldWrapper label="Remarks / Notes" hint="Optional">
          <Textarea
            value={form.remarks}
            onChange={e => setField('remarks', e.target.value)}
            rows={2}
            placeholder="Gate keeper notes or quality check remarks..."
          />
        </FieldWrapper>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Processing...' : isReceipt ? 'Receive Stock In' : 'Issue Material Out'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

