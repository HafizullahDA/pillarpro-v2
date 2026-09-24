'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  getAllOfflineSnapshots,
  getOfflineQueue,
  removeFromOfflineQueue,
  saveToOfflineQueue,
  saveOfflineSnapshot,
  QueuedItem
} from '@/lib/offline/db'
import { flushOfflineQueue } from '@/lib/offline/syncEngine'
import { formatINR } from '@/lib/format'

type SnapshotMap = Record<string, { payload: any; savedAt: number }>

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

export function OfflineSnapshotViewer() {
  const [snapshots, setSnapshots] = useState<SnapshotMap>({})
  const [queue, setQueue] = useState<QueuedItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Quick Action form states
  const [entryType, setEntryType] = useState<'expense' | 'attendance' | 'diesel'>('attendance')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [customProjectName, setCustomProjectName] = useState<string>('')

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Fuel / Diesel')
  const [expensePaidTo, setExpensePaidTo] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')

  // Attendance states (Individual Worker Muster Roll & Aggregate Fallback)
  const [attendanceMode, setAttendanceMode] = useState<'individual' | 'aggregate'>('individual')
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceCount, setAttendanceCount] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'half_day' | 'overtime' | 'absent'>>({})
  const [overtimeMap, setOvertimeMap] = useState<Record<string, number>>({})
  const [workerNotesMap, setWorkerNotesMap] = useState<Record<string, string>>({})
  const [workerSearch, setWorkerSearch] = useState('')
  const [workerTradeFilter, setWorkerTradeFilter] = useState('ALL')

  // Offline Worker directory & creation modal state
  const [localWorkers, setLocalWorkers] = useState<any[]>([])
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false)
  const [newWorkerName, setNewWorkerName] = useState('')
  const [newWorkerTrade, setNewWorkerTrade] = useState('Helper')
  const [newWorkerRate, setNewWorkerRate] = useState('')
  const [newWorkerSaving, setNewWorkerSaving] = useState(false)

  // Diesel form
  const [dieselMachine, setDieselMachine] = useState('')
  const [dieselLiters, setDieselLiters] = useState('')
  const [dieselMeter, setDieselMeter] = useState('')
  const [dieselVendor, setDieselVendor] = useState('')

  const refreshData = useCallback(async () => {
    try {
      const [allSnaps, q] = await Promise.all([
        getAllOfflineSnapshots(),
        getOfflineQueue()
      ])
      setSnapshots(allSnaps)
      setQueue(q)
    } catch (e) {
      console.error('Failed to load offline data:', e)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  // Extract all known projects from any cached snapshot
  const availableProjects = useMemo(() => {
    const map = new Map<string, string>()
    const dashProjects = snapshots['/dashboard']?.payload?.projects
    if (Array.isArray(dashProjects)) {
      dashProjects.forEach((p: any) => { if (p?.id && p?.name) map.set(p.id, p.name) })
    }
    const projProjects = snapshots['/projects']?.payload?.projects
    if (Array.isArray(projProjects)) {
      projProjects.forEach((p: any) => { if (p?.id && p?.name) map.set(p.id, p.name) })
    }
    const suppProjects = snapshots['/suppliers']?.payload?.projects
    if (Array.isArray(suppProjects)) {
      suppProjects.forEach((p: any) => { if (p?.id && p?.name) map.set(p.id, p.name) })
    }
    const billProjects = snapshots['/ra-bills']?.payload?.projects
    if (Array.isArray(billProjects)) {
      billProjects.forEach((p: any) => { if (p?.id && p?.name) map.set(p.id, p.name) })
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [snapshots])

  // Automatically select first project when available
  useEffect(() => {
    if (availableProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(availableProjects[0].id)
    }
  }, [availableProjects, selectedProjectId])

  // Merge cached workers with offline-queued workers
  useEffect(() => {
    const cachedWorkers: any[] = snapshots['/attendance']?.payload?.workers || []
    const queuedWorkers: any[] = queue
      .filter((q) => q.type === 'worker')
      .map((q) => ({ ...q.payload, is_offline: true }))

    const map = new Map<string, any>()
    cachedWorkers.forEach((w) => {
      if (w?.id) map.set(w.id, w)
    })
    queuedWorkers.forEach((w) => {
      if (w?.id && !map.has(w.id)) {
        map.set(w.id, w)
      }
    })
    setLocalWorkers(Array.from(map.values()))
  }, [snapshots, queue])

  // Available tabs calculation
  const hasDashboard = !!snapshots['/dashboard']
  const hasSuppliers = !!snapshots['/suppliers'] || !!snapshots['/dashboard']?.payload?.suppliers
  const hasBills = !!snapshots['/ra-bills'] || !!snapshots['/dashboard']?.payload?.bills
  const hasProjects = availableProjects.length > 0
  const hasWorkers = (snapshots['/attendance']?.payload?.workers?.length > 0) || localWorkers.length > 0
  const hasMachinery = !!snapshots['/machinery']?.payload?.assets

  // Set default tab on load if dashboard is not cached
  useEffect(() => {
    if (loaded && !hasDashboard) {
      if (hasSuppliers) setActiveTab('suppliers')
      else if (hasProjects) setActiveTab('projects')
      else if (queue.length > 0) setActiveTab('queue')
      else setActiveTab('entry')
    }
  }, [loaded, hasDashboard, hasSuppliers, hasProjects, queue.length])

  // Suppliers data source
  const suppliersList = useMemo(() => {
    const list = snapshots['/suppliers']?.payload?.suppliers || snapshots['/dashboard']?.payload?.suppliers || []
    if (!searchSupplier.trim()) return list
    const q = searchSupplier.toLowerCase()
    return list.filter((s: any) =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.gstin && s.gstin.toLowerCase().includes(q))
    )
  }, [snapshots, searchSupplier])

  // RA Bills data source
  const billsList = useMemo(() => {
    return snapshots['/ra-bills']?.payload?.bills || snapshots['/dashboard']?.payload?.bills || []
  }, [snapshots])

  // Projects data source
  const projectsList = useMemo(() => {
    return snapshots['/projects']?.payload?.projects || snapshots['/dashboard']?.payload?.projects || []
  }, [snapshots])

  // Workers data source (uses synchronized localWorkers)
  const workersList = localWorkers

  // Machinery data source
  const machineryList = useMemo(() => {
    return snapshots['/machinery']?.payload?.assets || []
  }, [snapshots])

  // Filtered workers for muster roll & workers tab
  const filteredWorkers = useMemo(() => {
    return localWorkers.filter((w) => {
      const matchSearch =
        !workerSearch.trim() ||
        w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
        (w.trade && w.trade.toLowerCase().includes(workerSearch.toLowerCase()))

      const matchTrade =
        workerTradeFilter === 'ALL' || (w.trade || '').toLowerCase() === workerTradeFilter.toLowerCase()

      return matchSearch && matchTrade
    })
  }, [localWorkers, workerSearch, workerTradeFilter])

  // Real-time calculation of muster roll KPIs
  const musterSummary = useMemo(() => {
    let presentCount = 0
    let halfDayCount = 0
    let overtimeCount = 0
    let absentCount = 0
    let totalEstCost = 0

    localWorkers.forEach((w) => {
      const status = attendanceMap[w.id]
      const rate = Number(w.daily_wage_rate) || 0
      const otHours = overtimeMap[w.id] || 0

      if (status === 'present') {
        presentCount++
        totalEstCost += rate
      } else if (status === 'half_day') {
        halfDayCount++
        totalEstCost += rate * 0.5
      } else if (status === 'overtime') {
        overtimeCount++
        const hourlyRate = rate > 0 ? rate / 8 : 0
        totalEstCost += rate + hourlyRate * otHours
      } else if (status === 'absent') {
        absentCount++
      }
    })

    const onSiteCount = presentCount + halfDayCount + overtimeCount
    const markedCount = onSiteCount + absentCount

    return {
      presentCount,
      halfDayCount,
      overtimeCount,
      absentCount,
      onSiteCount,
      markedCount,
      totalEstCost,
    }
  }, [localWorkers, attendanceMap, overtimeMap])

  // Handler to add a new worker while offline
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkerName.trim()) {
      alert('Please enter worker name')
      return
    }

    setNewWorkerSaving(true)
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `worker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const workerObj = {
      id: newId,
      name: newWorkerName.trim(),
      trade: newWorkerTrade || 'Helper',
      daily_wage_rate: parseFloat(newWorkerRate) || 0,
      is_offline: true,
      created_at: Date.now(),
    }

    try {
      await saveToOfflineQueue('worker', workerObj)
      const updatedWorkers = [...localWorkers, workerObj]
      setLocalWorkers(updatedWorkers)

      // Also persist to /attendance snapshot so it survives offline browser reloads
      await saveOfflineSnapshot('/attendance', {
        workers: updatedWorkers,
        projects: availableProjects,
      })

      setActionSuccess(`✓ Worker "${workerObj.name}" added to site muster!`)
      setNewWorkerName('')
      setNewWorkerTrade('Helper')
      setNewWorkerRate('')
      setAddWorkerModalOpen(false)
      await refreshData()
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err) {
      console.error('Failed to save worker offline:', err)
      alert('Could not save worker locally.')
    } finally {
      setNewWorkerSaving(false)
    }
  }

  // Attendance toggles & bulk actions
  const handleSetWorkerStatus = (workerId: string, status: 'present' | 'half_day' | 'overtime' | 'absent') => {
    setAttendanceMap((prev) => {
      const current = prev[workerId]
      const next = current === status ? (status === 'present' ? 'absent' : 'present') : status
      return { ...prev, [workerId]: next }
    })

    if (status === 'overtime') {
      setOvertimeMap((prev) => ({
        ...prev,
        [workerId]: prev[workerId] && prev[workerId] > 0 ? prev[workerId] : 2.0,
      }))
    } else if (status === 'absent') {
      setOvertimeMap((prev) => {
        const copy = { ...prev }
        delete copy[workerId]
        return copy
      })
    }
  }

  const handleAdjustOvertime = (workerId: string, delta: number) => {
    setOvertimeMap((prev) => {
      const current = prev[workerId] || 2.0
      const next = Math.max(0.5, Math.min(24, Math.round((current + delta) * 10) / 10))
      return { ...prev, [workerId]: next }
    })
    setAttendanceMap((prev) => ({ ...prev, [workerId]: 'overtime' }))
  }

  const handleMarkAllPresent = () => {
    const nextMap = { ...attendanceMap }
    filteredWorkers.forEach((w) => {
      nextMap[w.id] = 'present'
    })
    setAttendanceMap(nextMap)
  }

  const handleMarkAllAbsent = () => {
    const nextMap = { ...attendanceMap }
    filteredWorkers.forEach((w) => {
      nextMap[w.id] = 'absent'
    })
    setAttendanceMap(nextMap)
    setOvertimeMap({})
  }

  const handleClearAttendance = () => {
    setAttendanceMap({})
    setOvertimeMap({})
    setWorkerNotesMap({})
  }

  // Save individual worker muster roll to local queue
  const handleSaveIndividualAttendance = async () => {
    const markedWorkers = localWorkers.filter((w) => attendanceMap[w.id])
    if (markedWorkers.length === 0) {
      alert('Please mark attendance (P, H, OT, or A) for at least one worker before saving.')
      return
    }

    const projectName =
      availableProjects.find((p) => p.id === selectedProjectId)?.name || customProjectName || 'Job Site'

    const rows = markedWorkers.map((w) => {
      const s = attendanceMap[w.id]
      const ot = s === 'overtime' ? overtimeMap[w.id] || 2.0 : 0
      const note = workerNotesMap[w.id] || (ot > 0 ? `OT:${ot}h` : null)
      const dbStatus = (s === 'overtime' || s === 'present') ? 'present' : (s === 'half_day' ? 'half_day' : 'absent')

      return {
        project_id: selectedProjectId || null,
        project_name: projectName,
        worker_id: w.id,
        worker_name: w.name,
        trade: w.trade,
        date: attendanceDate,
        status: dbStatus,
        present: dbStatus !== 'absent',
        overtime_hours: ot,
        notes: note,
        is_offline: true,
      }
    })

    await saveToOfflineQueue('attendance', rows)
    setActionSuccess(`✓ Muster roll for ${rows.length} worker(s) queued locally! Will sync on reconnect.`)
    await refreshData()
    setTimeout(() => setActionSuccess(null), 4500)
  }

  // Dashboard data source
  const dashData = snapshots['/dashboard']?.payload

  // Handlers for Quick Offline Entry
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(expenseAmount)
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense amount')
      return
    }

    const projectName = availableProjects.find(p => p.id === selectedProjectId)?.name || customProjectName || 'Job Site'
    const payload = {
      project_id: selectedProjectId || null,
      project_name: projectName,
      category: expenseCategory,
      amount: amountNum,
      paid_to: expensePaidTo || 'Cash Expense',
      description: expenseNotes || `${expenseCategory} - offline entry`,
      date: new Date().toISOString().split('T')[0],
      source_table: 'expenses',
      is_offline: true,
    }

    await saveToOfflineQueue('expense', payload)
    setActionSuccess(`✓ Expense of ${formatINR(amountNum)} queued locally!`)
    setExpenseAmount('')
    setExpensePaidTo('')
    setExpenseNotes('')
    await refreshData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleSaveAggregateAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    const countNum = parseInt(attendanceCount, 10)
    if (!countNum || isNaN(countNum) || countNum <= 0) {
      alert('Please enter number of workers present')
      return
    }

    const projectName = availableProjects.find(p => p.id === selectedProjectId)?.name || customProjectName || 'Job Site'
    const payload = {
      project_id: selectedProjectId || null,
      project_name: projectName,
      date: attendanceDate,
      worker_count: countNum,
      notes: attendanceNotes || `Muster roll logged offline: ${countNum} workers present`,
      is_offline: true,
    }

    await saveToOfflineQueue('attendance', payload)
    setActionSuccess(`✓ Aggregate attendance of ${countNum} workers queued locally!`)
    setAttendanceCount('')
    setAttendanceNotes('')
    await refreshData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleSaveDiesel = async (e: React.FormEvent) => {
    e.preventDefault()
    const litersNum = parseFloat(dieselLiters)
    if (!litersNum || isNaN(litersNum) || litersNum <= 0) {
      alert('Please enter diesel liters')
      return
    }

    const projectName = availableProjects.find(p => p.id === selectedProjectId)?.name || customProjectName || 'Job Site'
    const payload = {
      project_id: selectedProjectId || null,
      project_name: projectName,
      asset_name: dieselMachine || 'Site Machinery',
      diesel_liters: litersNum,
      end_meter: parseFloat(dieselMeter) || 0,
      fuel_vendor: dieselVendor || 'Local Bunk',
      log_date: new Date().toISOString().split('T')[0],
      is_offline: true,
    }

    await saveToOfflineQueue('diesel_log', payload)
    setActionSuccess(`✓ Diesel log (${litersNum}L for ${dieselMachine || 'machine'}) queued locally!`)
    setDieselMachine('')
    setDieselLiters('')
    setDieselMeter('')
    setDieselVendor('')
    await refreshData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleDeleteQueuedItem = async (id: string) => {
    if (confirm('Discard this queued offline entry?')) {
      await removeFromOfflineQueue(id)
      await refreshData()
    }
  }

  const handleManualSync = async () => {
    if (typeof window === 'undefined') return
    if (!navigator.onLine) {
      setSyncResult('Still offline. Please check your mobile data or Wi-Fi signal.')
      setTimeout(() => setSyncResult(null), 4000)
      return
    }

    setSyncing(true)
    try {
      const res = await flushOfflineQueue()
      if (res.synced > 0) {
        setSyncResult(`✓ Successfully synced ${res.synced} offline item${res.synced === 1 ? '' : 's'} to cloud!`)
      } else if (res.errors > 0) {
        setSyncResult('Some items could not sync yet. They remain safe in local queue.')
      } else {
        setSyncResult('All offline items are already synced.')
      }
      await refreshData()
    } catch {
      setSyncResult('Sync encountered an error. Will retry when connection stabilizes.')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  if (!loaded) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center animate-pulse">
        <p className="text-xs text-slate-400">Accessing offline storage...</p>
      </div>
    )
  }

  return (
    <section className="w-full space-y-4 text-left">
      {/* Top Status & Sync Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Offline Site Mode</span>
              {queue.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                  {queue.length} pending
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {queue.length > 0 ? `${queue.length} log(s) waiting to sync to cloud` : 'Ready to record expenses, attendance & fuel'}
            </p>
          </div>
        </div>

        {queue.length > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {syncing ? (
              <span>Syncing...</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync Now</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {syncResult && (
        <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs font-semibold">
          {syncResult}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-slate-800 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('entry')}
          className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
            activeTab === 'entry'
              ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ✍️ Quick Entry
        </button>

        {hasDashboard && (
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Dashboard
          </button>
        )}

        {hasSuppliers && (
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤝 Suppliers ({suppliersList.length})
          </button>
        )}

        {hasBills && (
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'bills'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📑 RA Bills ({billsList.length})
          </button>
        )}

        {hasProjects && (
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏗️ Projects ({projectsList.length || availableProjects.length})
          </button>
        )}

        {hasWorkers && (
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'workers'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Workers ({workersList.length})
          </button>
        )}

        {hasMachinery && (
          <button
            type="button"
            onClick={() => setActiveTab('machinery')}
            className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
              activeTab === 'machinery'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚜 Fleet ({machineryList.length})
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`shrink-0 px-3 py-2 rounded-t-lg font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🕒 Queue ({queue.length})
        </button>
      </div>

      {/* TAB CONTENT: Quick Entry (Site Supervisor Toolkit) */}
      {activeTab === 'entry' && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚡ Site Offline Logger</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Record expenses, attendance muster, or fuel on site without internet. Stored safely in local device storage and automatically pushed to cloud upon reconnect.
            </p>
          </div>

          {/* Sub-selector for log type */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setEntryType('expense')}
              className={`p-2.5 rounded-lg text-center text-xs font-bold transition-all ${
                entryType === 'expense'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              💰 Expense
            </button>
            <button
              type="button"
              onClick={() => setEntryType('attendance')}
              className={`p-2.5 rounded-lg text-center text-xs font-bold transition-all ${
                entryType === 'attendance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              👷 Attendance
            </button>
            <button
              type="button"
              onClick={() => setEntryType('diesel')}
              className={`p-2.5 rounded-lg text-center text-xs font-bold transition-all ${
                entryType === 'diesel'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ⛽ Diesel / Fuel
            </button>
          </div>

          {/* Form: Expense */}
          {entryType === 'expense' && (
            <form onSubmit={handleSaveExpense} className="space-y-3">
              {availableProjects.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Name (Site)</label>
                  <input
                    type="text"
                    placeholder="e.g. NH-48 Flyover"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Fuel / Diesel">Fuel / Diesel</option>
                    <option value="Materials / Cement">Materials / Cement</option>
                    <option value="Labor Cash / Advance">Labor Cash / Advance</option>
                    <option value="Machinery Hire">Machinery Hire</option>
                    <option value="Transport / Cartage">Transport / Cartage</option>
                    <option value="Food / Site Chai">Food / Site Chai</option>
                    <option value="Tools / Hardware">Tools / Hardware</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Paid To / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Diesel Pump or Cash"
                  value={expensePaidTo}
                  onChange={(e) => setExpensePaidTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20L emergency diesel for JCB"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/25 cursor-pointer transition-all"
              >
                Save Expense to Local Queue
              </button>
            </form>
          )}

          {/* Form: Attendance (Per-Worker Muster Roll or Quick Aggregate) */}
          {entryType === 'attendance' && (
            <div className="space-y-4">
              {/* Top Controls: Site & Date & Mode */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableProjects.length > 0 ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Project / Site</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {availableProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Name (Site)</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Site"
                        value={customProjectName}
                        onChange={(e) => setCustomProjectName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Attendance Date</label>
                    <input
                      type="date"
                      required
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Sub-mode toggle: Individual Worker vs Quick Headcount */}
                <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('individual')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        attendanceMode === 'individual'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👥 Per-Worker Roll ({localWorkers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('aggregate')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        attendanceMode === 'aggregate'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔢 Quick Headcount
                    </button>
                  </div>

                  {attendanceMode === 'individual' && (
                    <button
                      type="button"
                      onClick={() => setAddWorkerModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-[11px]"
                    >
                      <span>+ Add Worker</span>
                    </button>
                  )}
                </div>
              </div>

              {/* INDIVIDUAL WORKER MUSTER ROLL */}
              {attendanceMode === 'individual' && (
                <div className="space-y-3">
                  {/* Worker Filters & Bulk Actions Toolbar */}
                  {localWorkers.length > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Search worker by name or trade..."
                          value={workerSearch}
                          onChange={(e) => setWorkerSearch(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={workerTradeFilter}
                          onChange={(e) => setWorkerTradeFilter(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="ALL">All Trades ({localWorkers.length})</option>
                          {TRADES.map((t) => {
                            const count = localWorkers.filter((w) => (w.trade || '').toLowerCase() === t.toLowerCase()).length
                            return count > 0 ? (
                              <option key={t} value={t}>
                                {t} ({count})
                              </option>
                            ) : null
                          })}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
                        <span className="text-slate-400">
                          Showing {filteredWorkers.length} of {localWorkers.length} workers
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleMarkAllPresent}
                            className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold"
                          >
                            All Present
                          </button>
                          <button
                            type="button"
                            onClick={handleMarkAllAbsent}
                            className="px-2 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 font-semibold"
                          >
                            All Absent
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAttendance}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state when no workers exist */}
                  {localWorkers.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 text-2xl">
                        👷
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">No workers found in offline storage</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                          You can register your workers on site right now even without internet, and mark muster roll immediately.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddWorkerModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        <span>+ Add First Worker</span>
                      </button>
                    </div>
                  ) : filteredWorkers.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400">No workers match the filter &quot;{workerSearch}&quot;</p>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkerSearch('')
                          setWorkerTradeFilter('ALL')
                        }}
                        className="mt-2 text-xs text-blue-400 underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    /* Worker Attendance Cards List */
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {filteredWorkers.map((w) => {
                        const status = attendanceMap[w.id]
                        const otHours = overtimeMap[w.id] || 2.0
                        const rate = Number(w.daily_wage_rate) || 0
                        const hourlyRate = rate > 0 ? rate / 8 : 0
                        const estWorkerWage =
                          status === 'present'
                            ? rate
                            : status === 'half_day'
                            ? rate * 0.5
                            : status === 'overtime'
                            ? rate + hourlyRate * otHours
                            : 0

                        return (
                          <div
                            key={w.id}
                            className={`p-3 rounded-xl border transition-all ${
                              status === 'present'
                                ? 'bg-emerald-950/20 border-emerald-800/50'
                                : status === 'half_day'
                                ? 'bg-amber-950/20 border-amber-800/50'
                                : status === 'overtime'
                                ? 'bg-indigo-950/20 border-indigo-800/50'
                                : status === 'absent'
                                ? 'bg-rose-950/20 border-rose-800/50 opacity-75'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              {/* Worker Info */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white truncate">{w.name}</span>
                                  {w.is_offline && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      ⚡ Offline
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                    {w.trade || 'Worker'}
                                  </span>
                                  {rate > 0 && <span>₹{rate}/day</span>}
                                  {estWorkerWage > 0 && (
                                    <span className="text-emerald-400 font-semibold">
                                      = ₹{Math.round(estWorkerWage)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Status Toggle Buttons: P, H, OT, A */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSetWorkerStatus(w.id, 'present')}
                                  title="Present (Full Day)"
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 ring-2 ring-emerald-400'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  P
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetWorkerStatus(w.id, 'half_day')}
                                  title="Half Day"
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    status === 'half_day'
                                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 ring-2 ring-amber-400'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  H
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetWorkerStatus(w.id, 'overtime')}
                                  title="Overtime"
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    status === 'overtime'
                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  OT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetWorkerStatus(w.id, 'absent')}
                                  title="Absent"
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    status === 'absent'
                                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-2 ring-rose-400'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            </div>

                            {/* Overtime Extender Bar (If OT selected) */}
                            {status === 'overtime' && (
                              <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[11px] font-semibold text-indigo-300">OT Hours:</span>
                                  <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustOvertime(w.id, -0.5)}
                                      className="px-1 text-slate-400 hover:text-white font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold text-white px-1">{otHours.toFixed(1)}h</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustOvertime(w.id, 0.5)}
                                      className="px-1 text-slate-400 hover:text-white font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {hourlyRate > 0 && (
                                    <span className="text-[10px] text-indigo-400">
                                      (+₹{Math.round(hourlyRate * otHours)})
                                    </span>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  placeholder="Task/Note (optional)"
                                  value={workerNotesMap[w.id] || ''}
                                  onChange={(e) =>
                                    setWorkerNotesMap((prev) => ({ ...prev, [w.id]: e.target.value }))
                                  }
                                  className="text-[10px] px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white placeholder-slate-500 w-36 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Realtime Muster Roll Summary & Save Action */}
                  {localWorkers.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">On Site</span>
                          <span className="text-xs font-bold text-emerald-400">{musterSummary.onSiteCount}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Present (P)</span>
                          <span className="text-xs font-bold text-emerald-300">{musterSummary.presentCount}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Half Day (H)</span>
                          <span className="text-xs font-bold text-amber-300">{musterSummary.halfDayCount}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Overtime</span>
                          <span className="text-xs font-bold text-indigo-300">{musterSummary.overtimeCount}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Absent (A)</span>
                          <span className="text-xs font-bold text-rose-300">{musterSummary.absentCount}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Est. Day Cost</span>
                          <span className="text-xs font-bold text-white">{formatINR(musterSummary.totalEstCost)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveIndividualAttendance}
                        disabled={musterSummary.markedCount === 0}
                        className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/25 cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        <span>Save Muster Roll to Local Queue ({musterSummary.markedCount} marked)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* AGGREGATE ATTENDANCE FORM (Fallback Quick Headcount) */}
              {attendanceMode === 'aggregate' && (
                <form onSubmit={handleSaveAggregateAttendance} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Workers Present on Site *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 14"
                      required
                      value={attendanceCount}
                      onChange={(e) => setAttendanceCount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Muster Breakdown / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8 Masons, 6 Helpers on slab shuttering"
                      value={attendanceNotes}
                      onChange={(e) => setAttendanceNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/25 cursor-pointer transition-all"
                  >
                    Save Aggregate Headcount to Local Queue
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Form: Diesel / Fuel */}
          {entryType === 'diesel' && (
            <form onSubmit={handleSaveDiesel} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Equipment / Machine *</label>
                  <input
                    type="text"
                    placeholder="e.g. Excavator JCB-3DX"
                    required
                    value={dieselMachine}
                    onChange={(e) => setDieselMachine(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Diesel Liters *</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 45"
                    required
                    value={dieselLiters}
                    onChange={(e) => setDieselLiters(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hour Meter Reading</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1420.5"
                    value={dieselMeter}
                    onChange={(e) => setDieselMeter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Fuel Vendor / Tank</label>
                  <input
                    type="text"
                    placeholder="e.g. Site Bowzer / HP Pump"
                    value={dieselVendor}
                    onChange={(e) => setDieselVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/25 cursor-pointer transition-all"
              >
                Save Diesel Log to Local Queue
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB CONTENT: Dashboard */}
      {activeTab === 'dashboard' && dashData && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Company</span>
                <h3 className="text-sm font-bold text-white">{dashData.orgName || 'PillarPro Construction'}</h3>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300">
                Cached Snapshot
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Projects</span>
                <p className="text-base font-bold text-white mt-0.5">{dashData.projects?.length || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">RA Bills</span>
                <p className="text-base font-bold text-white mt-0.5">{dashData.bills?.length || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Suppliers</span>
                <p className="text-base font-bold text-white mt-0.5">{dashData.suppliers?.length || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Ledger Items</span>
                <p className="text-base font-bold text-white mt-0.5">{dashData.ledger?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Active Projects Quick Glance */}
          {Array.isArray(dashData.projects) && dashData.projects.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300">Active Site Projects</h4>
              <div className="divide-y divide-slate-800 text-xs">
                {dashData.projects.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{p.name}</p>
                      {p.agency_name && <p className="text-[10px] text-slate-400">{p.agency_name}</p>}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {p.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Suppliers */}
      {activeTab === 'suppliers' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search supplier name, phone, or GST..."
              value={searchSupplier}
              onChange={(e) => setSearchSupplier(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {suppliersList.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">No matching suppliers found in offline cache.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliersList.map((s: any) => {
                const bal = parseFloat(s.outstanding_balance) || 0
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        {s.category && <span>{s.category}</span>}
                        {s.gstin && <span className="text-slate-500 font-mono text-[10px]">GST: {s.gstin}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Due Balance</span>
                        <span className={`text-xs font-bold ${bal > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {formatINR(bal)}
                        </span>
                      </div>

                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          title={`Call ${s.name}`}
                          className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors"
                        >
                          📞
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: RA Bills */}
      {activeTab === 'bills' && (
        <div className="space-y-2">
          {billsList.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">No RA bills saved in offline cache.</p>
            </div>
          ) : (
            billsList.map((b: any) => {
              const due = parseFloat(b.outstanding_balance) || 0
              return (
                <div key={b.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">{b.bill_number}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.projects?.name || 'Project'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Outstanding</span>
                    <span className="text-xs font-bold text-amber-400">{formatINR(due)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-2">
          {projectsList.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">No projects saved in offline cache.</p>
            </div>
          ) : (
            projectsList.map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.agency_name || 'Department / Client'}</p>
                </div>
                {p.awarded_amount && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Awarded</span>
                    <span className="text-xs font-bold text-slate-200">{formatINR(p.awarded_amount)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: Workers */}
      {activeTab === 'workers' && (
        <div className="space-y-3">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>👥 Site Workers Directory</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                  {localWorkers.length}
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">
                Cached muster roll workers and new workers registered while offline.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAddWorkerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-md shadow-blue-600/30"
            >
              <span>+ Add Worker</span>
            </button>
          </div>

          {/* Search & Trade Filters */}
          {localWorkers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Search workers by name or trade..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={workerTradeFilter}
                onChange={(e) => setWorkerTradeFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Trades ({localWorkers.length})</option>
                {TRADES.map((t) => {
                  const count = localWorkers.filter((w) => (w.trade || '').toLowerCase() === t.toLowerCase()).length
                  return count > 0 ? (
                    <option key={t} value={t}>
                      {t} ({count})
                    </option>
                  ) : null
                })}
              </select>
            </div>
          )}

          {/* Workers List */}
          {localWorkers.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 text-2xl">
                👷
              </div>
              <div>
                <p className="text-xs font-bold text-white">No worker muster roll cached yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Add workers right now on site without internet. They will be stored in local storage and synced to cloud on reconnect.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddWorkerModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-md shadow-blue-600/30"
              >
                <span>+ Add First Worker</span>
              </button>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">No workers match &quot;{workerSearch}&quot;</p>
              <button
                type="button"
                onClick={() => {
                  setWorkerSearch('')
                  setWorkerTradeFilter('ALL')
                }}
                className="mt-2 text-xs text-blue-400 underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkers.map((w: any) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{w.name}</p>
                      {w.is_offline && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚡ Offline Added
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {w.trade || 'Worker'}
                      </span>
                      {w.daily_wage_rate ? <span>₹{w.daily_wage_rate}/day</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('entry')
                        setEntryType('attendance')
                        setAttendanceMode('individual')
                        setAttendanceMap((prev) => ({ ...prev, [w.id]: prev[w.id] || 'present' }))
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer"
                    >
                      Mark Attendance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Fleet / Machinery */}
      {activeTab === 'machinery' && (
        <div className="space-y-2">
          {machineryList.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">No machinery assets cached yet.</p>
            </div>
          ) : (
            machineryList.map((m: any) => (
              <div key={m.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{m.asset_name}</p>
                  <p className="text-[10px] text-slate-400">{m.registration_number || m.asset_type}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-[10px] text-slate-400 block">Current Meter</span>
                  <span className="font-bold text-slate-200">{m.current_meter || 0} {m.meter_tracking === 'km' ? 'km' : 'hrs'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: Sync Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Pending Cloud Uploads</p>
              <p className="text-[10px] text-slate-400">Entries will auto-push as soon as network is restored.</p>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing || queue.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all cursor-pointer"
            >
              {syncing ? 'Syncing...' : 'Sync All'}
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Queue is empty. No offline changes pending.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item) => {
                const dateStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                let summary = ''
                if (item.type === 'expense') {
                  summary = `${formatINR(item.payload.amount)} - ${item.payload.category || 'Expense'} (${item.payload.project_name || 'Project'})`
                } else if (item.type === 'attendance') {
                  if (Array.isArray(item.payload)) {
                    summary = `Muster Roll: ${item.payload.length} worker(s) on ${item.payload[0]?.date || 'Today'} (${item.payload[0]?.project_name || 'Site'})`
                  } else {
                    summary = `${item.payload.worker_count || 'Muster'} workers present (${item.payload.date || 'Today'})`
                  }
                } else if (item.type === 'worker') {
                  summary = `New Worker: ${item.payload.name} (${item.payload.trade || 'Worker'}) • ₹${item.payload.daily_wage_rate || 0}/day`
                } else if (item.type === 'diesel_log') {
                  summary = `${item.payload.diesel_liters}L Diesel - ${item.payload.asset_name || 'Equipment'}`
                } else {
                  summary = `${item.type} log`
                }

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-500">{dateStr}</span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate mt-1">{summary}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQueuedItem(item.id)}
                      title="Discard entry"
                      className="p-1.5 text-xs text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Worker Offline */}
      {addWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>👷 Register Worker Offline</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Available immediately for site attendance & synced on reconnect.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddWorkerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Worker Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  required
                  autoFocus
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Trade / Skill
                  </label>
                  <select
                    value={newWorkerTrade}
                    onChange={(e) => setNewWorkerTrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Daily Wage Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="10"
                    placeholder="e.g. 600"
                    value={newWorkerRate}
                    onChange={(e) => setNewWorkerRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddWorkerModalOpen(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newWorkerSaving || !newWorkerName.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  {newWorkerSaving ? 'Saving...' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
