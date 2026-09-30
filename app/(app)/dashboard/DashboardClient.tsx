'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { Badge } from '@/components/ui/Badge'
import { formatINR } from '@/lib/format'
import { ContractorOnboardingChecklist } from '@/components/dashboard/ContractorOnboardingChecklist'
import { saveOfflineSnapshot } from '@/lib/offline/db'

import {
  ContractItem,
  SecurityDepositItem,
  BOQItemSummary,
  MeasurementEntrySummary,
  ContractEventSummary,
  HindranceSummary,
  CorrespondenceSummary,
  EOTCaseSummary,
  VariationSummary,
  ClaimSummary,
  MachineryAssetSummary,
  InventoryItemSummary,
  WagePaymentSummary,
  RawRABillItem,
} from '@/components/dashboard/types'

import { ContractPositionSection } from '@/components/dashboard/ContractPositionSection'
import { WorkProgressSection } from '@/components/dashboard/WorkProgressSection'
import { ContractDefenseSection } from '@/components/dashboard/ContractDefenseSection'
import { FinancialRiskSection } from '@/components/dashboard/FinancialRiskSection'
import { OperationalRiskSection } from '@/components/dashboard/OperationalRiskSection'
import { DeadlinesClockSection } from '@/components/dashboard/DeadlinesClockSection'

type Project = { id: string; name: string; agency_name: string | null }
type Bill = {
  id: string
  project_id: string
  bill_date: string
  net_amount: number
  received: number
  net_bank_received?: number
  outstanding: number
}
type SupplierDue = {
  id: string
  supplier_id?: string
  project_id: string | null
  name: string
  due: number
}
type LedgerEntry = {
  id: string
  project_id: string | null
  entry_type: string
  category: string | null
  amount: number
  net_bank_amount?: number
  date: string
  source_table?: string
}

type DashboardClientProps = {
  projects: Project[]
  bills: Bill[]
  suppliers: SupplierDue[]
  ledger: LedgerEntry[]
  userRole: string
  orgName?: string | null

  // Command Center Feeds
  rawRABills?: RawRABillItem[]
  contracts?: ContractItem[]
  securityDeposits?: SecurityDepositItem[]
  boqItems?: BOQItemSummary[]
  measurements?: MeasurementEntrySummary[]
  contractEvents?: ContractEventSummary[]
  hindrances?: HindranceSummary[]
  correspondence?: CorrespondenceSummary[]
  eotCases?: EOTCaseSummary[]
  variations?: VariationSummary[]
  claims?: ClaimSummary[]
  machineryAssets?: MachineryAssetSummary[]
  inventoryItems?: InventoryItemSummary[]
  wagePayments?: WagePaymentSummary[]
}

export function DashboardClient({
  projects,
  bills,
  suppliers,
  ledger,
  userRole,
  orgName,
  rawRABills = [],
  contracts = [],
  securityDeposits = [],
  boqItems = [],
  measurements = [],
  contractEvents = [],
  hindrances = [],
  correspondence = [],
  eotCases = [],
  variations = [],
  claims = [],
  machineryAssets = [],
  inventoryItems = [],
  wagePayments = [],
}: DashboardClientProps) {
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'all'>('all')

  useEffect(() => {
    if (navigator.onLine) {
      void saveOfflineSnapshot('/dashboard', { projects, bills, suppliers, ledger, orgName })
    }
  }, [projects, bills, suppliers, ledger, orgName])

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Filter bills & supplier dues by selected project
  const filteredBills = bills.filter(b => selectedProject === 'all' || b.project_id === selectedProject)

  // Filter suppliers by project
  const filteredSuppliers = suppliers.filter(v =>
    selectedProject === 'all' ? v.project_id === null : v.project_id === selectedProject
  )

  const totalOutstanding = filteredBills.reduce((sum, b) => sum + b.outstanding, 0)
  const totalSupplierDues = filteredSuppliers.reduce((sum, v) => sum + (v.due > 0 ? v.due : 0), 0)

  // Bills-based cumulative receipts
  const allTimeGrossReceived = filteredBills.reduce((sum, b) => sum + b.received, 0)
  const allTimeNetBankReceived = filteredBills.reduce((sum, b) => sum + (b.net_bank_received ?? b.received), 0)

  // Filter ledger entries by selected project & date range
  const filteredLedger = ledger.filter(item => {
    if (selectedProject !== 'all' && item.project_id !== selectedProject) {
      return false
    }
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

  // Date-filtered income from ledger
  const periodGrossReceived = filteredLedger
    .filter(i => i.entry_type === 'income')
    .reduce((sum, i) => sum + i.amount, 0)

  const periodNetBankReceived = filteredLedger
    .filter(i => i.entry_type === 'income')
    .reduce((sum, i) => sum + (i.net_bank_amount ?? i.amount), 0)

  const displayGrossReceived = dateRange === 'all' ? allTimeGrossReceived : periodGrossReceived
  const displayNetReceived = dateRange === 'all' ? allTimeNetBankReceived : periodNetBankReceived

  // Direct site & operational expenses
  const totalExpense = filteredLedger
    .filter(i => i.entry_type === 'expense' && (!i.source_table || i.source_table === 'expenses'))
    .reduce((sum, i) => sum + i.amount, 0)

  // Net Position Block
  const netCashMovement = displayNetReceived - totalExpense
  const netLiquidityPosition = totalOutstanding - totalSupplierDues

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
    const pSuppliers = suppliers.filter(v => v.project_id === p.id)

    const pOutstanding = pBills.reduce((sum, b) => sum + b.outstanding, 0)
    const pDues = pSuppliers.reduce((sum, v) => sum + (v.due > 0 ? v.due : 0), 0)

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

  // ==========================================
  // Command Center Filtered Datasets
  // ==========================================
  const filteredContracts = contracts.filter(c => selectedProject === 'all' || c.project_id === selectedProject)
  const filteredVariations = variations.filter(v => selectedProject === 'all' || v.project_id === selectedProject)
  const filteredRawRABills = rawRABills.filter(b => selectedProject === 'all' || b.project_id === selectedProject)
  const filteredBOQItems = boqItems.filter(b => selectedProject === 'all' || b.project_id === selectedProject)
  const filteredMeasurements = measurements.filter(m => selectedProject === 'all' || m.project_id === selectedProject)
  const filteredEvents = contractEvents.filter(e => selectedProject === 'all' || e.project_id === selectedProject)
  const filteredHindrances = hindrances.filter(h => selectedProject === 'all' || h.project_id === selectedProject)
  const filteredCorrespondence = correspondence.filter(c => selectedProject === 'all' || c.project_id === selectedProject)
  const filteredEOTCases = eotCases.filter(e => selectedProject === 'all' || e.project_id === selectedProject)
  const filteredClaims = claims.filter(c => selectedProject === 'all' || c.project_id === selectedProject)
  const filteredMachinery = machineryAssets.filter(m => selectedProject === 'all' || !m.project_id || m.project_id === selectedProject)
  const filteredInventory = inventoryItems.filter(i => selectedProject === 'all' || !i.project_id || i.project_id === selectedProject)
  const filteredWagePayments = wagePayments.filter(w => selectedProject === 'all' || w.project_id === selectedProject)
  const filteredSecurityDeposits = securityDeposits.filter(s => selectedProject === 'all' || s.project_id === selectedProject)

  // Financial values for sections
  const origContractVal = filteredContracts.reduce((sum, c) => sum + (Number(c.awarded_amount) || 0), 0)
  const appVOVal = filteredVariations
    .filter(v => v.status === 'APPROVED' && !v.is_deletion)
    .reduce((sum, v) => sum + (Number(v.approved_amount) || 0), 0)
  const appDelVal = filteredVariations
    .filter(v => v.status === 'APPROVED' && v.is_deletion)
    .reduce((sum, v) => sum + (Number(v.deleted_work_amount) || Number(v.approved_amount) || 0), 0)
  const currentContractValue = origContractVal + appVOVal - appDelVal

  const billedValue = filteredRawRABills.reduce((sum, b) => {
    const netPassed = b.net_payable_this_bill != null
      ? Number(b.net_payable_this_bill)
      : (b.net_payable_amount != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) || 0) - (Number(b.retention_amount) || 0))
    return sum + (Number(netPassed) || 0)
  }, 0)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Interactive Contractor Onboarding Checklist */}
      <ContractorOnboardingChecklist
        projectCount={projects.length}
        supplierCount={suppliers.filter(s => s.project_id === null).length}
        raBillCount={bills.length}
        hasExpenseOrLedger={ledger.length > 0}
        orgName={orgName}
      />

      {/* Top Header & Executive Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Government Contractor Command Center
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
              Enterprise 360°
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time portfolio &amp; project telemetry derived from authoritative contracts, e-MB, RA bills, and site records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date range selector for cash flow */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'month' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('quarter')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'quarter' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Quarter
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateRange === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Time
            </button>
          </div>

          {/* Project selector */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            <option value="all">Portfolio-Level: All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Contract Copilot Quick Trigger */}
          <Link
            href="/contract-ai"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold shadow-xs hover:from-blue-800 hover:to-indigo-900 transition-all"
          >
            <svg className="w-3.5 h-3.5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span>Contract Copilot</span>
            <span className="text-[9px] bg-white/20 px-1 py-0.5 rounded font-bold uppercase">AI</span>
          </Link>
        </div>
      </div>

      {/* Quick Anchor Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium scrollbar-thin">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] shrink-0">Jump To:</span>
        <a href="#contract-position" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shrink-0">
          1. Contract Position
        </a>
        <a href="#work-progress" className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0">
          2. Work Progress
        </a>
        <a href="#contract-defense" className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shrink-0">
          3. Contract Defense
        </a>
        <a href="#financial-risk" className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors shrink-0">
          4. Financial Risk
        </a>
        <a href="#operational-risk" className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors shrink-0">
          5. Operational Risk
        </a>
        <a href="#deadlines" className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shrink-0">
          6. Deadlines Clock
        </a>
        <a href="#cash-flow-and-aging" className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0">
          7. Cash Flow &amp; Aging
        </a>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CONTRACT POSITION                                              */}
      {/* ========================================================================= */}
      <ContractPositionSection
        contracts={filteredContracts}
        variations={filteredVariations}
        bills={filteredRawRABills}
        boqItems={filteredBOQItems}
      />

      {/* ========================================================================= */}
      {/* SECTION 2: WORK PROGRESS & BOQ EXECUTION                                   */}
      {/* ========================================================================= */}
      <WorkProgressSection
        boqItems={filteredBOQItems}
        measurements={filteredMeasurements}
        currentContractValue={currentContractValue}
        billedValue={billedValue}
      />

      {/* ========================================================================= */}
      {/* SECTION 3: CONTRACT DEFENSE & CLAIMS MATRIX                               */}
      {/* ========================================================================= */}
      <ContractDefenseSection
        events={filteredEvents}
        hindrances={filteredHindrances}
        correspondence={filteredCorrespondence}
        eotCases={filteredEOTCases}
        variations={filteredVariations}
        claims={filteredClaims}
      />

      {/* ========================================================================= */}
      {/* SECTION 4: FINANCIAL RISK & LIQUIDITY EXPOSURE                            */}
      {/* ========================================================================= */}
      <FinancialRiskSection
        bills={filteredRawRABills}
        supplierDues={totalSupplierDues}
        wagePayments={filteredWagePayments}
        securityDeposits={filteredSecurityDeposits}
        claims={filteredClaims}
      />

      {/* ========================================================================= */}
      {/* SECTION 5: OPERATIONAL RISK & SITE BOTTLENECKS                            */}
      {/* ========================================================================= */}
      <OperationalRiskSection
        inventoryItems={filteredInventory}
        machineryAssets={filteredMachinery}
        measurements={filteredMeasurements}
        events={filteredEvents}
        hindrances={filteredHindrances}
        wagePayments={filteredWagePayments}
      />

      {/* ========================================================================= */}
      {/* SECTION 6: STATUTORY & CONTRACTUAL DEADLINES CLOCK                         */}
      {/* ========================================================================= */}
      <DeadlinesClockSection
        securityDeposits={filteredSecurityDeposits}
        contracts={filteredContracts}
        correspondence={filteredCorrespondence}
        eotCases={filteredEOTCases}
      />

      {/* ========================================================================= */}
      {/* SECTION 7: CASH FLOW & RECEIVABLES AGING (PRESERVED)                      */}
      {/* ========================================================================= */}
      <div id="cash-flow-and-aging" className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-slate-700 inline-block" />
          <h2 className="text-base font-bold text-slate-900">7. Net Cash Movement &amp; Receivables Aging</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Treasury &amp; Working Capital
          </span>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile
            label="Total Expense"
            value={formatINR(totalExpense)}
            sub={dateRange === 'all' ? 'Site operational expenses' : `${dateRange === 'month' ? 'This month' : 'This quarter'}`}
            accent="red"
          />
          <SummaryTile
            label="Total Received"
            value={formatINR(displayNetReceived)}
            sub={dateRange === 'all'
              ? `Gross Released: ${formatINR(displayGrossReceived)}`
              : `Gross: ${formatINR(displayGrossReceived)} (All time: ${formatINR(allTimeNetBankReceived)})`
            }
            accent="emerald"
          />
          <SummaryTile label="Outstanding" value={formatINR(totalOutstanding)} accent="amber" />
          <SummaryTile label="Supplier Dues" value={formatINR(totalSupplierDues)} accent="blue" />
        </div>

        {/* Net Position Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${netCashMovement >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Cash Position</span>
              <p className="text-xs text-slate-400 mt-0.5">Total Received minus Total Expense</p>
            </div>
            <div className="mt-4">
              <span className={`text-2xl font-bold ${netCashMovement >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {netCashMovement < 0 ? `-${formatINR(Math.abs(netCashMovement))}` : formatINR(netCashMovement)}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {dateRange === 'all' ? 'Across all recorded transactions' : `For selected period (${dateRange})`}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Liquidity Position</span>
              <p className="text-xs text-slate-400 mt-0.5">RA Outstanding minus Supplier Dues</p>
            </div>
            <div className="mt-4">
              <span className={`text-2xl font-bold ${netLiquidityPosition >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {netLiquidityPosition < 0 ? `-${formatINR(Math.abs(netLiquidityPosition))}` : formatINR(netLiquidityPosition)}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {netLiquidityPosition >= 0 ? 'Surplus buffer over supplier payables' : 'Supplier liabilities exceed receivables'}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Flow Trend + Aging Bands Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trailing 6-Month Cash Flow</h3>
                <p className="text-xs text-slate-500 mt-0.5">Monthly Receipts vs Direct Site Expenses</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  Received
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                  Expense
                </span>
              </div>
            </div>

            <div className="h-44 flex items-end gap-2 pt-4 border-b border-slate-100 pb-2">
              {monthsList.map((m, i) => {
                const incPct = Math.round((m.mIncome / maxTrendVal) * 100)
                const expPct = Math.round((m.mExpense / maxTrendVal) * 100)

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      <div
                        style={{ height: `${Math.max(incPct, 4)}%` }}
                        className="w-3.5 bg-emerald-500 rounded-t-md transition-all duration-300"
                        title={`Received: ${formatINR(m.mIncome)}`}
                      />
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Projects at a Glance</h3>
            <Link
              href="/projects"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              + Add Project
            </Link>
          </div>

          {projectGlance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">No active projects yet.</p>
              <Link
                href="/projects"
                className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                Create your first project &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectGlance.map(p => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group bg-slate-50/50 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                        title={p.name}
                      >
                        {p.name}
                      </p>
                      <p
                        className="text-xs text-slate-500 truncate mt-0.5"
                        title={p.agency_name ?? 'Government Site'}
                      >
                        {p.agency_name ?? 'Government Site'}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <Badge
                        label={p.status === 'healthy' ? 'Healthy' : p.status === 'warning' ? 'Warning' : 'Critical'}
                        variant={p.status === 'healthy' ? 'success' : p.status === 'warning' ? 'warning' : 'danger'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 mt-auto">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Outstanding</span>
                      <span className="font-semibold text-slate-700 tabular-nums">{formatINR(p.pOutstanding)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Supplier Dues</span>
                      <span className="font-semibold text-red-600 tabular-nums">{formatINR(p.pDues)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
