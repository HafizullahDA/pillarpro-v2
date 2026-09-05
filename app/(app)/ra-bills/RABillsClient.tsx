'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { RABillActions, ProjectOption, RABillOption } from './RABillActions'

// ════════════════════════════════════════════════════════════════════════
// CONFIGURABLE THRESHOLD FOR EXPIRING BANK GUARANTEES (IN DAYS)
// Change this single number (e.g. to 45 or 60) to adjust the alert horizon:
export const BG_EXPIRY_THRESHOLD_DAYS = 30
// ════════════════════════════════════════════════════════════════════════

export type RABillRow = {
  id: string
  project_id: string
  bill_number: string
  submission_date: string
  work_certified_amount: number
  retention_percentage: number
  retention_amount: number
  net_payable_amount: number
  amount_received: number
  date_received: string | null
  outstanding_balance: number
  status: 'submitted' | 'partially_paid' | 'fully_paid'
  document_url: string | null
  remarks: string | null
  projects?: { name: string; agency_name?: string | null } | null
}

export type SecurityDepositRow = {
  id: string
  project_id: string
  deposit_type: string
  reference_number: string
  issuing_bank: string | null
  amount: number
  issue_date: string | null
  expiry_date: string
  claim_expiry_date: string | null
  status: 'active' | 'released' | 'expired' | 'invoked'
  document_url: string | null
  notes: string | null
  projects?: { name: string } | null
}

interface RABillsClientProps {
  initialBills: RABillRow[]
  initialDeposits: SecurityDepositRow[]
  projects: ProjectOption[]
}

const STATUS_BADGE_CONFIG = {
  submitted:      { label: 'Submitted (Pending)', variant: 'warning' as const },
  partially_paid: { label: 'Partially Paid',      variant: 'info' as const },
  fully_paid:     { label: 'Fully Paid',          variant: 'success' as const },
}

export function RABillsClient({
  initialBills,
  initialDeposits,
  projects,
}: RABillsClientProps) {
  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showGuaranteesSection, setShowGuaranteesSection] = useState(false)

  // Payment Drawer Shortcut State
  const [payBillId, setPayBillId] = useState<string | undefined>(undefined)

  // 1. FILTER BILLS (By Project, Status, Search)
  const filteredBills = useMemo(() => {
    return initialBills.filter(b => {
      // Project filter
      if (selectedProjectId !== 'all' && b.project_id !== selectedProjectId) return false

      // Status filter
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false

      // Search query filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const billNoMatch = b.bill_number.toLowerCase().includes(q)
        const projMatch = (b.projects?.name || '').toLowerCase().includes(q)
        const remarksMatch = (b.remarks || '').toLowerCase().includes(q)
        return billNoMatch || projMatch || remarksMatch
      }

      return true
    })
  }, [initialBills, selectedProjectId, selectedStatus, search])

  // 2. FILTER SECURITY DEPOSITS (By Project)
  const filteredDeposits = useMemo(() => {
    return initialDeposits.filter(sd => {
      if (selectedProjectId !== 'all' && sd.project_id !== selectedProjectId) return false
      return true
    })
  }, [initialDeposits, selectedProjectId])

  // 3. DYNAMIC KPI AGGREGATIONS (Aggregated across ALL or narrowed by Project)
  const kpiScopeBills = useMemo(() => {
    if (selectedProjectId === 'all') return initialBills
    return initialBills.filter(b => b.project_id === selectedProjectId)
  }, [initialBills, selectedProjectId])

  const kpiScopeDeposits = useMemo(() => {
    if (selectedProjectId === 'all') return initialDeposits
    return initialDeposits.filter(sd => sd.project_id === selectedProjectId)
  }, [initialDeposits, selectedProjectId])

  const metrics = useMemo(() => {
    const totalCertified = kpiScopeBills.reduce((s, b) => s + (Number(b.work_certified_amount) || 0), 0)
    const totalRetention = kpiScopeBills.reduce((s, b) => s + (Number(b.retention_amount) || 0), 0)
    const totalNetPayable = kpiScopeBills.reduce((s, b) => s + (Number(b.net_payable_amount) || 0), 0)
    const totalReceived = kpiScopeBills.reduce((s, b) => s + (Number(b.amount_received) || 0), 0)
    const totalOutstanding = kpiScopeBills.reduce((s, b) => {
      const netPassed = Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0))
      const out = Math.max(0, netPassed - (Number(b.amount_received) || 0))
      return s + out
    }, 0)

    const activeDepositsAmount = kpiScopeDeposits
      .filter(sd => sd.status === 'active')
      .reduce((s, sd) => s + (Number(sd.amount) || 0), 0)

    return {
      totalCertified,
      totalRetention,
      totalNetPayable,
      totalReceived,
      totalOutstanding,
      activeDepositsAmount,
    }
  }, [kpiScopeBills, kpiScopeDeposits])

  // 4. EXPIRING BANK GUARANTEES CALCULATION
  const todayMs = new Date().setHours(0, 0, 0, 0)
  const expiringBGs = useMemo(() => {
    return initialDeposits
      .filter(sd => sd.status === 'active' && sd.expiry_date)
      .map(sd => {
        const expMs = new Date(sd.expiry_date).getTime()
        const diffDays = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24))
        return { ...sd, daysLeft: diffDays }
      })
      .filter(sd => sd.daysLeft <= BG_EXPIRY_THRESHOLD_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [initialDeposits, todayMs])

  const billOptions: RABillOption[] = useMemo(() => {
    return initialBills.map(b => {
      const netPassed = Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0))
      const out = Math.max(0, netPassed - (Number(b.amount_received) || 0))
      return {
        id: b.id,
        bill_number: b.bill_number,
        project_id: b.project_id,
        work_certified_amount: Number(b.work_certified_amount) || 0,
        retention_percentage: Number(b.retention_percentage) || 0,
        retention_amount: Number(b.retention_amount) || 0,
        net_payable_amount: netPassed,
        amount_received: Number(b.amount_received) || 0,
        outstanding_balance: out,
        projects: b.projects ? { name: b.projects.name } : null,
      }
    })
  }, [initialBills])

  const selectedProjectObj = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Government RA Bill Tracker</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Civil Works
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Running Account certified billing, retention money monitoring, and Bank Guarantees (PBG/SD)
          </p>
        </div>

        <RABillActions
          projects={projects}
          raBills={billOptions}
          defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
          preselectedBillId={payBillId}
        />
      </div>

      {/* ── ⚠️ EXPIRING BANK GUARANTEES ALERT BANNER ── */}
      {expiringBGs.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-sm">
                !
              </span>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Attention: {expiringBGs.length} Bank Guarantee{expiringBGs.length > 1 ? 's' : ''} Expiring within {BG_EXPIRY_THRESHOLD_DAYS} Days!
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Initiate department extension or release process before expiry to prevent claim forfeiture.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                  {expiringBGs.map(bg => (
                    <div
                      key={bg.id}
                      className="bg-white/90 rounded-lg p-2.5 border border-rose-200 text-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{bg.reference_number}</span>
                        <span className="text-rose-600 tabular-nums">
                          {bg.daysLeft <= 0 ? 'Expired!' : `In ${bg.daysLeft} days`}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1 flex justify-between">
                        <span>{bg.issuing_bank || 'Bank'}</span>
                        <strong className="text-slate-800 tabular-nums">{formatINR(bg.amount)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Site: {bg.projects?.name || 'Project'} • Exp: {formatDate(bg.expiry_date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowGuaranteesSection(v => !v)}
              className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline whitespace-nowrap"
            >
              {showGuaranteesSection ? 'Hide All Guarantees' : 'View All Guarantees'}
            </button>
          </div>
        </div>
      )}

      {/* ── PROJECT & STATUS FILTER BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="ra-project-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project:</label>
            <select
              id="ra-project-filter"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Projects (Aggregate Overview)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.agency_name ? `• ${p.agency_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="ra-status-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</label>
            <select
              id="ra-status-filter"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted (Pending)</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-xs w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bill #, project, remarks..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── 🌟 PROMINENT KPI TILES ── */}
      {/* Visual hierarchy: Outstanding RA Balance and Retention Withheld are HERO cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Financial Position for:{' '}
            <strong className="text-slate-800">
              {selectedProjectId === 'all' ? 'All Projects (Consolidated)' : selectedProjectObj?.name}
            </strong>
          </span>
          <span>{kpiScopeBills.length} Total Bills</span>
        </div>

        {/* Top Tier: Primary Focus Cards (Outstanding & Retention) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. OUTSTANDING RA BALANCE (Hero Focus #1) */}
          <div className="bg-gradient-to-br from-white to-rose-50/40 rounded-2xl border-2 border-rose-300/80 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Outstanding RA Balance
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Primary Receivable
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
              {formatINR(metrics.totalOutstanding)}
            </p>
            <p className="text-xs text-rose-600/90 font-medium mt-1.5">
              Net pending payment from government treasury across submitted bills
            </p>
          </div>

          {/* 2. RETENTION MONEY WITHHELD (Hero Focus #2) */}
          <div className="bg-gradient-to-br from-white to-amber-50/40 rounded-2xl border-2 border-amber-300/80 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Retention Money Withheld
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Locked Govt Deposit
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
              {formatINR(metrics.totalRetention)}
            </p>
            <p className="text-xs text-amber-700/90 font-medium mt-1.5">
              Cumulative retention held back (releaseable post-completion / DLP)
            </p>
          </div>
        </div>

        {/* Bottom Tier: Secondary Context Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Work Certified</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{formatINR(metrics.totalCertified)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Approved gross work value</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payments Received</p>
            <p className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">{formatINR(metrics.totalReceived)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Disbursed by treasury to date</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Guarantees (PBG / SD)</p>
            <p className="text-xl font-bold text-indigo-700 tabular-nums mt-0.5">{formatINR(metrics.activeDepositsAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{kpiScopeDeposits.filter(d => d.status === 'active').length} active bank instruments</p>
          </div>
        </div>
      </div>

      {/* ── OPTIONAL / TOGGLED SECURITY DEPOSITS SECTION ── */}
      {showGuaranteesSection && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security Deposits & Performance Bank Guarantees</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank guarantees, FDRs, and EMDs pledged to government clients
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowGuaranteesSection(false)}>
              Close Guarantees View
            </Button>
          </div>

          {!filteredDeposits.length ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">
              No security deposits or bank guarantees logged for the selected scope.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 font-semibold uppercase">
                    <th className="px-3 py-2.5">Reference / BG No.</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Project</th>
                    <th className="px-3 py-2.5">Issuing Bank</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5">Expiry Date</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeposits.map(sd => (
                    <tr key={sd.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {sd.reference_number}
                        {sd.document_url && (
                          <a
                            href={sd.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            [Doc]
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2.5 capitalize">{sd.deposit_type.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2.5 font-medium">{sd.projects?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{sd.issuing_bank || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                        {formatINR(sd.amount)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700 font-medium">
                        {formatDate(sd.expiry_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sd.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sd.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RA BILLS DIRECTORY TABLE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Submitted RA Bills Directory</h2>
            <p className="text-xs text-slate-500">
              Showing {filteredBills.length} of {initialBills.length} government bills
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!showGuaranteesSection && (
              <button
                onClick={() => setShowGuaranteesSection(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                View Security Deposits / BGs ({initialDeposits.length})
              </button>
            )}
          </div>
        </div>

        {!filteredBills.length ? (
          <EmptyState
            title="No RA Bills Found"
            description="Submit your first government Running Account bill to track work certified, retention money, and pending treasury payments."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3 hidden md:table-cell">Project / Agency</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Work Certified</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Retention ({'%'})</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Net Passed</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map(b => {
                  const netPassed = Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
                    ? Number(b.net_payable_amount)
                    : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0))
                  const received = Number(b.amount_received) || 0
                  const outstanding = Math.max(0, netPassed - received)

                  // Derived status: fully_paid when received reaches or exceeds netPassed
                  const isFullyPaid = received >= netPassed && netPassed > 0
                  const isPartiallyPaid = !isFullyPaid && received > 0
                  const derivedStatus = isFullyPaid ? 'fully_paid' : (isPartiallyPaid ? 'partially_paid' : (b.status || 'submitted'))

                  const statusConfig = STATUS_BADGE_CONFIG[derivedStatus] || {
                    label: derivedStatus,
                    variant: 'neutral' as const,
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/75 transition-colors">
                      {/* Bill Number */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {b.bill_number}
                          {b.document_url && (
                            <a
                              href={b.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View Attached Measurement Sheet"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {b.remarks && <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{b.remarks}</p>}
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="font-medium text-slate-900">{b.projects?.name || '—'}</p>
                        {b.projects?.agency_name && (
                          <p className="text-xs text-slate-400">{b.projects.agency_name}</p>
                        )}
                      </td>

                      {/* Submission Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDate(b.submission_date)}
                      </td>

                      {/* Certified Amount */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatINR(b.work_certified_amount)}
                      </td>

                      {/* Retention */}
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell tabular-nums whitespace-nowrap">
                        <div className="text-amber-800 font-medium">{formatINR(b.retention_amount)}</div>
                        <div className="text-[11px] text-slate-400 font-mono">({b.retention_percentage}%)</div>
                      </td>

                      {/* Net Payable */}
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell tabular-nums text-slate-700 whitespace-nowrap">
                        {formatINR(netPassed)}
                      </td>

                      {/* Received */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-emerald-700 whitespace-nowrap">
                        {formatINR(received)}
                        {b.date_received && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            on {formatDate(b.date_received)}
                          </div>
                        )}
                      </td>

                      {/* Outstanding */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-bold whitespace-nowrap">
                        <span className={outstanding > 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {formatINR(outstanding)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Badge label={statusConfig.label} variant={statusConfig.variant} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {derivedStatus !== 'fully_paid' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs py-1 px-2.5 h-auto text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => setPayBillId(b.id)}
                          >
                            + Pay
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Settled</span>
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
    </div>
  )
}

