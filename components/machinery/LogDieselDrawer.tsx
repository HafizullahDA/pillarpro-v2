'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { getTodayIST } from '@/lib/date'
import { createMachineryLogSchema } from '@/lib/validations/machinery'
import { formatINR } from '@/lib/format'
import { getUserOrganizationId } from '@/lib/organization'
import { calculateShiftWorkingHours } from '@/lib/calculations/machinery'

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
  onSuccess?: (newLog: any) => void
}

export function LogDieselDrawer({
  open,
  onClose,
  assets,
  projects,
  preselectedAssetId,
  onSuccess,
}: LogDieselDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Logging mode: 'time' (Clock shift time, e.g. 11:00 AM - 5:40 PM) vs 'meter' (HMR/Odometer)
  const [logMode, setLogMode] = useState<'time' | 'meter'>('time')
  const [startTime, setStartTime] = useState('11:00')
  const [endTime, setEndTime] = useState('17:40')
  const [breakMinutes, setBreakMinutes] = useState('60')
  const [runDelta, setRunDelta] = useState('0')

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

  // Synchronize asset selection and meter readings whenever drawer opens or assets list updates
  useEffect(() => {
    if (!open) return
    setForm(prev => {
      const targetAsset =
        assets.find(a => a.id === preselectedAssetId) ||
        (prev.asset_id ? assets.find(a => a.id === prev.asset_id) : null) ||
        assets[0]

      if (targetAsset) {
        return {
          ...prev,
          asset_id: targetAsset.id,
          start_meter: String(targetAsset.current_meter ?? 0),
          end_meter: String(targetAsset.current_meter ?? 0),
        }
      }
      return prev
    })
    setError('')
  }, [open, preselectedAssetId, assets])

  // Resolve active asset safely
  const activeAssetId = form.asset_id || preselectedAssetId || (assets.length > 0 ? assets[0].id : '')
  const selectedAsset = assets.find(a => a.id === activeAssetId)
  const isKm = selectedAsset?.meter_tracking === 'km'
  const unit = isKm ? 'Km' : 'Hours'

  // Shift working hours computation from clock time
  const shiftCalc = useMemo(() => {
    return calculateShiftWorkingHours(startTime, endTime, Number(breakMinutes) || 0)
  }, [startTime, endTime, breakMinutes])

  const startVal = Number(form.start_meter) || 0
  const endVal = Number(form.end_meter) || 0
  const totalRun = logMode === 'time'
    ? shiftCalc.netHours
    : Math.max(0, endVal - startVal)

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
          setRunDelta('0')
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    setError('')

    const resolvedAssetId = form.asset_id || preselectedAssetId || (assets.length > 0 ? assets[0].id : '')
    if (!resolvedAssetId) {
      const msg = 'Please register or select a machine/vehicle before logging.'
      setError(msg)
      showToast(msg, 'error')
      return
    }

    const finalStartMeter = Number(form.start_meter) || 0
    const finalEndMeter = logMode === 'time'
      ? Number((finalStartMeter + shiftCalc.netHours).toFixed(2))
      : Number(form.end_meter)

    const shiftTag = logMode === 'time'
      ? `[${shiftCalc.shiftSpanDescription}${shiftCalc.breakMinutes > 0 ? `, Break: ${shiftCalc.breakMinutes}m` : ''} = ${shiftCalc.formattedTime}]`
      : ''

    const workDesc = [shiftTag, form.work_description.trim()].filter(Boolean).join(' • ')

    const parsed = createMachineryLogSchema.safeParse({
      ...form,
      asset_id: resolvedAssetId,
      start_meter: finalStartMeter,
      end_meter: finalEndMeter,
      work_description: workDesc || undefined,
      diesel_liters: Number(form.diesel_liters),
      diesel_rate_per_liter: Number(form.diesel_rate_per_liter),
      project_id: form.project_id || undefined,
    })

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Please check the form readings.'
      setError(msg)
      showToast(msg, 'error')
      return
    }

    setSaving(true)

    // Resiliently resolve organization ID
    const orgId = await getUserOrganizationId(form.project_id || undefined)
    if (!orgId) {
      setSaving(false)
      const msg = 'Could not verify organization context.'
      setError(msg)
      showToast(msg, 'error')
      return
    }

    const { data: insertedLog, error: insertErr } = await supabase.from('machinery_logs').insert({
      organization_id: orgId,
      asset_id: resolvedAssetId,
      project_id: form.project_id || null,
      log_date: form.log_date,
      operator_name: form.operator_name.trim() || null,
      start_meter: finalStartMeter,
      end_meter: finalEndMeter,
      work_description: workDesc || null,
      diesel_liters: Number(form.diesel_liters) || 0,
      diesel_rate_per_liter: Number(form.diesel_rate_per_liter) || 0,
      fuel_vendor: form.fuel_vendor.trim() || null,
    })
    .select('id, asset_id, project_id, log_date, operator_name, start_meter, end_meter, total_run, work_description, diesel_liters, diesel_rate_per_liter, diesel_cost, fuel_vendor, machinery_assets(asset_name, registration_number, meter_tracking), projects(name)')
    .single()

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      showToast(`Save failed: ${insertErr.message}`, 'error')
      return
    }

    showToast(`Logged ${totalRun} ${unit} & ${dieselLiters}L diesel successfully!`, 'success')
    if (insertedLog && onSuccess) {
      onSuccess(insertedLog)
    }
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
            value={activeAssetId}
            onChange={e => setField('asset_id', e.target.value)}
          >
            {assets.length === 0 && (
              <option value="">-- No machines registered in fleet --</option>
            )}
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

        {/* Mode Selector Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLogMode('time')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              logMode === 'time'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Clock Time (e.g. 11 AM – 5:40 PM)
          </button>
          <button
            type="button"
            onClick={() => setLogMode('meter')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              logMode === 'meter'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Meter / Odometer ({unit})
          </button>
        </div>

        {/* Clock Time Mode Card */}
        {logMode === 'time' && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
              <span>Working Hours by Clock Time</span>
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold text-xs shadow-xs">
                Run: {shiftCalc.formattedTime} ({shiftCalc.netHours} {unit})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper label="Start Time *">
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </FieldWrapper>

              <FieldWrapper label="End Time *">
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <FieldWrapper label="Lunch / Rest Break" hint="Site standard 1-2 PM">
                <Select
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(e.target.value)}
                >
                  <option value="60">1 Hour Lunch Break (1:00 PM – 2:00 PM)</option>
                  <option value="0">No Break (Continuous Machine Work)</option>
                  <option value="30">30 Minutes Break</option>
                  <option value="45">45 Minutes Break</option>
                  <option value="90">1.5 Hours Break</option>
                </Select>
              </FieldWrapper>

              <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Elapsed:</span>
                  <span className="font-semibold text-slate-800">
                    {Math.floor(shiftCalc.grossMinutes / 60)}h {shiftCalc.grossMinutes % 60}m
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Break Deducted:</span>
                  <span className="font-semibold text-amber-700">
                    {shiftCalc.breakMinutes > 0 ? `-${shiftCalc.breakMinutes}m` : 'None (0m)'}
                  </span>
                </div>
                <div className="pt-1 border-t border-blue-100 flex justify-between font-bold text-blue-900">
                  <span>Net Run Logged:</span>
                  <span>{shiftCalc.formattedTime} ({shiftCalc.netHours} {unit})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meter Readings Card */}
        {logMode === 'meter' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span>{unit} Meter Log</span>
                <span className="text-[10px] font-normal text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  Odometer / Hour Meter
                </span>
              </div>
              <span className="text-blue-600 font-bold">
                Total Run: {totalRun.toFixed(1)} {unit}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldWrapper label={`Start ${unit}`} hint="Opening meter">
                <Input
                  type="number"
                  step="any"
                  value={form.start_meter}
                  onChange={e => {
                    const val = e.target.value
                    setForm(prev => {
                      const sVal = parseFloat(val) || 0
                      const delta = parseFloat(runDelta) || 0
                      const nextEnd = delta > 0 ? String(Number((sVal + delta).toFixed(2))) : prev.end_meter
                      return { ...prev, start_meter: val, end_meter: nextEnd }
                    })
                  }}
                />
              </FieldWrapper>

              <FieldWrapper label={`${unit} Run Today`} hint="Hours worked today">
                <Input
                  type="number"
                  step="any"
                  value={runDelta}
                  onChange={e => {
                    const delta = e.target.value
                    setRunDelta(delta)
                    const numDelta = parseFloat(delta)
                    if (!isNaN(numDelta) && numDelta >= 0) {
                      const calculatedEnd = (parseFloat(form.start_meter) || 0) + numDelta
                      setForm(prev => ({ ...prev, end_meter: String(Number(calculatedEnd.toFixed(2))) }))
                    }
                  }}
                  placeholder="e.g. 5.4"
                />
              </FieldWrapper>

              <FieldWrapper label={`End ${unit}`} hint="Closing meter">
                <Input
                  type="number"
                  step="any"
                  value={form.end_meter}
                  onChange={e => {
                    const val = e.target.value
                    setForm(prev => ({ ...prev, end_meter: val }))
                    const endNum = parseFloat(val)
                    const startNum = parseFloat(form.start_meter) || 0
                    if (!isNaN(endNum) && endNum >= startNum) {
                      setRunDelta(String(Number((endNum - startNum).toFixed(2))))
                    } else {
                      setRunDelta('')
                    }
                  }}
                />
              </FieldWrapper>
            </div>

            {/* Smart Correction Helper if End < Start */}
            {endVal < startVal && endVal > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">⚠️ Closing reading ({endVal}) is less than opening ({startVal}).</span>
                  <span className="block text-[11px] text-amber-700">Did you mean machine ran <strong>+{endVal} {unit}</strong> today?</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                  onClick={() => {
                    const corrected = Number((startVal + endVal).toFixed(2))
                    setForm(prev => ({ ...prev, end_meter: String(corrected) }))
                    setRunDelta(String(endVal))
                  }}
                >
                  Set End to {(startVal + endVal).toFixed(1)}
                </Button>
              </div>
            )}
          </div>
        )}

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

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Cannot Save Daily Log</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || assets.length === 0}>
            {saving ? 'Saving...' : 'Save Daily Log'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
