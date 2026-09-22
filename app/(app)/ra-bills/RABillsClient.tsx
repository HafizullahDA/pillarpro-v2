'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { RABillActions, ProjectOption, RABillOption } from './RABillActions'
import { canCreateRaBill, canEditRaBill } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { NewRABillDrawer } from '@/components/ra-bills/NewRABillDrawer'
import { PrintPreviewModal } from '@/components/pdf/PrintPreviewModal'
import { RABillCertificatePDF } from '@/components/pdf/RABillCertificatePDF'
import { MeasurementSheetPDF } from '@/components/pdf/MeasurementSheetPDF'
import { getClientOrganization, OrganizationProfile, DEFAULT_ORGANIZATION } from '@/lib/organization'
import { generateRABillWhatsAppText, openWhatsApp } from '@/lib/whatsapp'
import { exportRABillsRegister } from '@/lib/export/csv'
import { saveOfflineSnapshot } from '@/lib/offline/db'
import { useToast } from '@/components/ui/Toast'
import { RABillItem } from '@/lib/types/boq'

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
  tds_deducted?: number
  gst_tds_deducted?: number
  labour_cess_deducted?: number
  other_deductions?: number
  total_deductions?: number
  net_bank_received?: number
  date_received: string | null
  outstanding_balance: number
  billing_mode?: 'standalone' | 'cumulative'
  billing_entry_mode?: 'lump_sum' | 'item_wise'
  previous_bill_id?: string | null
  cumulative_certified_amount?: number | null
  previous_certified_amount?: number
  previous_received_amount?: number
  net_payable_this_bill?: number
  this_bill_work_certified?: number
  bill_type?: 'running' | 'first_and_final' | 'final'
  mb_number?: string | null
  mb_page_start?: number | null
  mb_page_end?: number | null
  measurement_date?: string | null
  measuring_officer_name?: string | null
  measuring_officer_designation?: string | null
  advance_payments_unmeasured?: number
  cement_recovery?: number
  steel_recovery?: number
  other_material_recovery?: number
  actual_completion_date?: string | null
  dlp_months?: number
  status: 'submitted' | 'partially_paid' | 'fully_paid'
  document_url: string | null
  remarks: string | null
  projects?: { name: string; agency_name?: string | null } | null
  bill_deductions?: { id?: string; deduction_label: string; deduction_amount: number }[]
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
  userRole?: string
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
  userRole,
}: RABillsClientProps) {
  const supabase = createClient()
  const toast = useToast()
  const canCreate = canCreateRaBill(userRole)
  const canEdit = canEditRaBill(userRole) || canCreate
  const [editingBill, setEditingBill] = useState<RABillRow | null>(null)
  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showGuaranteesSection, setShowGuaranteesSection] = useState(false)

  // Payment Drawer Shortcut State
  const [payBillId, setPayBillId] = useState<string | undefined>(undefined)
  // Printable Certificate State
  const [certBill, setCertBill] = useState<RABillRow | null>(null)
  const [embModal, setEmbModal] = useState<{ bill: RABillRow; items: RABillItem[] } | null>(null)
  const [loadingEmbId, setLoadingEmbId] = useState<string | null>(null)
  const [org, setOrg] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION)

  const handleOpenEmbSheet = async (bill: RABillRow) => {
    setLoadingEmbId(bill.id)
    try {
      const { data, error } = await supabase
        .from('ra_bill_items')
        .select('*, boq_items(item_number, description, unit, tender_quantity, awarded_rate)')
        .eq('ra_bill_id', bill.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setEmbModal({ bill, items: (data || []) as RABillItem[] })
    } catch {
      toast.error('Could not load e-MB measurement items for this bill.')
    } finally {
      setLoadingEmbId(null)
    }
  }

  useEffect(() => {
    getClientOrganization().then(setOrg)
  }, [])

  useEffect(() => {
    if (navigator.onLine) {
      void saveOfflineSnapshot('/ra-bills', {
        bills: initialBills,
        deposits: initialDeposits,
        projects,
      })
    }
  }, [initialBills, initialDeposits, projects])

  // 1. FILTER BILLS (By Project, Status, Search)
  const filteredBills = useMemo(() => {
    return initialBills.filter(b => {
      // Project filter
      if (selectedProjectId !== 'all' && b.project_id !== selectedProjectId) return false

      // Status filter
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = b.bill_number.toLowerCase().includes(q)
        const matchProj = b.projects?.name?.toLowerCase().includes(q)
        const matchRemarks = b.remarks?.toLowerCase().includes(q)
        if (!matchNum && !matchProj && !matchRemarks) return false
      }

      return true
    })
  }, [initialBills, selectedProjectId, selectedStatus, searchQuery])

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
    const totalCertified = kpiScopeBills.reduce((s, b) => {
      const isCum = b.billing_mode === 'cumulative'
      const cert = isCum && b.this_bill_work_certified != null
        ? Number(b.this_bill_work_certified)
        : (Number(b.work_certified_amount) || 0)
      return s + cert
    }, 0)

    const totalRetention = kpiScopeBills.reduce((s, b) => {
      const isCum = b.billing_mode === 'cumulative'
      if (isCum && b.this_bill_work_certified != null) {
        const retPct = Number(b.retention_percentage) || 5
        return s + (Math.round((Number(b.this_bill_work_certified) * retPct) / 100 * 100) / 100)
      }
      return s + (Number(b.retention_amount) || 0)
    }, 0)

    const totalNetPayable = kpiScopeBills.reduce((s, b) => {
      const net = b.net_payable_this_bill != null
        ? Number(b.net_payable_this_bill)
        : (Number(b.net_payable_amount) || 0)
      return s + net
    }, 0)

    const totalGrossReceived = kpiScopeBills.reduce((s, b) => s + (Number(b.amount_received) || 0), 0)
    const totalNetBankCash = kpiScopeBills.reduce((s, b) => {
      const netBank = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
        ? Number(b.net_bank_received)
        : Number(b.amount_received) || 0
      return s + netBank
    }, 0)
    const totalTaxDeductions = kpiScopeBills.reduce((s, b) => s + (Number(b.total_deductions) || 0), 0)
    const totalOutstanding = kpiScopeBills.reduce((s, b) => {
      const netPassed = b.net_payable_this_bill != null
        ? Number(b.net_payable_this_bill)
        : (Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
          ? Number(b.net_payable_amount)
          : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)))
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
      totalGrossReceived,
      totalNetBankCash,
      totalTaxDeductions,
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
      const netPassed = b.net_payable_this_bill != null
        ? Number(b.net_payable_this_bill)
        : (Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
          ? Number(b.net_payable_amount)
          : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)))
      const out = Math.max(0, netPassed - (Number(b.amount_received) || 0))
      return {
        id: b.id,
        bill_number: b.bill_number,
        project_id: b.project_id,
        billing_mode: b.billing_mode,
        previous_bill_id: b.previous_bill_id,
        cumulative_certified_amount: b.cumulative_certified_amount != null ? Number(b.cumulative_certified_amount) : null,
        previous_certified_amount: Number(b.previous_certified_amount) || 0,
        previous_received_amount: Number(b.previous_received_amount) || 0,
        net_payable_this_bill: b.net_payable_this_bill != null ? Number(b.net_payable_this_bill) : undefined,
        this_bill_work_certified: b.this_bill_work_certified != null ? Number(b.this_bill_work_certified) : undefined,
        work_certified_amount: Number(b.work_certified_amount) || 0,
        retention_percentage: Number(b.retention_percentage) || 0,
        retention_amount: Number(b.retention_amount) || 0,
        net_payable_amount: netPassed,
        amount_received: Number(b.amount_received) || 0,
        tds_deducted: Number(b.tds_deducted) || 0,
        gst_tds_deducted: Number(b.gst_tds_deducted) || 0,
        labour_cess_deducted: Number(b.labour_cess_deducted) || 0,
        other_deductions: Number(b.other_deductions) || 0,
        total_deductions: Number(b.total_deductions) || 0,
        net_bank_received: Number(b.net_bank_received) || Number(b.amount_received) || 0,
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

        {canCreate && (
          <RABillActions
            projects={projects}
            raBills={billOptions}
            defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
            preselectedBillId={payBillId}
            onClosePayment={() => setPayBillId(undefined)}
            org={org}
          />
        )}
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

          {/* 1-Click Form 26 CSV Export */}
          <button
            type="button"
            onClick={() => exportRABillsRegister(filteredBills, selectedProjectObj?.name)}
            title="Export Form 26 RA Bill Register for CA & PWD Audit (Excel & CSV)"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Register (CSV)
          </button>

          {/* Quick link to Project Form 43 Ledger */}
          {selectedProjectId !== 'all' && (
            <a
              href={`/projects/${selectedProjectId}/ledger`}
              title="Open CPWA Form 43 Running Account Ledger & DLP Tracker"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-xs"
            >
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Open Form 43 Ledger →
            </a>
          )}
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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

        {/* Top Tier: Primary Focus Cards (Outstanding, Net Bank Cash, & Retention) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
              {formatINR(metrics.totalOutstanding)}
            </p>
            <p className="text-xs text-rose-600/90 font-medium mt-1.5">
              Net pending payment from government treasury across submitted bills
            </p>
          </div>

          {/* 2. NET BANK CASH RECEIVED (Hero Focus #2 - Real Liquidity) */}
          <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-2xl border-2 border-emerald-300/80 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Net Bank Cash in Hand
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Real Liquidity
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
              {formatINR(metrics.totalNetBankCash)}
            </p>
            <p className="text-xs text-emerald-700/90 font-medium mt-1.5">
              Actual liquid funds credited to bank account after all statutory deductions
            </p>
          </div>

          {/* 3. RETENTION MONEY WITHHELD (Hero Focus #3) */}
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
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
              {formatINR(metrics.totalRetention)}
            </p>
            <p className="text-xs text-amber-700/90 font-medium mt-1.5">
              Cumulative retention held back (releaseable post-completion / DLP)
            </p>
          </div>
        </div>

        {/* Bottom Tier: Secondary Context Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Work Certified</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{formatINR(metrics.totalCertified)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Approved gross work value</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-teal-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gross Treasury Released</p>
            <p className="text-xl font-bold text-teal-700 tabular-nums mt-0.5">{formatINR(metrics.totalGrossReceived)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Gross disbursed by treasury</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-purple-500 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tax & Cess Deductions</p>
            <p className="text-xl font-bold text-purple-700 tabular-nums mt-0.5">{formatINR(metrics.totalTaxDeductions)}</p>
            <p className="text-[11px] text-slate-400 mt-1">TDS, GST-TDS & Cess with tax portal</p>
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
          <>
            {/* Mobile View: Stacked Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredBills.map(b => {
                const isCum = b.billing_mode === 'cumulative'
                const netPassed = b.net_payable_this_bill != null
                  ? Number(b.net_payable_this_bill)
                  : (Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
                    ? Number(b.net_payable_amount)
                    : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)))
                const received = Number(b.amount_received) || 0
                const outstanding = Math.max(0, netPassed - received)

                const isFullyPaid = received >= netPassed && netPassed > 0
                const isPartiallyPaid = !isFullyPaid && received > 0
                const derivedStatus = isFullyPaid ? 'fully_paid' : (isPartiallyPaid ? 'partially_paid' : (b.status || 'submitted'))

                const statusConfig = STATUS_BADGE_CONFIG[derivedStatus] || {
                  label: derivedStatus,
                  variant: 'neutral' as const,
                }

                return (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{b.bill_number}</span>
                          {b.bill_type === 'final' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Final Bill (Form 27-B)
                            </span>
                          )}
                          {b.bill_type === 'first_and_final' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                              1st & Final (Form 24)
                            </span>
                          )}
                          {isCum && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Cumulative
                            </span>
                          )}
                          {b.mb_number && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              MB #{b.mb_number}
                            </span>
                          )}
                          {b.document_url && (
                            <a
                              href={b.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View Measurement Sheet"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{b.projects?.name || '—'}</p>
                      </div>
                      <Badge label={statusConfig.label} variant={statusConfig.variant} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Work Certified</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {formatINR(Number(b.work_certified_amount))}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Gross Released</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          {formatINR(received)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Date</span>
                        <span className="text-slate-600 tabular-nums">
                          {formatDate(b.submission_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Outstanding</span>
                        <span className={`font-bold tabular-nums ${outstanding > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          {formatINR(outstanding)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => setCertBill(b)}
                          className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-semibold"
                          title="View / Print Billing Certificate"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEmbSheet(b)}
                          disabled={loadingEmbId === b.id}
                          className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-semibold"
                          title="View / Print CPWD Form 26 Measurement Sheet"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          {loadingEmbId === b.id ? '...' : 'e-MB'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(generateRABillWhatsAppText(b, org))}
                          className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-semibold"
                          title="Share via WhatsApp"
                        >
                          <span className="text-xs">💬</span>
                          Share
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditingBill(b)}
                            className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-semibold"
                            title="Edit RA Bill Details & Retention"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        )}
                      </div>

                      {canCreate && derivedStatus !== 'fully_paid' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs py-1 px-2.5 h-auto text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => setPayBillId(b.id)}
                        >
                          + Record Pay
                        </Button>
                      ) : derivedStatus === 'fully_paid' ? (
                        <span className="text-xs text-slate-400 font-medium">Settled</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3 hidden md:table-cell">Project / Agency</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Work Certified</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Retention ({'%'})</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Net Passed</th>
                  <th className="px-4 py-3 text-right">Gross Released</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map(b => {
                  const isCum = b.billing_mode === 'cumulative'
                  const netPassed = b.net_payable_this_bill != null
                    ? Number(b.net_payable_this_bill)
                    : (Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
                      ? Number(b.net_payable_amount)
                      : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)))
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
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          {b.bill_number}
                          {b.bill_type === 'final' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Final Bill (Form 27-B)
                            </span>
                          )}
                          {b.bill_type === 'first_and_final' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                              1st & Final (Form 24)
                            </span>
                          )}
                          {isCum && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Cumulative
                            </span>
                          )}
                          {b.mb_number && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              MB #{b.mb_number}
                            </span>
                          )}
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
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {isCum && b.this_bill_work_certified != null
                            ? formatINR(Number(b.this_bill_work_certified))
                            : formatINR(b.work_certified_amount)}
                        </div>
                        {isCum && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            To date: {formatINR(Number(b.cumulative_certified_amount) || Number(b.work_certified_amount))}
                          </div>
                        )}
                      </td>

                      {/* Retention */}
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell tabular-nums whitespace-nowrap">
                        <div className="text-amber-800 font-medium">
                          {isCum && b.this_bill_work_certified != null
                            ? formatINR(Math.round((Number(b.this_bill_work_certified) * (Number(b.retention_percentage) || 5)) / 100 * 100) / 100)
                            : formatINR(b.retention_amount)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">({b.retention_percentage}%)</div>
                      </td>

                      {/* Net Payable */}
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-900">{formatINR(netPassed)}</div>
                        {isCum && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            This Bill
                          </div>
                        )}
                      </td>

                      {/* Gross Released & Net Bank */}
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-teal-700">{formatINR(received)}</div>
                        {Number(b.total_deductions) > 0 ? (
                          <>
                            <div className="text-[11px] text-emerald-700 font-medium">
                              Bank: {formatINR(Number(b.net_bank_received) || (received - Number(b.total_deductions)))}
                            </div>
                            {b.bill_deductions && b.bill_deductions.length > 0 && (
                              <div className="text-[10px] text-purple-600 font-medium">
                                {b.bill_deductions.length} dept deduction{b.bill_deductions.length > 1 ? 's' : ''}
                              </div>
                            )}
                          </>
                        ) : (
                          b.date_received && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              on {formatDate(b.date_received)}
                            </div>
                          )
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setCertBill(b)}
                            title="View / Print Billing Certificate (PDF)"
                            className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors font-semibold"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEmbSheet(b)}
                            disabled={loadingEmbId === b.id}
                            title="View / Print CPWD Form 26 Measurement Sheet (e-MB)"
                            className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors font-semibold"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            {loadingEmbId === b.id ? '...' : 'e-MB'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(generateRABillWhatsAppText(b, org))}
                            title="Share bill details via WhatsApp"
                            className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors font-semibold"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                            WA
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setEditingBill(b)}
                              title="Edit RA Bill Details & Retention"
                              className="inline-flex items-center gap-1 text-xs py-1 px-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors font-semibold"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}
                          {canCreate && derivedStatus !== 'fully_paid' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs py-1 px-2.5 h-auto text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => setPayBillId(b.id)}
                            >
                              + Pay
                            </Button>
                          ) : derivedStatus === 'fully_paid' ? (
                            <span className="text-xs text-slate-400 font-medium px-1">Settled</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Printable RA Bill Certificate Modal */}
      {certBill && (
        <PrintPreviewModal
          open={!!certBill}
          onClose={() => setCertBill(null)}
          title={`Billing Certificate — ${certBill.bill_number}`}
          subtitle={certBill.projects?.name || 'Running Account Bill Certificate'}
          whatsappText={generateRABillWhatsAppText(certBill, org)}
        >
          <RABillCertificatePDF bill={certBill} organization={org} />
        </PrintPreviewModal>
      )}

      {/* Printable CPWD Form 26 Measurement Sheet Modal */}
      {embModal && (
        <PrintPreviewModal
          open={!!embModal}
          onClose={() => setEmbModal(null)}
          title={`e-MB Measurement Sheet — ${embModal.bill.bill_number}`}
          subtitle={embModal.bill.projects?.name || 'CPWD Form 26 Abstract of Measurements'}
        >
          <MeasurementSheetPDF
            bill={embModal.bill}
            items={embModal.items}
            organization={org}
          />
        </PrintPreviewModal>
      )}

      {/* Edit RA Bill Drawer */}
      {editingBill && (
        <NewRABillDrawer
          open={!!editingBill}
          onClose={() => setEditingBill(null)}
          projects={projects}
          raBills={billOptions}
          editBill={editingBill}
          onSuccess={() => {
            setEditingBill(null)
          }}
        />
      )}
    </div>
  )
}
