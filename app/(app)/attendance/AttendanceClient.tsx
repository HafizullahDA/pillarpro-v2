'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'
import { canCreateAttendance } from '@/lib/permissions'
import { PrintPreviewModal } from '@/components/pdf/PrintPreviewModal'
import { AttendanceMusterRollPDF } from '@/components/pdf/AttendanceMusterRollPDF'
import { getClientOrganization, OrganizationProfile, DEFAULT_ORGANIZATION } from '@/lib/organization'
import { WageLedgerClient } from './WageLedgerClient'

type Project = { id: string; name: string }
type Worker = { id: string; name: string; trade: string | null; daily_wage_rate: number | null }
type MonthAttendanceRow = { worker_id: string; date: string; status: string }

const TRADES = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Welder', 'Painter', 'Driver', 'Operator', 'Supervisor', 'Other']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function AttendanceClient({ projects, userRole }: { projects: Project[]; userRole?: string }) {
  const supabase = createClient()
  const canMark = canCreateAttendance(userRole)

  const today = new Date()
  const [activeTab, setActiveTab] = useState<'attendance' | 'wages'>('attendance')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [day, setDay]     = useState(today.getDate())

  const [workers, setWorkers]                 = useState<Worker[]>([])
  const [attendance, setAttendance]           = useState<Record<string, string>>({})
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

  // Adjust day if month has fewer days
  const daysInMonth = new Date(year, month, 0).getDate()
  const safeDay = Math.min(day, daysInMonth)
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`

  const loadWorkers = useCallback(async () => {
    const { data } = await supabase
      .from('workers')
      .select('id, name, trade, daily_wage_rate')
      .order('name')
    setWorkers(data ?? [])
  }, [supabase])

  const loadMonthAttendance = useCallback(async () => {
    if (!projectId) return
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`
    const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

    const { data } = await supabase
      .from('attendance')
      .select('worker_id, date, status')
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate)

    setMonthAttendance(data ?? [])
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
    for (const r of monthAttendance) {
      if (r.date === dateStr) {
        map[r.worker_id] = r.status
      }
    }
    setAttendance(map)
  }, [dateStr, monthAttendance])

  const setStatus = (workerId: string, status: string) => {
    setAttendance(a => ({ ...a, [workerId]: a[workerId] === status ? '' : status }))
    // Clear any previous save notifications on modification
    if (saveStatus) setSaveStatus(null)
  }

  const saveAttendance = async () => {
    setSaving(true)
    setSaveStatus(null)

    const rows = workers
      .filter(w => attendance[w.id])
      .map(w => ({
        project_id: projectId,
        worker_id: w.id,
        date: dateStr,
        status: attendance[w.id],
        present: attendance[w.id] !== 'absent',
      }))

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

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'project_id,worker_id,date' })

    setSaving(false)

    if (error) {
      setSaveStatus({ type: 'error', message: `Failed to save attendance: ${error.message}` })
      return
    }

    setSaveStatus({
      type: 'success',
      message: `Attendance for ${String(safeDay).padStart(2,'0')} ${MONTH_NAMES[month-1]} ${year} saved successfully!`
    })

    // Refresh month attendance data to reflect updated work day counts
    loadMonthAttendance()
  }

  const saveWorker = async () => {
    if (!wForm.name.trim()) { setWError('Name is required.'); return }
    setWSaving(true); setWError('')
    const { error } = await supabase.from('workers').insert({
      name: wForm.name.trim(),
      trade: wForm.trade,
      daily_wage_rate: wForm.daily_wage_rate ? parseFloat(wForm.daily_wage_rate) : 0,
    })
    setWSaving(false)
    if (error) { setWError(error.message); return }
    setWorkerOpen(false)
    setWForm({ name: '', trade: 'Helper', daily_wage_rate: '' })
    loadWorkers()
  }

  // Summary calculations for the active day
  const onSite    = workers.filter(w => attendance[w.id] === 'present').length
  const halfDay   = workers.filter(w => attendance[w.id] === 'half_day').length
  const unmarked  = workers.filter(w => !attendance[w.id]).length
  const dayCost   = workers.reduce((sum, w) => {
    const s = attendance[w.id]
    if (s === 'present')  return sum + (w.daily_wage_rate ?? 0)
    if (s === 'half_day') return sum + (w.daily_wage_rate ?? 0) / 2
    return sum
  }, 0)

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
          <Button variant="secondary" size="sm" onClick={() => setWorkerOpen(true)}>
            Manage Workers
          </Button>
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
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryTile label="Workers"  value={String(workers.length)} accent="slate"   />
        <SummaryTile label="On Site"  value={String(onSite)}         accent="emerald" />
        <SummaryTile label="Unmarked" value={String(unmarked)}       accent="amber"   />
        <SummaryTile label="Day Cost" value={formatINR(dayCost)}     accent="blue"    />
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
                  if (r.status === 'present')  return sum + 1
                  if (r.status === 'half_day') return sum + 0.5
                  return sum
                }, 0)

              const activeDayWorked = s === 'present' ? 1 : s === 'half_day' ? 0.5 : 0
              const totalDaysWorked = otherDaysWorked + activeDayWorked

              return (
                <div key={w.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{w.name}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                        {totalDaysWorked} {totalDaysWorked === 1 ? 'day' : 'days'} worked
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{w.trade ?? 'Worker'} · {formatINR(w.daily_wage_rate)}/day</p>
                  </div>
                  <div className="flex gap-1.5 flex-none">
                    {(['present','half_day','absent'] as const).map(status => (
                      <button
                        key={status}
                        disabled={!canMark}
                        onClick={() => canMark && setStatus(w.id, status)}
                        className={`w-9 h-8 rounded-lg text-xs font-semibold border transition-all ${
                          !canMark ? 'cursor-default opacity-80 ' : ''
                        }${
                          s === status
                            ? status === 'present'  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : status === 'half_day' ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            :                         'bg-red-500 text-white border-red-500 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {status === 'present' ? 'P' : status === 'half_day' ? 'H' : 'A'}
                      </button>
                    ))}
                  </div>
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
      <Drawer open={workerOpen} onClose={() => setWorkerOpen(false)} title="Add Worker"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWorkerOpen(false)}>Cancel</Button><Button className="flex-1" loading={wSaving} onClick={saveWorker}>Save Worker</Button></div>}>
        <div className="space-y-4">
          {wError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{wError}</div>}
          <FieldWrapper label="Full Name" required>
            <Input placeholder="Raju Singh" value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Trade / Role" required>
            <Select value={wForm.trade} onChange={e => setWForm(f => ({ ...f, trade: e.target.value }))}>
              {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Daily Wage" hint="Used to calculate day cost">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">&#8377;</span>
              <Input type="number" min="0" className="pl-8 tabular-nums" placeholder="700" value={wForm.daily_wage_rate} onChange={e => setWForm(f => ({ ...f, daily_wage_rate: e.target.value }))} />
            </div>
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Printable Labor Muster Roll & Wage Sheet Modal */}
      <PrintPreviewModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title={`Labor Muster Roll — ${MONTH_NAMES[month - 1]} ${year}`}
        subtitle={projects.find(p => p.id === projectId)?.name || 'Project Attendance'}
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
        </>
      )}
    </div>
  )
}
