'use client'

import { useState } from 'react'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'

type Project = { id: string; name: string; agency_name: string | null }
type Bill = { id: string; project_id: string; bill_date: string; net_amount: number; received: number; outstanding: number }
type Vendor = { id: string; project_id: string; name: string; due: number }
type LedgerEntry = { id: string; project_id: string | null; entry_type: string; category: string | null; amount: number; date: string }

type DashboardClientProps = {
  projects: Project[]
  bills: Bill[]
  vendors: Vendor[]
  ledger: LedgerEntry[]
  userRole: string
}

export function DashboardClient({
  projects,
  bills,
  vendors,
  ledger,
  userRole,
}: DashboardClientProps) {
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'all'>('month')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Filter ledger entries by selected project & date range
  const filteredLedger = ledger.filter(item => {
    // Project filter
    if (selectedProject !== 'all' && item.project_id !== selectedProject) {
      return false
    }

    // Date range filter
    const itemDate = new Date(item.date)
    if (dateRange === 'month') {
      return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth
    }
    if (dateRange === 'quarter') {
      const qMonthStart = Math.floor(currentMonth / 3) * 3
      return itemDate.getFullYear() === currentYear && itemDate.getMonth() >= qMonthStart
    }
    return true
  })

  // Calculations derived from central ledger projections
  const totalExpense = filteredLedger
    .filter(i => i.entry_type === 'expense' || i.entry_type === 'payment_to_vendor')
    .reduce((sum, i) => sum + i.amount, 0)

  const totalReceived = filteredLedger
    .filter(i => i.entry_type === 'income')
    .reduce((sum, i) => sum + i.amount, 0)

  // Filter bills & vendor dues by selected project
  const filteredBills = bills.filter(b => selectedProject === 'all' || b.project_id === selectedProject)
  const filteredVendors = vendors.filter(v => selectedProject === 'all' || v.project_id === selectedProject)

  const totalOutstanding = filteredBills.reduce((sum, b) => sum + b.outstanding, 0)
  const totalVendorDues = filteredVendors.reduce((sum, v) => sum + (v.due > 0 ? v.due : 0), 0)

  // Net Position Block
  const netCashMovement = totalReceived - totalExpense
  const netLiquidityPosition = totalOutstanding - totalVendorDues

  // Aging bands for outstanding receivables
  const nowMs = now.getTime()
  const agingBands = {
    d0_30: 0,
    d31_60: 0,
    d60_plus: 0,
  }

  filteredBills.forEach(b => {
    if (b.outstanding > 0) {
      const days = Math.floor((nowMs - new Date(b.bill_date).getTime()) / (1000 * 60 * 60 * 24))
      if (days > 60) agingBands.d60_plus += b.outstanding
      else if (days > 30) agingBands.d31_60 += b.outstanding
      else agingBands.d0_30 += b.outstanding
    }
  })

  // Projects at a glance status strip
  const projectGlance = projects.map(p => {
    const pBills = bills.filter(b => b.project_id === p.id)
    const pVendors = vendors.filter(v => v.project_id === p.id)

    const pOutstanding = pBills.reduce((sum, b) => sum + b.outstanding, 0)
    const pDues = pVendors.reduce((sum, v) => sum + (v.due > 0 ? v.due : 0), 0)

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (pDues > pOutstanding && pDues > 50000) status = 'warning'
    if (pDues > pOutstanding + 200000) status = 'critical'

    return { ...p, pOutstanding, pDues, status }
  })

  // Trailing 6 months trend data
  const monthsList = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const label = d.toLocaleString('en-IN', { month: 'short' })

    const mIncome = ledger
      .filter(l => {
        const ld = new Date(l.date)
        return (selectedProject === 'all' || l.project_id === selectedProject) &&
               ld.getFullYear() === y && ld.getMonth() === m && l.entry_type === 'income'
      })
      .reduce((sum, l) => sum + l.amount, 0)

    const mExpense = ledger
      .filter(l => {
        const ld = new Date(l.date)
        return (selectedProject === 'all' || l.project_id === selectedProject) &&
               ld.getFullYear() === y && ld.getMonth() === m &&
               (l.entry_type === 'expense' || l.entry_type === 'payment_to_vendor')
      })
      .reduce((sum, l) => sum + l.amount, 0)

    return { label, mIncome, mExpense }
  })

  const maxTrendVal = Math.max(...monthsList.map(m => Math.max(m.mIncome, m.mExpense)), 1)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Unified Ledger Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time projections derived from central ledger</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range selector */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-medium">
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'month' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('quarter')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'quarter' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Quarter
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Time
            </button>
          </div>

          {/* Project selector */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Total Expense"  value={formatINR(totalExpense)}  accent="red"     />
        <SummaryTile label="Total Received" value={formatINR(totalReceived)} accent="emerald" />
        <SummaryTile label="Outstanding"    value={formatINR(totalOutstanding)} accent="amber"   />
        <SummaryTile label="Vendor Dues"    value={formatINR(totalVendorDues)}  accent="blue"    />
      </div>

      {/* Net Position Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${netCashMovement >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Cash Position</span>
            <p className="text-xs text-slate-400 mt-0.5">Total Received minus Total Expense</p>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-3 ${netCashMovement >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netCashMovement >= 0 ? '+' : ''}{formatINR(netCashMovement)}
          </p>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between ${netLiquidityPosition >= 0 ? 'bg-sky-50/60 border-sky-200' : 'bg-amber-50/60 border-amber-200'}`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Liquidity Position</span>
            <p className="text-xs text-slate-400 mt-0.5">Outstanding Receivables minus Vendor Dues</p>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-3 ${netLiquidityPosition >= 0 ? 'text-sky-800' : 'text-amber-800'}`}>
            {netLiquidityPosition >= 0 ? '+' : ''}{formatINR(netLiquidityPosition)}
          </p>
        </div>
      </div>

      {/* Trailing 6-Month Trend & Aging Bands */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Trailing 6 Months Cash Flow Trend</h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"/> Received</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block"/> Expense</span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {monthsList.map((m, i) => {
              const incPct = Math.round((m.mIncome / maxTrendVal) * 100)
              const expPct = Math.round((m.mExpense / maxTrendVal) * 100)

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${Math.max(incPct, 4)}%` }}
                      className="w-3.5 bg-emerald-500 rounded-t-md transition-all duration-300"
                      title={`Received: ${formatINR(m.mIncome)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${Math.max(expPct, 4)}%` }}
                      className="w-3.5 bg-red-400 rounded-t-md transition-all duration-300"
                      title={`Expense: ${formatINR(m.mExpense)}`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Aging Bands Panel (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Receivables Aging Bands</h3>
            <p className="text-xs text-slate-500 mb-4">Outstanding billed amounts by age</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">0–30 Days</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatINR(agingBands.d0_30)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: totalOutstanding > 0 ? `${(agingBands.d0_30 / totalOutstanding) * 100}%` : '0%' }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">31–60 Days</span>
                <span className="font-bold text-amber-700 tabular-nums">{formatINR(agingBands.d31_60)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: totalOutstanding > 0 ? `${(agingBands.d31_60 / totalOutstanding) * 100}%` : '0%' }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">60+ Days</span>
                <span className="font-bold text-red-700 tabular-nums">{formatINR(agingBands.d60_plus)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: totalOutstanding > 0 ? `${(agingBands.d60_plus / totalOutstanding) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects at a Glance Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Projects at a Glance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectGlance.map(p => (
            <div key={p.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.agency_name ?? 'Government Site'}</p>
                </div>
                <Badge
                  label={p.status === 'healthy' ? 'Healthy' : p.status === 'warning' ? 'Warning' : 'Critical'}
                  variant={p.status === 'healthy' ? 'success' : p.status === 'warning' ? 'warning' : 'danger'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 mt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Outstanding</span>
                  <span className="font-semibold text-slate-700 tabular-nums">{formatINR(p.pOutstanding)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Vendor Dues</span>
                  <span className="font-semibold text-red-600 tabular-nums">{formatINR(p.pDues)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
