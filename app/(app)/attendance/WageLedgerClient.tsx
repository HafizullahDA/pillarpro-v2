'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { formatINR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { canManageWages } from '@/lib/permissions'

type Project = { id: string; name: string }
type Worker = { id: string; name: string; trade: string | null; daily_wage_rate: number | null }
type AttendanceRecord = { worker_id: string; date: string; status: string }

export interface WagePaymentRecord {
  id: string
  organization_id?: string
  project_id: string
  worker_id: string
  period_start: string
  period_end: string
  days_worked: number
  daily_rate: number
  amount_owed: number
  amount_paid: number
  payment_date: string
  payment_mode: string
  status: string
  reference: string | null
  notes: string | null
  created_at?: string
}

interface WorkerWageSummary {
  worker: Worker
  fullDays: number
  halfDays: number
  daysWorked: number
  dailyRate: number
  amountOwed: number
  amountPaid: number
  balanceDue: number
  status: 'paid' | 'partial' | 'unpaid' | 'no_work'
  payments: WagePaymentRecord[]
}

const MODES = ['Cash', 'UPI', 'Bank Transfer (NEFT/RTGS)', 'Cheque', 'Other']

export function WageLedgerClient({
  projects,
  selectedProjectId,
  onSelectProject,
  userRole,
}: {
  projects: Project[]
  selectedProjectId: string
  onSelectProject: (id: string) => void
  userRole?: string
}) {
  const supabase = createClient()
  const canDisburse = canManageWages(userRole)

  // Period mode: 'weekly' | 'monthly'
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly')

  // Week anchor: Date of Monday of selected week
  const [weekMonday, setWeekMonday] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const mon = new Date(d.setDate(diff))
    mon.setHours(0, 0, 0, 0)
    return mon
  })

  // Month anchor: year and month (1-12)
  const today = new Date()
  const [monthYear, setMonthYear] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  })

  // Data states
  const [workers, setWorkers] = useState<Worker[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [payments, setPayments] = useState<WagePaymentRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Drawer state for recording payment
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [selectedWorkerSummary, setSelectedWorkerSummary] = useState<WorkerWageSummary | null>(null)
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    reference: '',
    notes: '',
  })
  const [savingPayment, setSavingPayment] = useState(false)
  const [payError, setPayError] = useState('')

  // History modal state
  const [historyWorker, setHistoryWorker] = useState<WorkerWageSummary | null>(null)

  // Compute period start and end dates as YYYY-MM-DD
  let periodStart = ''
  let periodEnd = ''
  let periodLabel = ''

  if (periodType === 'weekly') {
    const mon = new Date(weekMonday)
    const sun = new Date(weekMonday)
    sun.setDate(mon.getDate() + 6)

    periodStart = mon.toISOString().split('T')[0]
    periodEnd = sun.toISOString().split('T')[0]

    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
    periodLabel = `${mon.toLocaleDateString('en-IN', opts)} – ${sun.toLocaleDateString('en-IN', opts)}`
  } else {
    const y = monthYear.year
    const m = monthYear.month
    const lastDay = new Date(y, m, 0).getDate()

    periodStart = `${y}-${String(m).padStart(2, '0')}-01`
    periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const dateForMonth = new Date(y, m - 1, 1)
    periodLabel = dateForMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }

  // Week navigation
  const prevWeek = () => {
    setWeekMonday(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() - 7)
      return next
    })
  }

  const nextWeek = () => {
    setWeekMonday(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + 7)
      return next
    })
  }

  const currentWeek = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d.setDate(diff))
    mon.setHours(0, 0, 0, 0)
    setWeekMonday(mon)
  }

  // Month navigation
  const prevMonth = () => {
    setMonthYear(prev => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const nextMonth = () => {
    setMonthYear(prev => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  // Load workers
  const loadWorkers = useCallback(async () => {
    const { data } = await supabase
      .from('workers')
      .select('id, name, trade, daily_wage_rate')
      .order('name')
    setWorkers(data ?? [])
  }, [supabase])

  // Load period attendance & wage payments
  const loadPeriodData = useCallback(async () => {
    if (!selectedProjectId || !periodStart || !periodEnd) return
    setLoading(true)

    const [{ data: attData }, { data: payData }] = await Promise.all([
      supabase
        .from('attendance')
        .select('worker_id, date, status')
        .eq('project_id', selectedProjectId)
        .gte('date', periodStart)
        .lte('date', periodEnd),
      supabase
        .from('wage_payments')
        .select('*')
        .eq('project_id', selectedProjectId)
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .order('payment_date', { ascending: false }),
    ])

    setAttendance(attData ?? [])
    setPayments(payData ?? [])
    setLoading(false)
  }, [selectedProjectId, periodStart, periodEnd, supabase])

  useEffect(() => {
    loadWorkers()
  }, [loadWorkers])

  useEffect(() => {
    loadPeriodData()
  }, [loadPeriodData])

  // Build worker summaries
  const summaries: WorkerWageSummary[] = workers.map(w => {
    const attList = attendance.filter(a => a.worker_id === w.id)
    const fullDays = attList.filter(a => a.status === 'present').length
    const halfDays = attList.filter(a => a.status === 'half_day').length
    const daysWorked = fullDays * 1.0 + halfDays * 0.5
    const dailyRate = Number(w.daily_wage_rate) || 0
    const amountOwed = daysWorked * dailyRate

    const workerPayments = payments.filter(p => p.worker_id === w.id)
    const amountPaid = workerPayments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0)
    const balanceDue = amountOwed - amountPaid

    let status: 'paid' | 'partial' | 'unpaid' | 'no_work' = 'unpaid'
    if (amountOwed === 0 && amountPaid === 0) {
      status = 'no_work'
    } else if (balanceDue <= 0 && amountOwed > 0) {
      status = 'paid'
    } else if (amountPaid > 0 && balanceDue > 0) {
      status = 'partial'
    } else {
      status = 'unpaid'
    }

    return {
      worker: w,
      fullDays,
      halfDays,
      daysWorked,
      dailyRate,
      amountOwed,
      amountPaid,
      balanceDue,
      status,
      payments: workerPayments,
    }
  })

  // Aggregate totals
  const totalLaborDays = summaries.reduce((sum, s) => sum + s.daysWorked, 0)
  const totalWagesOwed = summaries.reduce((sum, s) => sum + s.amountOwed, 0)
  const totalDisbursed = summaries.reduce((sum, s) => sum + s.amountPaid, 0)
  const totalPending = Math.max(0, totalWagesOwed - totalDisbursed)

  // Open payment drawer
  const handleOpenPayment = (summary: WorkerWageSummary) => {
    setSelectedWorkerSummary(summary)
    setPayForm({
      amount: summary.balanceDue > 0 ? summary.balanceDue.toString() : '0',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Cash',
      reference: '',
      notes: '',
    })
    setPayError('')
    setPaymentDrawerOpen(true)
  }

  // Save wage payment
  const handleSavePayment = async () => {
    if (!selectedWorkerSummary) return

    const amt = parseFloat(payForm.amount)
    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid disbursement amount greater than 0.')
      return
    }

    setSavingPayment(true)
    setPayError('')

    const modeNormalized = payForm.payment_mode
      .toLowerCase()
      .replace('/', '_')
      .replace(' ', '_') as any

    const newBalance = selectedWorkerSummary.balanceDue - amt
    const paymentStatus = newBalance <= 0 ? 'paid' : 'partial'

    // Get current user's organization_id
    const { data: orgId } = await supabase.rpc('get_user_organization_id')

    const { error } = await supabase.from('wage_payments').insert({
      organization_id: orgId,
      project_id: selectedProjectId,
      worker_id: selectedWorkerSummary.worker.id,
      period_start: periodStart,
      period_end: periodEnd,
      days_worked: selectedWorkerSummary.daysWorked,
      daily_rate: selectedWorkerSummary.dailyRate,
      amount_owed: selectedWorkerSummary.amountOwed,
      amount_paid: amt,
      payment_date: payForm.payment_date,
      payment_mode: modeNormalized,
      status: paymentStatus,
      reference: payForm.reference.trim() || null,
      notes: payForm.notes.trim() || null,
    })

    setSavingPayment(false)

    if (error) {
      setPayError(`Failed to save payment: ${error.message}`)
      return
    }

    setPaymentDrawerOpen(false)
    loadPeriodData()
  }

  return (
    <div className="space-y-5">
      {/* Period & Project Navigation Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Project Selector & Period Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={selectedProjectId}
            onChange={e => onSelectProject(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriodType('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodType === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Cycle
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodType === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calendar Month
            </button>
          </div>
        </div>

        {/* Right: Date Range Stepper */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={periodType === 'weekly' ? prevWeek : prevMonth}
            aria-label="Previous period"
          >
            ‹
          </Button>

          <div className="text-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-800 tabular-nums">{periodLabel}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {periodType === 'weekly' ? 'Mon – Sun Weekly Pay' : 'Monthly Wage Register'}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={periodType === 'weekly' ? nextWeek : nextMonth}
            aria-label="Next period"
          >
            ›
          </Button>

          {periodType === 'weekly' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={currentWeek}
              className="text-xs py-1 px-2.5 ml-1 text-slate-600"
            >
              This Week
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Labor Days
          </p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalLaborDays.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">shifts</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Sum of 1.0 full + 0.5 half days</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Wages Owed
          </p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatINR(totalWagesOwed)}
          </p>
          <p className="text-[11px] text-blue-600 mt-1 font-medium">
            Days worked × daily wage rate
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Disbursed
          </p>
          <p className="text-xl md:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            {formatINR(totalDisbursed)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Cash / UPI / Bank payments</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Balance
          </p>
          <p
            className={`text-xl md:text-2xl font-bold mt-1 tabular-nums ${
              totalPending > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {formatINR(totalPending)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalPending > 0 ? 'Unsettled wages for period' : 'All wages settled'}
          </p>
        </div>
      </div>

      {/* Worker Wage Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Worker Wage Register</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance-calculated wages, payments recorded, and balance due
            </p>
          </div>
          {!canDisburse && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
              Read-Only (Supervisor view)
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <svg
              className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading wage calculations...
          </div>
        ) : !summaries.length ? (
          <EmptyState
            title="No workers assigned"
            description="Add workers to this project on the Attendance tab to view their wage ledger."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50/40">
                  <th className="text-left px-4 py-3">Worker & Trade</th>
                  <th className="text-right px-4 py-3">Day Rate</th>
                  <th className="text-center px-4 py-3">Days Worked</th>
                  <th className="text-right px-4 py-3">Amount Owed</th>
                  <th className="text-right px-4 py-3">Amount Paid</th>
                  <th className="text-right px-4 py-3">Balance Due</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map(s => {
                  return (
                    <tr key={s.worker.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Worker Name & Trade */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{s.worker.name}</p>
                        <p className="text-xs text-slate-500">{s.worker.trade || 'General Worker'}</p>
                      </td>

                      {/* Day Rate */}
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                        {formatINR(s.dailyRate)}
                        <span className="text-[11px] text-slate-400">/day</span>
                      </td>

                      {/* Days Worked */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 tabular-nums cursor-help"
                          title={`${s.fullDays} full days (1.0) + ${s.halfDays} half days (0.5)`}
                        >
                          {s.daysWorked.toFixed(1)} d
                        </span>
                      </td>

                      {/* Amount Owed */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(s.amountOwed)}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 tabular-nums">
                        {s.amountPaid > 0 ? (
                          <button
                            type="button"
                            onClick={() => setHistoryWorker(s)}
                            className="hover:underline text-emerald-700 font-bold"
                            title="Click to view disbursement details"
                          >
                            {formatINR(s.amountPaid)}
                          </button>
                        ) : (
                          <span className="text-slate-400 font-normal">₹0</span>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                        <span className={s.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400 font-normal'}>
                          {formatINR(Math.max(0, s.balanceDue))}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5 text-center">
                        {s.status === 'paid' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid ✓
                          </span>
                        )}
                        {s.status === 'partial' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Partial
                          </span>
                        )}
                        {s.status === 'unpaid' && s.amountOwed > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                        )}
                        {s.status === 'no_work' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-400 font-medium">
                            No shifts
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        {canDisburse ? (
                          <Button
                            size="sm"
                            variant={s.balanceDue > 0 ? 'primary' : 'secondary'}
                            className="text-xs py-1 px-3 h-auto"
                            disabled={s.daysWorked === 0 && s.amountPaid === 0}
                            onClick={() => handleOpenPayment(s)}
                          >
                            {s.balanceDue <= 0 && s.amountPaid > 0 ? '+ Add Payment' : 'Pay Wages'}
                          </Button>
                        ) : (
                          <span
                            className="text-xs text-slate-400 cursor-not-allowed"
                            title="Only Owner or Accountant can disburse wages"
                          >
                            Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Wage Payment Drawer */}
      <Drawer
        open={paymentDrawerOpen}
        onClose={() => setPaymentDrawerOpen(false)}
        title="Record Wage Disbursement"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPaymentDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={savingPayment}
              onClick={handleSavePayment}
            >
              Confirm Disbursement
            </Button>
          </div>
        }
      >
        {selectedWorkerSummary && (
          <div className="space-y-4">
            {payError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {payError}
              </div>
            )}

            {/* Worker Context Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedWorkerSummary.worker.name}</p>
                  <p className="text-xs text-slate-500">{selectedWorkerSummary.worker.trade}</p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 tabular-nums">
                  {formatINR(selectedWorkerSummary.dailyRate)}/day
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Days Worked</p>
                  <p className="text-xs font-bold text-slate-800 tabular-nums">
                    {selectedWorkerSummary.daysWorked.toFixed(1)} d
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Wages Owed</p>
                  <p className="text-xs font-bold text-slate-800 tabular-nums">
                    {formatINR(selectedWorkerSummary.amountOwed)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Balance Due</p>
                  <p className="text-xs font-bold text-amber-700 tabular-nums">
                    {formatINR(Math.max(0, selectedWorkerSummary.balanceDue))}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount to Disburse */}
            <FieldWrapper
              label="Disbursement Amount (₹)"
              hint={
                selectedWorkerSummary.balanceDue > 0
                  ? `Full remaining balance is ${formatINR(selectedWorkerSummary.balanceDue)}. Enter less for partial advance.`
                  : 'Enter additional settlement amount.'
              }
              required
            >
              <CurrencyInput
                placeholder="0"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
              />
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper label="Payment Date" required>
                <Input
                  type="date"
                  value={payForm.payment_date}
                  onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                />
              </FieldWrapper>

              <FieldWrapper label="Payment Mode">
                <Select
                  value={payForm.payment_mode}
                  onChange={e => setPayForm(f => ({ ...f, payment_mode: e.target.value }))}
                >
                  {MODES.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </FieldWrapper>
            </div>

            <FieldWrapper label="Voucher / Reference">
              <Input
                placeholder="e.g. Cash Voucher #W-104 or UPI Ref"
                value={payForm.reference}
                onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Notes">
              <Textarea
                placeholder="e.g. Weekly settlement or cash advance requested by worker"
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
              />
            </FieldWrapper>
          </div>
        )}
      </Drawer>

      {/* Payment History Modal */}
      {historyWorker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setHistoryWorker(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Payment History: {historyWorker.worker.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Disbursements recorded for {periodLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryWorker(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {!historyWorker.payments.length ? (
              <p className="text-xs text-slate-500 py-4 text-center">No payment records found.</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {historyWorker.payments.map(p => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{formatDate(p.payment_date)}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.payment_mode.toUpperCase()}
                        {p.reference ? ` • Ref: ${p.reference}` : ''}
                      </p>
                      {p.notes && <p className="text-[11px] text-slate-600 mt-1 italic">{p.notes}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700 tabular-nums">
                        {formatINR(p.amount_paid)}
                      </span>
                      <span className="block text-[10px] text-slate-400 uppercase font-medium">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setHistoryWorker(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

