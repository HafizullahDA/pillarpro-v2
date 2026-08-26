'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'

type Project = { id: string; name: string }
type Worker = { id: string; name: string; trade: string | null; daily_wage_rate: number | null }
type AttendanceRecord = { worker_id: string; status: string }

const TRADES = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Welder', 'Painter', 'Driver', 'Operator', 'Supervisor', 'Other']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AttendanceClient({ projects }: { projects: Project[] }) {
  const supabase = createClient()

  const today = new Date()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [day, setDay]     = useState(today.getDate())

  const [workers, setWorkers]       = useState<Worker[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)

  // Worker drawer
  const [workerOpen, setWorkerOpen] = useState(false)
  const [wForm, setWForm]           = useState({ name: '', trade: 'Helper', daily_wage_rate: '' })
  const [wSaving, setWSaving]       = useState(false)
  const [wError, setWError]         = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (projectId) loadWorkers() }, [projectId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (projectId) loadAttendance() }, [projectId, year, month, day])


  const loadWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('id, name, trade, daily_wage_rate')
      .order('name')
    setWorkers(data ?? [])
  }

  const loadAttendance = async () => {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const { data } = await supabase
      .from('attendance')
      .select('worker_id, status')
      .eq('project_id', projectId)
      .eq('date', dateStr)
    const map: Record<string, string> = {}
    for (const r of (data ?? [])) map[r.worker_id] = r.status
    setAttendance(map)
  }

  const setStatus = (workerId: string, status: string) => {
    setAttendance(a => ({ ...a, [workerId]: a[workerId] === status ? '' : status }))
  }

  const saveAttendance = async () => {
    setSaving(true)
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const rows = workers
      .filter(w => attendance[w.id])
      .map(w => ({ project_id: projectId, worker_id: w.id, date: dateStr, status: attendance[w.id] }))

    if (rows.length) {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        try {
          const { saveToOfflineQueue } = await import('@/lib/offline/db')
          await saveToOfflineQueue('attendance', rows)
          setSaving(false)
          alert('Offline: Attendance saved locally. Will auto-sync when network returns.')
          return
        } catch {
          setSaving(false)
          alert('Failed to save offline attendance locally.')
          return
        }
      }

      await supabase.from('attendance')
        .upsert(rows, { onConflict: 'project_id,worker_id,date' })
    }
    setSaving(false)
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

  // Summary calculations
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
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayList = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dow = new Date(year, month - 1, d).getDay()
    return { d, dow }
  })

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div>
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
        <Button variant="secondary" size="sm" onClick={() => setWorkerOpen(true)}>
          Manage Workers
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
            onClick={() => setDay(d)}
            className={`flex-none flex flex-col items-center px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              d === day
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{String(d).padStart(2,'0')}</span>
            <span className="text-[10px] opacity-70 mt-0.5">{DAYS[dow]}</span>
          </button>
        ))}
      </div>

      {/* Worker list */}
      {!workers.length ? (
        <EmptyState
          title="No workers added yet"
          description="Add workers first using the 'Manage Workers' button."
          action={<Button size="sm" onClick={() => setWorkerOpen(true)}>Add Worker</Button>}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {String(day).padStart(2,'0')} {MONTH_NAMES[month-1]} {year} — Tap to mark
              </p>
            </div>
            {workers.map(w => {
              const s = attendance[w.id] ?? ''
              return (
                <div key={w.id} className="flex items-center px-4 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-500">{w.trade ?? 'Worker'} · {formatINR(w.daily_wage_rate)}/day</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    {(['present','half_day','absent'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setStatus(w.id, status)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          s === status
                            ? status === 'present'  ? 'bg-emerald-500 text-white border-emerald-500'
                            : status === 'half_day' ? 'bg-amber-400 text-white border-amber-400'
                            :                         'bg-red-400 text-white border-red-400'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
          <Button loading={saving} onClick={saveAttendance} className="w-full">
            Save Attendance
          </Button>
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
    </div>
  )
}
