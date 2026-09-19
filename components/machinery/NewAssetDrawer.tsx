'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createMachineryAssetSchema } from '@/lib/validations/machinery'

const ASSET_TYPES = [
  { value: 'excavator',     label: 'Excavator (JCB / Hitachi / Poclain)' },
  { value: 'dumper',        label: 'Dumper / Tipper / Hyva' },
  { value: 'roller',        label: 'Road Roller / Compactor' },
  { value: 'transit_mixer', label: 'Transit Concrete Mixer (TM)' },
  { value: 'loader',        label: 'Wheel Loader' },
  { value: 'crane',         label: 'Hydra / Mobile Crane' },
  { value: 'generator',     label: 'DG Generator Set' },
  { value: 'tractor',       label: 'Tractor / Trolley' },
  { value: 'other',         label: 'Other Equipment' },
]

interface NewAssetDrawerProps {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
}

export function NewAssetDrawer({ open, onClose, projects }: NewAssetDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    asset_name: '',
    asset_type: 'excavator',
    registration_number: '',
    model_year: '',
    ownership: 'owned',
    meter_tracking: 'hours',
    hourly_rate: '',
    current_meter: '0',
    project_id: '',
    notes: '',
  })

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setError('')
    const parsed = createMachineryAssetSchema.safeParse({
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : 0,
      current_meter: form.current_meter ? Number(form.current_meter) : 0,
      project_id: form.project_id || undefined,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the form inputs.')
      return
    }

    setSaving(true)

    // Fetch caller's organization_id
    const { data: orgProfile, error: orgErr } = await supabase.rpc('get_organization_profile')
    if (orgErr || !orgProfile || !(orgProfile as any).id) {
      setSaving(false)
      setError('Could not verify firm organization ID.')
      return
    }

    const orgId = (orgProfile as any).id

    const { error: insertErr } = await supabase.from('machinery_assets').insert({
      organization_id: orgId,
      asset_name: form.asset_name.trim(),
      asset_type: form.asset_type as any,
      registration_number: form.registration_number.trim().toUpperCase() || null,
      model_year: form.model_year.trim() || null,
      ownership: form.ownership as any,
      meter_tracking: form.meter_tracking as any,
      hourly_rate: Number(form.hourly_rate) || 0,
      current_meter: Number(form.current_meter) || 0,
      project_id: form.project_id || null,
      notes: form.notes.trim() || null,
      status: 'active',
    })

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      return
    }

    showToast('Machine/Vehicle asset registered successfully!', 'success')
    setForm({
      asset_name: '',
      asset_type: 'excavator',
      registration_number: '',
      model_year: '',
      ownership: 'owned',
      meter_tracking: 'hours',
      hourly_rate: '',
      current_meter: '0',
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
      title="Add Machinery or Vehicle Asset"
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <FieldWrapper label="Machine / Vehicle Name *" hint="e.g. JCB 3DX Eco, Tata 1618 Tipper">
          <Input
            value={form.asset_name}
            onChange={e => setField('asset_name', e.target.value)}
            placeholder="e.g. JCB 3DX #1"
          />
        </FieldWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Asset Type">
            <Select value={form.asset_type} onChange={e => setField('asset_type', e.target.value)}>
              {ASSET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Registration / Plate No." hint="Optional">
            <Input
              value={form.registration_number}
              onChange={e => setField('registration_number', e.target.value)}
              placeholder="e.g. JK02-AB-9876"
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Ownership">
            <Select value={form.ownership} onChange={e => setField('ownership', e.target.value)}>
              <option value="owned">Owned (Company Asset)</option>
              <option value="hired">Hired / Rented from Vendor</option>
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Tracking Meter">
            <Select value={form.meter_tracking} onChange={e => setField('meter_tracking', e.target.value)}>
              <option value="hours">Hours Meter (JCB / DG / Roller)</option>
              <option value="km">Kilometers Odometer (Dumper / Tipper)</option>
            </Select>
          </FieldWrapper>
        </div>

        {form.ownership === 'hired' && (
          <FieldWrapper label="Hired Hourly/Daily Rate (₹)" hint="Used to calculate equipment rent bill">
            <CurrencyInput
              value={form.hourly_rate}
              onChange={e => setField('hourly_rate', e.target.value)}
              placeholder="0.00"
            />
          </FieldWrapper>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper
            label={`Starting ${form.meter_tracking === 'hours' ? 'Hour' : 'Km'} Meter`}
            hint="Current reading on dashboard"
          >
            <Input
              type="number"
              step="any"
              value={form.current_meter}
              onChange={e => setField('current_meter', e.target.value)}
              placeholder="0"
            />
          </FieldWrapper>

          <FieldWrapper label="Primary Assigned Project" hint="Optional firm-wide or site specific">
            <Select value={form.project_id} onChange={e => setField('project_id', e.target.value)}>
              <option value="">-- Firm-wide / Unassigned --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <FieldWrapper label="Notes / Engine Serial" hint="Optional">
          <Textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={2}
            placeholder="Operator name, engine number, or maintenance schedule notes..."
          />
        </FieldWrapper>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Register Asset'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

