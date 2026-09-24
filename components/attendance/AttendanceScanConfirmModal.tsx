'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrapper, Input, Select, CurrencyInput } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { getTodayIST } from '@/lib/date'
import { formatINR } from '@/lib/format'

export interface ScannedWorkerEntry {
  id: string
  name: string
  trade: string
  daily_wage_rate: string // editable string for form input
  status: 'present' | 'half_day' | 'absent' | 'overtime'
  matchedWorkerId?: string | null
  isNew: boolean
}

interface Project {
  id: string
  name: string
}

interface Worker {
  id: string
  name: string
  trade: string | null
  daily_wage_rate: number | null
}

interface AttendanceScanConfirmModalProps {
  open: boolean
  onClose: () => void
  projects: Project[]
  initialProjectId: string
  existingWorkers: Worker[]
  scannedData: {
    date: string | null
    project_name: string | null
    entries: {
      name: string
      trade?: string | null
      daily_wage_rate?: number | null
      status?: string
    }[]
  } | null
  imagePreviewUrl?: string | null
  organizationId?: string
  onSuccess: (savedDate: string, targetProjectId: string) => void
}

const TRADES = [
  'Mason',
  'Helper',
  'Carpenter',
  'Plumber',
  'Electrician',
  'Welder',
  'Painter',
  'Driver',
  'Operator',
  'Supervisor',
  'Other',
]

export function AttendanceScanConfirmModal({
  open,
  onClose,
  projects,
  initialProjectId,
  existingWorkers,
  scannedData,
  imagePreviewUrl,
  organizationId,
  onSuccess,
}: AttendanceScanConfirmModalProps) {
  const supabase = createClient()
  const toast = useToast()

  const [targetProjectId, setTargetProjectId] = useState(initialProjectId || (projects[0]?.id ?? ''))
  const [targetDate, setTargetDate] = useState(getTodayIST())
  const [entries, setEntries] = useState<ScannedWorkerEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize modal state whenever scannedData changes
  useEffect(() => {
    if (!scannedData) return

    // 1. Resolve Project: match project_name if mentioned
    let resolvedProjectId = initialProjectId || (projects[0]?.id ?? '')
    if (scannedData.project_name) {
      const q = scannedData.project_name.toLowerCase().trim()
      const matched = projects.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()))
      if (matched) resolvedProjectId = matched.id
    }
    setTargetProjectId(resolvedProjectId)

    // 2. Resolve Date
    setTargetDate(scannedData.date || getTodayIST())

    // 3. Resolve Worker rows & match with existing workers in DB
    const mappedEntries: ScannedWorkerEntry[] = (scannedData.entries || []).map((raw, idx) => {
      const cleanName = (raw.name || '').trim()
      const matched = existingWorkers.find(
        w => w.name.toLowerCase().trim() === cleanName.toLowerCase()
      )

      let trade = raw.trade && TRADES.includes(raw.trade) ? raw.trade : 'Helper'
      let wageRate = ''

      if (matched) {
        if (matched.trade) trade = matched.trade
        if (matched.daily_wage_rate) wageRate = String(matched.daily_wage_rate)
      } else if (raw.daily_wage_rate != null && !isNaN(Number(raw.daily_wage_rate))) {
        wageRate = String(raw.daily_wage_rate)
      }

      let status: 'present' | 'half_day' | 'absent' | 'overtime' = 'present'
      if (raw.status === 'half_day' || raw.status === 'absent' || raw.status === 'overtime') {
        status = raw.status
      }

      return {
        id: `scan_entry_${idx}_${Date.now()}`,
        name: cleanName || `Worker ${idx + 1}`,
        trade,
        daily_wage_rate: wageRate,
        status,
        matchedWorkerId: matched ? matched.id : null,
        isNew: !matched,
      }
    })

    setEntries(mappedEntries)
    setError('')
  }, [scannedData, initialProjectId, projects, existingWorkers])

  // Summary statistics
  const stats = useMemo(() => {
    const present = entries.filter(e => e.status === 'present').length
    const halfDay = entries.filter(e => e.status === 'half_day').length
    const overtime = entries.filter(e => e.status === 'overtime').length
    const absent = entries.filter(e => e.status === 'absent').length
    const newWorkers = entries.filter(e => e.isNew).length
    const missingWageCount = entries.filter(e => e.isNew && !e.daily_wage_rate).length
    return { present, halfDay, overtime, absent, newWorkers, missingWageCount }
  }, [entries])

  const handleUpdateEntry = (id: string, updates: Partial<ScannedWorkerEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
  }

  const handleWorkerNameChange = (id: string, newName: string) => {
    const clean = newName.trim().toLowerCase()
    const matched = existingWorkers.find(w => w.name.toLowerCase().trim() === clean)

    setEntries(prev =>
      prev.map(e => {
        if (e.id !== id) return e
        if (matched) {
          return {
            ...e,
            name: newName,
            matchedWorkerId: matched.id,
            isNew: false,
            trade: matched.trade || e.trade,
            daily_wage_rate: matched.daily_wage_rate ? String(matched.daily_wage_rate) : e.daily_wage_rate,
          }
        }
        return {
          ...e,
          name: newName,
          matchedWorkerId: null,
          isNew: true,
        }
      })
    )
  }

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleAddWorkerRow = () => {
    const newId = `manual_row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    setEntries(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        trade: 'Helper',
        daily_wage_rate: '',
        status: 'present',
        matchedWorkerId: null,
        isNew: true,
      },
    ])
  }

  const handleConfirm = async () => {
    if (saving) return
    if (!targetProjectId) {
      setError('Please select a project site for this attendance record.')
      return
    }
    if (!targetDate) {
      setError('Please specify a valid attendance date.')
      return
    }
    if (!entries.length) {
      setError('No workers found to save. Add at least one worker.')
      return
    }

    // Check that all workers have names
    const invalidName = entries.find(e => !e.name.trim())
    if (invalidName) {
      setError('All worker rows must have a valid name.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // 1. Create any brand-new workers that aren't yet in the database
      const newWorkerEntries = entries.filter(e => e.isNew && !e.matchedWorkerId)
      const workerIdMap = new Map<string, string>()

      let effectiveOrgId = organizationId
      if (!effectiveOrgId && newWorkerEntries.length > 0) {
        try {
          const { data } = await supabase.rpc('get_user_organization_id')
          if (data) effectiveOrgId = data
        } catch {
          // fallback
        }
      }

      for (const nw of newWorkerEntries) {
        const rateVal = nw.daily_wage_rate ? parseFloat(nw.daily_wage_rate) : null
        const { data: createdWorker, error: wErr } = await supabase
          .from('workers')
          .insert({
            name: nw.name.trim(),
            trade: nw.trade || 'Helper',
            daily_wage_rate: rateVal && !isNaN(rateVal) ? rateVal : null,
            ...(effectiveOrgId ? { organization_id: effectiveOrgId } : {}),
          })
          .select('id')
          .single()

        if (wErr) {
          throw new Error(`Failed to create worker "${nw.name}": ${wErr.message}`)
        }
        if (createdWorker) {
          workerIdMap.set(nw.id, createdWorker.id)
        }
      }

      // 2. Prepare attendance rows to upsert
      const attendanceRows = entries.map(e => {
        const workerId = e.matchedWorkerId || workerIdMap.get(e.id)
        if (!workerId) {
          throw new Error(`Could not resolve ID for worker "${e.name}"`)
        }
        return {
          project_id: targetProjectId,
          worker_id: workerId,
          date: targetDate,
          status: e.status,
          present: e.status !== 'absent',
        }
      })

      // 3. Upsert attendance records
      const { error: attErr } = await supabase
        .from('attendance')
        .upsert(attendanceRows, { onConflict: 'project_id,worker_id,date' })

      if (attErr) {
        throw new Error(`Failed to save attendance: ${attErr.message}`)
      }

      toast.success(
        `Verified & saved attendance for ${entries.length} workers on ${targetDate}!`
      )
      onSuccess(targetDate, targetProjectId)
      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving scanned attendance.')
    } finally {
      setSaving(false)
    }
  }

  const projectNotDetected = !scannedData?.project_name

  return (
    <Modal open={open} onClose={onClose} title="Review Scanned Muster Roll Attendance" maxWidth="2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Missing Project Warning Banner if unstated on sheet */}
        {projectNotDetected && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Project Name was not detected on physical sheet</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Please assign this muster roll to the correct construction site using the Project selector below.
              </p>
            </div>
          </div>
        )}

        {/* Missing Wage Warning if new workers detected without daily rate */}
        {stats.missingWageCount > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">{stats.missingWageCount} new worker(s) have missing per-day wage rates</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                You can manually type their daily wage rates (₹/day) directly in the table below before saving.
              </p>
            </div>
          </div>
        )}

        {/* Global Settings: Project & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <FieldWrapper label="Assign to Project (Site)" required hint="Where this labor was deployed">
            <Select
              value={targetProjectId}
              onChange={e => setTargetProjectId(e.target.value)}
            >
              <option value="">Select Project Site...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Attendance Date" required hint="Date marked on muster roll">
            <Input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </FieldWrapper>
        </div>

        {/* Summary Metric Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
            Total: {entries.length} workers
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-semibold">
            {stats.present} Present
          </span>
          {stats.halfDay > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-semibold">
              {stats.halfDay} Half Day
            </span>
          )}
          {stats.overtime > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold">
              {stats.overtime} Overtime
            </span>
          )}
          {stats.absent > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-semibold">
              {stats.absent} Absent
            </span>
          )}
          {stats.newWorkers > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-semibold">
              +{stats.newWorkers} New Workers
            </span>
          )}
        </div>

        {/* Scanned Image Preview Collapsible Thumbnail */}
        {imagePreviewUrl && (
          <details className="group border border-slate-200 rounded-xl bg-slate-50/50 p-2.5 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Scanned Muster Roll Photo
              </span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Scanned Muster Roll"
                className="max-h-56 mx-auto rounded-lg border border-slate-300 object-contain shadow-sm"
              />
            </div>
          </details>
        )}

        {/* Interactive Worker Rows Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Worker Name</th>
                  <th className="py-2.5 px-2">Trade</th>
                  <th className="py-2.5 px-2">Daily Rate (₹)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 align-middle">
                      <Input
                        value={entry.name}
                        onChange={e => handleWorkerNameChange(entry.id, e.target.value)}
                        placeholder="Worker Name"
                        className="text-xs h-8"
                      />
                      <div className="mt-1">
                        {entry.isNew ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            + Will Register as New Worker
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Matches Team Member
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-2 align-middle w-28">
                      <Select
                        value={entry.trade}
                        onChange={e => handleUpdateEntry(entry.id, { trade: e.target.value })}
                        className="text-xs h-8"
                      >
                        {TRADES.map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </td>

                    <td className="py-2 px-2 align-middle w-28">
                      <CurrencyInput
                        value={entry.daily_wage_rate}
                        onChange={e => handleUpdateEntry(entry.id, { daily_wage_rate: e.target.value })}
                        placeholder="e.g. 700"
                        className={`text-xs h-8 ${
                          entry.isNew && !entry.daily_wage_rate
                            ? 'border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-200'
                            : ''
                        }`}
                      />
                    </td>

                    <td className="py-2 px-3 align-middle">
                      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateEntry(entry.id, { status: 'present' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            entry.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Full Day Present"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEntry(entry.id, { status: 'half_day' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            entry.status === 'half_day'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Half Day (0.5)"
                        >
                          HD
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEntry(entry.id, { status: 'overtime' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            entry.status === 'overtime'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Overtime"
                        >
                          OT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEntry(entry.id, { status: 'absent' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            entry.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Absent"
                        >
                          A
                        </button>
                      </div>
                    </td>

                    <td className="py-2 px-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove row"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={handleAddWorkerRow}
            >
              + Add Missing Worker Row
            </Button>
            <span className="text-[11px] text-slate-500">
              Total {entries.length} workers ready to apply
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            Confirm & Save Attendance
          </Button>
        </div>
      </div>
    </Modal>
  )
}

