'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { getTodayIST } from '@/lib/date'
import { createMachineryLogSchema } from '@/lib/validations/machinery'
import { formatINR } from '@/lib/format'

interface AssetOption {
  id: string
  asset_name: string
  asset_type: string
  registration_number?: string | null
  current_meter: number
  meter_tracking: 'hours' | 'km'
}

interface LogDieselDrawerProps {
  open: boolean
  onClose: () => void
  assets: AssetOption[]
  projects: { id: string; name: string }[]
  preselectedAssetId?: string
}

export function LogDieselDrawer({
  open,
  onClose,
  assets,
  projects,
  preselectedAssetId,
}: LogDieselDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initialAsset = assets.find(a => a.id === preselectedAssetId) || assets[0]

  const [form, setForm] = useState({
    asset_id: preselectedAssetId || (initialAsset ? initialAsset.id : ''),
    project_id: '',
    log_date: getTodayIST(),
    operator_name: '',
    start_meter: initialAsset ? String(initialAsset.current_meter) : '0',
    end_meter: initialAsset ? String(initialAsset.current_meter) : '0',
    work_description: '',
    diesel_liters: '0',
    diesel_rate_per_liter: '90', // Default realistic diesel rate ₹90/L
    fuel_vendor: '',
  })

  const selectedAsset = assets.find(a => a.id === form.asset_id)
  const isKm = selectedAsset?.meter_tracking === 'km'
  const unit = isKm ? 'Km' : 'Hours'

  const startVal = Number(form.start_meter) || 0
  const endVal = Number(form.end_meter) || 0
  const totalRun = Math.max(0, endVal - startVal)

  const dieselLiters = Number(form.diesel_liters) || 0
  const dieselRate = Number(form.diesel_rate_per_liter) || 0
  const totalFuelCost = dieselLiters * dieselRate

  const setField = (key: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'asset_id') {
        const found = assets.find(a => a.id === value)
        if (found) {
          next.start_meter = String(found.current_meter || 0)
          next.end_meter = String(found.current_meter || 0)
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    setError('')
    const parsed = createMachineryLogSchema.safeParse({
      ...form,
      start_meter: Number(form.start_meter),
      end_meter: Number(form.end_meter),
      diesel_liters: Number(form.diesel_liters),
      diesel_rate_per_liter: Number(form.diesel_rate_per_liter),
      project_id: form.project_id || undefined,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the form readings.')
      return
    }

    setSaving(true)

    // Fetch caller's organization_id
    const { data: orgProfile, error: orgErr } = await supabase.rpc('get_organization_profile')
    if (orgErr || !orgProfile || !(orgProfile as any).id) {
      setSaving(false)
      setError('Could not verify organization context.')
      return
    }

    const orgId = (orgProfile as any).id

    const { error: insertErr } = await supabase.from('machinery_logs').insert({
      organization_id: orgId,
      asset_id: form.asset_id,
      project_id: form.project_id || null,
      log_date: form.log_date,
      operator_name: form.operator_name.trim() || null,
      start_meter: Number(form.start_meter),
      end_meter: Number(form.end_meter),
      work_description: form.work_description.trim() || null,
      diesel_liters: Number(form.diesel_liters) || 0,
      diesel_rate_per_liter: Number(form.diesel_rate_per_liter) || 0,
      fuel_vendor: form.fuel_vendor.trim() || null,
    })

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      return
    }

    showToast(`Logged ${totalRun} ${unit} & ${dieselLiters}L diesel successfully!`, 'success')
    onClose()
    router.refresh()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Log Daily Run & Diesel Fuel"
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <FieldWrapper label="Select Machine / Vehicle *">
          <Select
            value={form.asset_id}
            onChange={e => setField('asset_id', e.target.value)}
          >
            {assets.map(a => (
              <option key={a.id} value={a.id}>
                {a.asset_name} {a.registration_number ? `(${a.registration_number})` : ''} — Current: {a.current_meter} {a.meter_tracking}
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Log Date *">
            <Input
              type="date"
              value={form.log_date}
              onChange={e => setField('log_date', e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Civil Project Site">
            <Select value={form.project_id} onChange={e => setField('project_id', e.target.value)}>
              <option value="">-- General / Yard / Multiple --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <FieldWrapper label="Operator / Driver Name">
          <Input
            value={form.operator_name}
            onChange={e => setField('operator_name', e.target.value)}
            placeholder="e.g. Ramesh Kumar (Operator)"
          />
        </FieldWrapper>

        {/* Meter Readings Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{unit} Meter Log</span>
            <span className="text-blue-600 font-bold">
              Total Run: {totalRun.toFixed(1)} {unit}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label={`Start ${unit}`}>
              <Input
                type="number"
                step="any"
                value={form.start_meter}
                onChange={e => setField('start_meter', e.target.value)}
              />
            </FieldWrapper>

            <FieldWrapper label={`End ${unit}`}>
              <Input
                type="number"
                step="any"
                value={form.end_meter}
                onChange={e => setField('end_meter', e.target.value)}
              />
            </FieldWrapper>
          </div>
        </div>

        {/* Diesel Fuel Card */}
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Diesel Fuel Dispensed</span>
            <span className="text-amber-800 font-bold">
              Cost: {formatINR(totalFuelCost)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Liters Issued">
              <Input
                type="number"
                step="any"
                value={form.diesel_liters}
                onChange={e => setField('diesel_liters', e.target.value)}
                placeholder="0"
              />
            </FieldWrapper>

            <FieldWrapper label="Rate / Liter (₹)">
              <CurrencyInput
                value={form.diesel_rate_per_liter}
                onChange={e => setField('diesel_rate_per_liter', e.target.value)}
                placeholder="90.00"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Fuel Station / Pump Vendor" hint="Optional">
            <Input
              value={form.fuel_vendor}
              onChange={e => setField('fuel_vendor', e.target.value)}
              placeholder="e.g. Indian Oil Highway Pump #4"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Work Activity / Location" hint="e.g. Chainage 14+200 earthwork excavation">
          <Textarea
            value={form.work_description}
            onChange={e => setField('work_description', e.target.value)}
            rows={2}
            placeholder="Specific site location or task accomplished..."
          />
        </FieldWrapper>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Daily Log'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

