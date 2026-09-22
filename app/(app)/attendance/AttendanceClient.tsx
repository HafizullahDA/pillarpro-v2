'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'
import { canCreateAttendance, canDeleteWorker } from '@/lib/permissions'
import { PrintPreviewModal } from '@/components/pdf/PrintPreviewModal'
import { AttendanceMusterRollPDF } from '@/components/pdf/AttendanceMusterRollPDF'
import { getClientOrganization, OrganizationProfile, DEFAULT_ORGANIZATION } from '@/lib/organization'
import { generateMusterRollWhatsAppText, generateMonthlyMusterRollWhatsAppText, openWhatsApp } from '@/lib/whatsapp'
import { compressImage } from '@/lib/imageCompress'
import { AttendanceScanConfirmModal } from '@/components/attendance/AttendanceScanConfirmModal'
import { DeleteWorkerModal } from '@/components/attendance/DeleteWorkerModal'
import { WageLedgerClient } from './WageLedgerClient'
import { saveOfflineSnapshot } from '@/lib/offline/db'
import { STANDARD_SHIFT_WORKING_HOURS, calculateHourlyWage, calculateOTDays, calculateOTWage } from '@/lib/calculations/attendance'

type Project = { id: string; name: string }
type Worker = { id: string; name: string; trade: string | null; daily_wage_rate: number | null }
type MonthAttendanceRow = {
  worker_id: string
  date: string
  status: string
  overtime_hours?: number | null
  notes?: string | null
}

const TRADES = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Welder', 'Painter', 'Driver', 'Operator', 'Supervisor', 'Other']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function AttendanceClient({
  projects,
  userRole,
  organizationId,
}: {
  projects: Project[]
  userRole?: string
  organizationId?: string
}) {
  const supabase = createClient()
  const canMark = canCreateAttendance(userRole)
  const canDelete = canDeleteWorker(userRole)

  const today = new Date()
  const [activeTab, setActiveTab] = useState<'attendance' | 'wages'>('attendance')
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [day, setDay]     = useState(today.getDate())

  const [workers, setWorkers]                 = useState<Worker[]>([])
  const [attendance, setAttendance]           = useState<Record<string, string>>({})
  const [overtimeMap, setOvertimeMap]         = useState<Record<string, number>>({})
  const [expandedOTWorkerId, setExpandedOTWorkerId] = useState<string | null>(null)
  const [monthAttendance, setMonthAttendance] = useState<MonthAttendanceRow[]>([])
  const [saving, setSaving]                   = useState(false)
  const [saveStatus, setSaveStatus]           = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [pdfOpen, setPdfOpen]                 = useState(false)
  const [org, setOrg]                         = useState<OrganizationProfile>(DEFAULT_ORGANIZATION)

  useEffect(() => {
    getClientOrganization().then(setOrg)
  }, [])

  // Worker drawer
  const [workerOpen, setWorkerOpen] = useState(false)
  const [wForm, setWForm]           = useState({ name: '', trade: 'Helper', daily_wage_rate: '' })
  const [wSaving, setWSaving]       = useState(false)
  const [wError, setWError]         = useState('')

  // OCR Muster Roll Scanning state
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scannedAttendanceData, setScannedAttendanceData] = useState<any>(null)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)

  const [loadingWorkers, setLoadingWorkers]   = useState(false)
  const [fetchError, setFetchError]           = useState('')

  // Adjust day if month has fewer days
  const daysInMonth = new Date(year, month, 0).getDate()
  const safeDay = Math.min(day, daysInMonth)
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`

  const loadWorkers = useCallback(async () => {
    setLoadingWorkers(true)
    setFetchError('')
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, trade, daily_wage_rate')
      .order('name')
    setLoadingWorkers(false)
    if (error) {
      setFetchError(`Failed to load workers: ${error.message}`)
      return
    }
    const workerList = data ?? []
    setWorkers(workerList)
    if (workerList.length > 0) {
      void saveOfflineSnapshot('/attendance', { workers: workerList, projects })
    }
  }, [supabase, projects])

  const loadMonthAttendance = useCallback(async () => {
    if (!projectId) return
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`
    const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

    let attData: MonthAttendanceRow[] = []
    const { data, error } = await supabase
      .from('attendance')
      .select('worker_id, date, status, notes, overtime_hours')
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error && (error.message?.includes('overtime_hours') || error.code === '42703')) {
      const { data: fbData, error: fbErr } = await supabase
        .from('attendance')
        .select('worker_id, date, status, notes')
        .eq('project_id', projectId)
        .gte('date', startDate)
        .lte('date', endDate)
      if (fbErr) {
        setFetchError(`Failed to load monthly attendance: ${fbErr.message}`)
        return
      }
      attData = fbData ?? []
    } else if (error) {
      setFetchError(`Failed to load monthly attendance: ${error.message}`)
      return
    } else {
      attData = data ?? []
    }

    setMonthAttendance(attData)
  }, [projectId, year, month, daysInMonth, supabase])

  // Load workers and monthly attendance records
  useEffect(() => {
    if (projectId) {
      loadWorkers()
      loadMonthAttendance()
    }
  }, [projectId, loadWorkers, loadMonthAttendance])

  // Map active day's attendance whenever day, dateStr, or monthAttendance changes
  useEffect(() => {
    const map: Record<string, string> = {}
    const otMap: Record<string, number> = {}

    for (const r of monthAttendance) {
      if (r.date === dateStr) {
        map[r.worker_id] = r.status
        let ot = Number(r.overtime_hours) || 0
        if (!ot && r.notes) {
          const match = r.notes.match(/OT:\s*([0-9.]+)\s*h?/i)
          if (match && match[1]) ot = parseFloat(match[1]) || 0
        }
        if (!ot && r.status === 'overtime') ot = 4
        if (ot > 0) otMap[r.worker_id] = ot
      }
    }
    setAttendance(map)
    setOvertimeMap(otMap)
  }, [dateStr, monthAttendance])

  const setStatus = (workerId: string, status: string) => {
    setAttendance(a => {
      const next = a[workerId] === status ? '' : status
      // If setting to absent, clear overtime for this worker
      if (next === 'absent' || next === '') {
        setOvertimeMap(prev => {
          const c = { ...prev }
          delete c[workerId]
          return c
        })
      } else if (next === 'overtime') {
        // If clicking OT button, default to 2.0 hrs OT if none set
        setOvertimeMap(prev => ({
          ...prev,
          [workerId]: prev[workerId] && prev[workerId] > 0 ? prev[workerId] : 2.0,
        }))
        setExpandedOTWorkerId(workerId)
      }
      return { ...a, [workerId]: next }
    })
    // Clear any previous save notifications on modification
    if (saveStatus) setSaveStatus(null)
  }

  const setWorkerOvertime = (workerId: string, hours: number) => {
    const cleanHours = Math.max(0, Math.min(24, Number(hours) || 0))
    setOvertimeMap(prev => {
      const c = { ...prev }
      if (cleanHours <= 0) {
        delete c[workerId]
      } else {
        c[workerId] = cleanHours
      }
      return c
    })
    // If worker doesn't have a status marked yet or was absent, mark them as 'present' when OT is added
    if (cleanHours > 0) {
      setAttendance(a => {
        if (!a[workerId] || a[workerId] === 'absent') {
          return { ...a, [workerId]: 'present' }
        }
        return a
      })
    }
    if (saveStatus) setSaveStatus(null)
  }

  const saveAttendance = async () => {
    setSaving(true)
    setSaveStatus(null)

    const rows = workers
      .filter(w => attendance[w.id] || (overtimeMap[w.id] && overtimeMap[w.id] > 0))
      .map(w => {
        const s = attendance[w.id] || (overtimeMap[w.id] ? 'present' : 'absent')
        const ot = overtimeMap[w.id] || 0
        const noteText = ot > 0 ? `OT:${ot}h` : null
        return {
          project_id: projectId,
          worker_id: w.id,
          date: dateStr,
          status: s,
          present: s !== 'absent',
          overtime_hours: ot,
          notes: noteText,
        }
      })

    if (!rows.length) {
      setSaving(false)
      setSaveStatus({ type: 'info', message: 'No attendance marked to save for this date.' })
      return
    }

    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const { saveToOfflineQueue } = await import('@/lib/offline/db')
        await saveToOfflineQueue('attendance', rows)
        setSaving(false)
        setSaveStatus({ type: 'success', message: 'Offline: Attendance saved locally. Will auto-sync when network returns.' })
        return
      } catch {
        setSaving(false)
        setSaveStatus({ type: 'error', message: 'Failed to save offline attendance locally.' })
        return
      }
    }

    let saveError = null
    const { error: upsertErr } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'project_id,worker_id,date' })

    if (upsertErr && (upsertErr.message?.includes('overtime_hours') || upsertErr.code === '42703')) {
      const fallbackRows = rows.map(({ overtime_hours, ...rest }) => rest)
      const { error: fbErr } = await supabase
        .from('attendance')
        .upsert(fallbackRows, { onConflict: 'project_id,worker_id,date' })
      saveError = fbErr
    } else {
      saveError = upsertErr
    }

    setSaving(false)

    if (saveError) {
      setSaveStatus({ type: 'error', message: `Failed to save attendance: ${saveError.message}` })
      return
    }

    setSaveStatus({
      type: 'success',
      message: `Attendance for ${String(safeDay).padStart(2,'0')} ${MONTH_NAMES[month-1]} ${year} saved successfully!`
    })

    // Refresh month attendance data to reflect updated work day counts
    loadMonthAttendance()
  }

  const handleScanMusterRoll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setSaveStatus(null)

    try {
      const base64Str = await compressImage(file)
      setScanPreviewUrl(base64Str)

      const res = await fetch('/api/scan-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Str }),
      })

      const json = await res.json()
      setScanning(false)

      if (!res.ok || json.error) {
        setSaveStatus({ type: 'error', message: json.error || 'Failed to scan muster roll image.' })
        return
      }

      setScannedAttendanceData(json.data)
      setScanModalOpen(true)
    } catch (err: any) {
      setScanning(false)
      setSaveStatus({ type: 'error', message: err.message || 'Error processing muster roll photo.' })
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const handleScanSuccess = async (savedDate: string, targetProjectId: string) => {
    if (targetProjectId !== projectId) {
      setProjectId(targetProjectId)
    }
    const parts = savedDate.split('-').map(Number)
    if (parts[0] && parts[1] && parts[2]) {
      setYear(parts[0])
      setMonth(parts[1])
      setDay(parts[2])
    }
    await loadWorkers()
    await loadMonthAttendance()
  }

  const saveWorker = async () => {
    if (!wForm.name.trim()) { setWError('Name is required.'); return }
    setWSaving(true); setWError('')

    let effectiveOrgId = organizationId
    if (!effectiveOrgId) {
      try {
        const { data } = await supabase.rpc('get_user_organization_id')
        if (data) effectiveOrgId = data
      } catch {
        // fallback
      }
    }

    const { error } = await supabase.from('workers').insert({
      name: wForm.name.trim(),
      trade: wForm.trade,
      daily_wage_rate: wForm.daily_wage_rate ? parseFloat(wForm.daily_wage_rate) : 0,
      ...(effectiveOrgId ? { organization_id: effectiveOrgId } : {}),
    })
    setWSaving(false)
    if (error) { setWError(error.message); return }
    setWorkerOpen(false)
    setWForm({ name: '', trade: 'Helper', daily_wage_rate: '' })
    loadWorkers()
  }

  // Summary calculations for the active day (7 net working hours + 1 hr break standard)
  const onSite    = workers.filter(w => attendance[w.id] === 'present' || attendance[w.id] === 'overtime').length
  const halfDay   = workers.filter(w => attendance[w.id] === 'half_day').length
  const unmarked  = workers.filter(w => !attendance[w.id]).length
  const totalDayOT = workers.reduce((sum, w) => sum + (overtimeMap[w.id] || (attendance[w.id] === 'overtime' ? 3.5 : 0)), 0)

  const dayCost   = workers.reduce((sum, w) => {
    const s = attendance[w.id]
    const rate = w.daily_wage_rate ?? 0
    let base = 0
    if (s === 'present' || s === 'overtime') base = rate
    else if (s === 'half_day') base = rate / 2

    const ot = overtimeMap[w.id] || (s === 'overtime' ? 3.5 : 0)
    const otCost = calculateOTWage(ot, rate)
    return sum + base + otCost
  }, 0)

  // Memoized worker totals and breakdown for the entire month (used for Muster Roll PDF & WhatsApp export)
  const monthlyStats = useMemo(() => {
    let totalDays = 0
    let totalWages = 0
    let totalOTHours = 0

    const workerStats = workers.map(w => {
      const records = monthAttendance.filter(r => r.worker_id === w.id)
      const fullDays = records.filter(r => r.status === 'present').length
      const halfDays = records.filter(r => r.status === 'half_day').length
      const otHours = records.reduce((sum, r) => {
        let h = Number(r.overtime_hours) || 0
        if (!h && r.notes) {
          const match = r.notes.match(/OT:\s*([0-9.]+)\s*h?/i)
          if (match && match[1]) h = parseFloat(match[1]) || 0
        }
        if (!h && r.status === 'overtime') h = 3.5
        return sum + h
      }, 0)
      const otDays = calculateOTDays(otHours)
      const totalDaysWorker = fullDays + halfDays * 0.5 + otDays
      const rate = w.daily_wage_rate ?? 0
      const totalWage = totalDaysWorker * rate

      totalDays += totalDaysWorker
      totalWages += totalWage
      totalOTHours += otHours

      return {
        ...w,
        fullDays,
        halfDays,
        overtimeHours: otHours,
        totalDays: totalDaysWorker,
        totalWage,
      }
    })

    return { workerStats, totalDays, totalWages, totalOTHours }
  }, [workers, monthAttendance])

  // Day strip
  const dayList = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dow = new Date(year, month - 1, d).getDay()
    return { d, dow }
  })

  return (
    <div>
      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Daily Muster Roll
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wages')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'wages'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Wage Ledger & Settlements
        </button>
      </div>

      {activeTab === 'wages' ? (
        <WageLedgerClient
          projects={projects}
          selectedProjectId={projectId}
          onSelectProject={setProjectId}
          userRole={userRole}
        />
      ) : (
        <>
          {fetchError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4 text-sm text-red-700">
              {fetchError}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-5">
            <select
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {canMark && (
          <>
            <div className="inline-flex items-center rounded-xl bg-blue-50/80 border border-blue-200 p-0.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={scanning}
                onClick={() => cameraInputRef.current?.click()}
                className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2.5 shadow-none"
                title="Capture photo of physical muster roll / labor diary"
              >
                <span className="mr-1">📷</span>
                <span>Scan Muster Roll</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={scanning}
                onClick={() => galleryInputRef.current?.click()}
                className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2 shadow-none"
                title="Upload muster roll photo / PDF"
              >
                <span>🖼️</span>
              </Button>
            </div>

            <Button variant="secondary" size="sm" onClick={() => setWorkerOpen(true)}>
              Manage Workers
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPdfOpen(true)}
          className="inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Muster Roll (PDF)
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
            const projName = projects.find(p => p.id === projectId)?.name || 'Project Site'
            const activeWorkers = workers
              .filter(w => attendance[w.id] === 'present' || attendance[w.id] === 'half_day' || attendance[w.id] === 'overtime' || (overtimeMap[w.id] && overtimeMap[w.id] > 0))
              .map(w => ({
                name: w.name,
                trade: w.trade,
                status: attendance[w.id] || 'present',
                daily_wage_rate: w.daily_wage_rate,
                overtimeHours: overtimeMap[w.id] || (attendance[w.id] === 'overtime' ? 4 : 0),
              }))
            openWhatsApp(generateMusterRollWhatsAppText(dateStr, projName, onSite, dayCost, org, activeWorkers))
          }}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          title="Share daily attendance report via WhatsApp"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          WhatsApp
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <SummaryTile label="Workers"   value={String(workers.length)} accent="slate"   />
        <SummaryTile label="On Site"   value={String(onSite)}         accent="emerald" />
        <SummaryTile label="Half Day"  value={String(halfDay)}        accent="amber"   />
        <SummaryTile label="Overtime"  value={`${totalDayOT} hrs`}    accent="blue"    />
        <SummaryTile label="Day Cost"  value={formatINR(dayCost)}     accent="blue"    />
      </div>

      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5">
        {dayList.map(({ d, dow }) => (
          <button
            key={d}
            onClick={() => {
              setDay(d)
              if (saveStatus) setSaveStatus(null)
            }}
            className={`flex-none flex flex-col items-center px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              d === safeDay
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{String(d).padStart(2,'0')}</span>
            <span className="text-[10px] opacity-70 mt-0.5">{DAYS[dow]}</span>
          </button>
        ))}
      </div>

      {/* Save Status Notification */}
      {saveStatus && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 flex items-center justify-between transition-all ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : saveStatus.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{saveStatus.type === 'success' ? '✓' : saveStatus.type === 'error' ? '✕' : 'ℹ'}</span>
            <span className="font-medium">{saveStatus.message}</span>
          </div>
          <button
            onClick={() => setSaveStatus(null)}
            className="text-xs font-semibold px-2 py-0.5 rounded opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Worker list */}
      {!workers.length ? (
        <EmptyState
          title="No workers added yet"
          description="Add workers first using the 'Manage Workers' button."
          action={canMark ? <Button size="sm" onClick={() => setWorkerOpen(true)}>Add Worker</Button> : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4 shadow-sm">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {String(safeDay).padStart(2,'0')} {MONTH_NAMES[month-1]} {year} {canMark ? '— Tap to mark' : '— Daily Record'}
              </p>
              <span className="text-[11px] text-slate-400">
                Current month: {MONTH_NAMES[month-1]} {year}
              </span>
            </div>
            {workers.map(w => {
              const s = attendance[w.id] ?? ''

              // Calculate total work days in this month for this worker:
              // Saved days in month (excluding current date) + active selection for current date
              const otherDaysWorked = monthAttendance
                .filter(r => r.worker_id === w.id && r.date !== dateStr)
                .reduce((sum, r) => {
                  let ot = Number(r.overtime_hours) || 0
                  if (!ot && r.notes) {
                    const match = r.notes.match(/OT:\s*([0-9.]+)\s*h?/i)
                    if (match && match[1]) ot = parseFloat(match[1]) || 0
                  }
                  if (!ot && r.status === 'overtime') ot = 3.5
                  const base = r.status === 'present' || r.status === 'overtime' ? 1 : r.status === 'half_day' ? 0.5 : 0
                  return sum + base + calculateOTDays(ot)
                }, 0)

              const activeBaseWorked = s === 'present' || s === 'overtime' ? 1 : s === 'half_day' ? 0.5 : 0
              const activeOT = overtimeMap[w.id] || (s === 'overtime' ? 3.5 : 0)
              const activeOTWorked = calculateOTDays(activeOT)
              const totalDaysWorked = otherDaysWorked + activeBaseWorked + activeOTWorked

              const isExpandedOT = expandedOTWorkerId === w.id
              const currentOT = overtimeMap[w.id] || (s === 'overtime' ? 3.5 : 0)
              const hourlyWage = Math.round(calculateHourlyWage(w.daily_wage_rate))
              const currentOTWage = Math.round(calculateOTWage(currentOT, w.daily_wage_rate))

              return (
                <div key={w.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{w.name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          {totalDaysWorked % 1 === 0 ? totalDaysWorked : totalDaysWorked.toFixed(1)} {totalDaysWorked === 1 ? 'day' : 'days'} worked
                        </span>
                        {currentOT > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedOTWorkerId(isExpandedOT ? null : w.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Click to edit manual overtime hours"
                          >
                            <span>⚡</span>
                            <span>{currentOT}h OT</span>
                            {w.daily_wage_rate ? <span className="opacity-80">(+₹{currentOTWage})</span> : null}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setWorkerToDelete(w)}
                            className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={`Delete ${w.name}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-500">{w.trade ?? 'Worker'} · {formatINR(w.daily_wage_rate)}/day</p>
                        {canMark && s && s !== 'absent' && currentOT === 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedOTWorkerId(isExpandedOT ? null : w.id)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>+ Add OT</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Attendance Status Buttons: P, H, OT, A */}
                    <div className="flex gap-1.5 flex-none items-center">
                      {(['present', 'half_day', 'overtime', 'absent'] as const).map(status => (
                        <button
                          key={status}
                          disabled={!canMark}
                          onClick={() => canMark && setStatus(w.id, status)}
                          className={`min-w-[34px] h-8 px-2 rounded-lg text-xs font-semibold border transition-all ${
                            !canMark ? 'cursor-default opacity-80 ' : 'cursor-pointer'
                          }${
                            s === status
                              ? status === 'present'  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : status === 'half_day' ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : status === 'overtime' ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              :                         'bg-red-500 text-white border-red-500 shadow-sm'
                              : (status === 'overtime' && currentOT > 0)
                              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={
                            status === 'present'
                              ? 'Present (1.0 Full Day)'
                              : status === 'half_day'
                              ? 'Half Day (0.5 Day)'
                              : status === 'overtime'
                              ? 'Overtime Shift / Toggle OT'
                              : 'Absent (0 Days)'
                          }
                        >
                          {status === 'present' ? 'P' : status === 'half_day' ? 'H' : status === 'overtime' ? 'OT' : 'A'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Overtime Editor Dropdown Panel */}
                  {isExpandedOT && canMark && (
                    <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/90 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>⏱️</span>
                          <span>Manual Overtime (OT) — {w.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedOTWorkerId(null)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                        >
                          ✕ Done
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={currentOT > 0 ? currentOT : ''}
                            placeholder="0"
                            onChange={e => setWorkerOvertime(w.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 tabular-nums bg-white"
                          />
                          <span className="ml-1.5 text-xs font-semibold text-slate-500">hrs</span>
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {[1, 2, 3.5, 7].map(h => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setWorkerOvertime(w.id, h)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                currentOT === h
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              +{h}h {h === 3.5 ? '(½ Shift)' : h === 7 ? '(Full Shift)' : ''}
                            </button>
                          ))}
                          {currentOT > 0 && (
                            <button
                              type="button"
                              onClick={() => setWorkerOvertime(w.id, 0)}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Realtime Rate Breakdown */}
                      <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between flex-wrap gap-2">
                        <span>
                          Hourly Rate: <strong>₹{hourlyWage}/hr</strong> <span className="text-slate-400 font-normal">(Rate ÷ 7h net work · 9am–5pm minus 1–2pm break)</span>
                        </span>
                        <span>
                          OT Accrual: <strong className="text-blue-700 font-bold">+{formatINR(currentOTWage)}</strong> ({calculateOTDays(currentOT).toFixed(2)}d)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {canMark && (
            <Button loading={saving} onClick={saveAttendance} className="w-full shadow-sm py-2.5">
              Save Attendance
            </Button>
          )}
        </>
      )}

      {/* Manage Workers Drawer */}
      <Drawer
        open={workerOpen}
        onClose={() => setWorkerOpen(false)}
        title="Manage Workers"
        size="lg"
        footer={
          <div className="flex w-full justify-end">
            <Button variant="secondary" onClick={() => setWorkerOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pb-6">
          {/* Add Worker Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Add New Worker</h3>
            {wError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {wError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrapper label="Full Name" required>
                <Input
                  placeholder="e.g. Raju Singh"
                  value={wForm.name}
                  onChange={e => setWForm(f => ({ ...f, name: e.target.value }))}
                />
              </FieldWrapper>
              <FieldWrapper label="Trade / Role" required>
                <Select
                  value={wForm.trade}
                  onChange={e => setWForm(f => ({ ...f, trade: e.target.value }))}
                >
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FieldWrapper>
            </div>
            <FieldWrapper label="Daily Wage (₹)" hint="Used to calculate daily muster roll cost">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">₹</span>
                <Input
                  type="number"
                  min="0"
                  className="pl-8 tabular-nums"
                  placeholder="700"
                  value={wForm.daily_wage_rate}
                  onChange={e => setWForm(f => ({ ...f, daily_wage_rate: e.target.value }))}
                />
              </div>
            </FieldWrapper>
            <Button
              className="w-full shadow-sm"
              loading={wSaving}
              onClick={saveWorker}
            >
              Add Worker to Roster
            </Button>
          </div>

          {/* Existing Workers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Registered Workers ({workers.length})
              </h3>
            </div>

            {!workers.length ? (
              <p className="text-xs text-slate-400 py-3 text-center">No workers registered yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {workers.map(w => {
                  const daysCount = monthAttendance.filter(r => r.worker_id === w.id).length
                  return (
                    <div key={w.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                      <div className="pr-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 truncate">{w.name}</p>
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {w.trade || 'Helper'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatINR(w.daily_wage_rate)}/day · {daysCount} {daysCount === 1 ? 'day' : 'days'} logged this month
                        </p>
                      </div>
                      {canDelete && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setWorkerToDelete(w)}
                          className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 h-8 px-2.5 shadow-none flex items-center gap-1 shrink-0"
                          title={`Delete ${w.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Printable Labor Muster Roll & Wage Sheet Modal */}
      <PrintPreviewModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title={`Labor Muster Roll — ${MONTH_NAMES[month - 1]} ${year}`}
        subtitle={projects.find(p => p.id === projectId)?.name || 'Project Attendance'}
        whatsappText={generateMonthlyMusterRollWhatsAppText({
          monthName: MONTH_NAMES[month - 1],
          year,
          projectName: projects.find(p => p.id === projectId)?.name || 'Project Site',
          org,
          workers: monthlyStats.workerStats,
          totalDays: monthlyStats.totalDays,
          totalWages: monthlyStats.totalWages,
        })}
      >
        <AttendanceMusterRollPDF
          projectName={projects.find(p => p.id === projectId)?.name || 'Project Site'}
          month={month}
          year={year}
          monthName={MONTH_NAMES[month - 1]}
          workers={workers}
          monthAttendance={monthAttendance}
          organization={org}
        />
      </PrintPreviewModal>

      {/* Hidden OCR File Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleScanMusterRoll}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*,.pdf"
        onChange={handleScanMusterRoll}
        className="hidden"
      />

      {/* Interactive OCR Confirmation Modal */}
      <AttendanceScanConfirmModal
        open={scanModalOpen}
        onClose={() => {
          setScanModalOpen(false)
          setScannedAttendanceData(null)
          setScanPreviewUrl(null)
        }}
        projects={projects}
        initialProjectId={projectId}
        existingWorkers={workers}
        scannedData={scannedAttendanceData}
        imagePreviewUrl={scanPreviewUrl}
        organizationId={organizationId}
        onSuccess={handleScanSuccess}
      />

      {/* Delete Worker Confirmation Modal */}
      <DeleteWorkerModal
        open={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        worker={workerToDelete}
        attendanceCount={
          workerToDelete
            ? monthAttendance.filter(r => r.worker_id === workerToDelete.id).length
            : 0
        }
        onSuccess={() => {
          setWorkerToDelete(null)
          loadWorkers()
          loadMonthAttendance()
        }}
      />
        </>
      )}
    </div>
  )
}
