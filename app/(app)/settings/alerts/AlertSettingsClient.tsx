'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { StitchMetric } from '@/components/ui/StitchMetric'
import { StitchTable, StitchTableHead, StitchTableBody, StitchTableRow, StitchTableCell } from '@/components/ui/StitchTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'

export interface AlertPreferencesRecord {
  id: string
  organization_id: string
  primary_phone: string | null
  accounts_phone: string | null
  site_phone: string | null
  bg_fdr_enabled: boolean
  contractual_notices_enabled: boolean
  ra_bills_enabled: boolean
  supplier_credit_enabled: boolean
  dpr_reminders_enabled: boolean
  inventory_reorder_enabled: boolean
  machinery_fleet_enabled: boolean
  labour_payout_enabled: boolean
  threshold_config: {
    bg_warning_days?: number[]
    notice_warning_days?: number[]
    ra_bill_submission_delay_days?: number
    ra_bill_payment_delay_days?: number
    supplier_credit_threshold_pct?: number
    dpr_cutoff_time?: string
    machinery_service_interval_hours?: number
    machinery_compliance_warning_days?: number[]
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface DispatchLogItem {
  id: string
  organization_id: string
  project_id: string | null
  entity_type: string
  entity_id: string
  entity_reference: string | null
  milestone_key: string
  channel: string
  recipient_phone: string
  status: 'dispatched' | 'failed' | 'skipped' | string
  error_message: string | null
  meta_message_id: string | null
  dispatched_at: string
  payload_snapshot?: any
}

interface AlertSettingsClientProps {
  initialPreferences: AlertPreferencesRecord
  initialLogs: DispatchLogItem[]
  totalLogs: number
  userRole: string
  orgId: string
}

export function AlertSettingsClient({
  initialPreferences,
  initialLogs,
  totalLogs,
  userRole,
  orgId,
}: AlertSettingsClientProps) {
  const router = useRouter()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<'preferences' | 'logs'>('preferences')
  const [saving, setSaving] = useState(false)
  const [testingPhone, setTestingPhone] = useState<string | null>(null)
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null)

  // Local preferences form state
  const [prefs, setPrefs] = useState<AlertPreferencesRecord>(initialPreferences)

  // Test WhatsApp state
  const [customTestPhone, setCustomTestPhone] = useState('')
  const [customTestRole, setCustomTestRole] = useState('Primary Administrator')

  // Log filters
  const [logs, setLogs] = useState<DispatchLogItem[]>(initialLogs)
  const [logFilterType, setLogFilterType] = useState('all')
  const [logFilterStatus, setLogFilterStatus] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [refreshingLogs, setRefreshingLogs] = useState(false)

  // KPI calculations for Logs
  const logStats = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        if (log.status === 'dispatched') acc.dispatched++
        else if (log.status === 'failed') acc.failed++
        else if (log.status === 'skipped') acc.skipped++
        acc.total++
        return acc
      },
      { dispatched: 0, failed: 0, skipped: 0, total: 0 }
    )
  }, [logs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilterType !== 'all' && log.entity_type !== logFilterType) return false
      if (logFilterStatus !== 'all' && log.status !== logFilterStatus) return false
      if (logSearch.trim()) {
        const q = logSearch.trim().toLowerCase()
        const refMatch = log.entity_reference?.toLowerCase().includes(q) ?? false
        const phoneMatch = log.recipient_phone?.toLowerCase().includes(q) ?? false
        const milestoneMatch = log.milestone_key?.toLowerCase().includes(q) ?? false
        const typeMatch = log.entity_type?.toLowerCase().includes(q) ?? false
        return refMatch || phoneMatch || milestoneMatch || typeMatch
      }
      return true
    })
  }, [logs, logFilterType, logFilterStatus, logSearch])

  // Save Preferences
  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save preferences')
      }
      setPrefs(data.preferences)
      toast.success('Notification preferences and recipient numbers saved successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error saving alert preferences')
    } finally {
      setSaving(false)
    }
  }

  // Send Test Message
  const handleSendTestMessage = async (phone: string, roleName: string) => {
    if (!phone || phone.trim().length < 10) {
      toast.error('Please enter a valid mobile number with country code (e.g. +91 9876543210)')
      return
    }

    setTestingPhone(phone)
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, roleName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'WhatsApp test dispatch failed')
      }
      toast.success(data.message || `Test alert sent to ${phone}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test alert')
    } finally {
      setTestingPhone(null)
    }
  }

  // Refresh logs
  const handleRefreshLogs = async () => {
    setRefreshingLogs(true)
    try {
      const res = await fetch('/api/alerts/history?limit=100')
      const data = await res.json()
      if (res.ok && data.success) {
        setLogs(data.logs)
        toast.success('Delivery logs refreshed')
      }
    } catch {
      toast.error('Failed to refresh logs')
    } finally {
      setRefreshingLogs(false)
    }
  }

  // Retry Alert Dispatch
  const handleRetryDispatch = async (logId: string) => {
    setRetryingLogId(logId)
    try {
      const res = await fetch('/api/alerts/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retry dispatch')
      }
      toast.success(data.message || 'Alert re-dispatched successfully')
      void handleRefreshLogs()
    } catch (err: any) {
      toast.error(err.message || 'Retry failed')
    } finally {
      setRetryingLogId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Alert Control Center</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Autonomous Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Meta Cloud WhatsApp alert routing, statutory notice triggers, and audit dispatch ledger
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'preferences'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Preferences &amp; Routing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit &amp; Delivery Logs
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {logs.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PREFERENCES & ROUTING */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Executive Recipient Routing Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.818-.981z" />
                  </svg>
                  Executive WhatsApp Recipient Routing
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designate WhatsApp numbers by functional role so each alert reaches the right decision maker
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* 1. Primary Managing Director Phone */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Managing Director / Proprietor</span>
                  <span className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    Primary
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Receives Bank Guarantee expirations, CPWD Clause 5.2 legal notice deadlines, and executive sweeps.
                </p>
                <div className="space-y-1.5">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={prefs.primary_phone || ''}
                    onChange={e => setPrefs(p => ({ ...p, primary_phone: e.target.value }))}
                    className="text-xs font-mono"
                  />
                  {prefs.primary_phone && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full text-[11px] py-1 h-auto"
                      loading={testingPhone === prefs.primary_phone}
                      onClick={() => handleSendTestMessage(prefs.primary_phone!, 'Managing Director')}
                    >
                      Send Test WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              {/* 2. Billing & Accounts Head Phone */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Accounts &amp; Billing Head</span>
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Finance
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Receives Delayed RA Bill alerts (&gt;30d CPWD 7 / &gt;45d MSMED) and Vendor Credit Limit breaches (&ge;85%).
                </p>
                <div className="space-y-1.5">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={prefs.accounts_phone || ''}
                    onChange={e => setPrefs(p => ({ ...p, accounts_phone: e.target.value }))}
                    className="text-xs font-mono"
                  />
                  {prefs.accounts_phone && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full text-[11px] py-1 h-auto"
                      loading={testingPhone === prefs.accounts_phone}
                      onClick={() => handleSendTestMessage(prefs.accounts_phone!, 'Accounts Head')}
                    >
                      Send Test WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              {/* 3. Site Operations & Fleet Phone */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">3. Site Operations &amp; Fleet In-Charge</span>
                  <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    Field Ops
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Receives 8:00 PM Missing DPR notices, inventory reorder buffer alerts, machinery service/fitness, and Saturday labour wages.
                </p>
                <div className="space-y-1.5">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={prefs.site_phone || ''}
                    onChange={e => setPrefs(p => ({ ...p, site_phone: e.target.value }))}
                    className="text-xs font-mono"
                  />
                  {prefs.site_phone && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full text-[11px] py-1 h-auto"
                      loading={testingPhone === prefs.site_phone}
                      onClick={() => handleSendTestMessage(prefs.site_phone!, 'Site In-Charge')}
                    >
                      Send Test WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Autonomous Domain Switches (8 Domains) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Autonomous Alert Domains &amp; Statutory Triggers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or pause specific alert modules across contract compliance, commercial cash flow, and site operations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Domain 1: Bank Guarantees */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Bank Guarantees, FDRs &amp; CAR Insurance</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-100 text-blue-700">Phase 1</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Triggers autonomous notifications at T-30, T-15, T-7, T-3, T-1, and T-0 days before guarantee expiry to prevent forfeiture.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.bg_fdr_enabled}
                    onChange={e => setPrefs(p => ({ ...p, bg_fdr_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Domain 2: Contractual Notices */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Contractual Notices &amp; Delay Claims</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-100 text-blue-700">Phase 1</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Monitors CPWD GCC Clause 5.2 / FIDIC Sub-Clause 20.1 14/28-day notice windows with urgency alerts at T-5 and T-2 days.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.contractual_notices_enabled}
                    onChange={e => setPrefs(p => ({ ...p, contractual_notices_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Domain 3: RA Bills Delayed Realization */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Delayed RA Bill Realization</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-100 text-emerald-800">Phase 2</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cites CPWD Clause 7 for certification pending &gt;30 days and MSMED Act 2006 for compounding interest liability on &gt;45 days.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.ra_bills_enabled}
                    onChange={e => setPrefs(p => ({ ...p, ra_bills_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Domain 4: Supplier Credit Limits */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Supplier Credit Limit Safeguards</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-100 text-emerald-800">Phase 2</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Triggers warning at &ge;85% utilization and red breach at &ge;100% to prevent vendor supply stoppage on sites.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.supplier_credit_enabled}
                    onChange={e => setPrefs(p => ({ ...p, supplier_credit_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Domain 5: Daily Evening DPR */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Site DPR 8:00 PM Missing Reminder</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-100 text-amber-800">Phase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Scans active project sites at 8:00 PM IST and sends automated reminder if no daily progress report has been submitted.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.dpr_reminders_enabled}
                    onChange={e => setPrefs(p => ({ ...p, dpr_reminders_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Domain 6: Low Stock Reorders */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Critical Material Reorder Level Monitor</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-100 text-amber-800">Phase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Alerts on Cement, 20mm Aggregates, and Diesel buffer breaches before site casting work gets disrupted.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.inventory_reorder_enabled}
                    onChange={e => setPrefs(p => ({ ...p, inventory_reorder_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Domain 7: Fleet & Machinery */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Plant &amp; Machinery 250h/500h &amp; Fitness</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-100 text-amber-800">Phase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Monitors engine running hours for service overhaul intervals and T-15 vehicle fitness/insurance/PUC renewals.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.machinery_fleet_enabled}
                    onChange={e => setPrefs(p => ({ ...p, machinery_fleet_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Domain 8: Labour Wages & BOCW */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Saturday Labour Wage Summary &amp; BOCW Cess</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-100 text-amber-800">Phase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Aggregates weekly muster roll for workers, overtime hours, gross wage liabilities, and statutory 1% BOCW Cess.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.labour_payout_enabled}
                    onChange={e => setPrefs(p => ({ ...p, labour_payout_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Threshold Customization Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customizable Alert Thresholds</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tune days and metric buffers according to your firm&apos;s contractual and working capital policy
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  RA Bill Uncertified Cutoff (Days)
                </label>
                <Input
                  type="number"
                  min="7"
                  max="90"
                  value={prefs.threshold_config?.ra_bill_submission_delay_days ?? 30}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 30
                    setPrefs(p => ({
                      ...p,
                      threshold_config: { ...p.threshold_config, ra_bill_submission_delay_days: val },
                    }))
                  }}
                  className="text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default: 30 days (CPWD Clause 7 standard)</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supplier Credit Utilization Warning (%)
                </label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={prefs.threshold_config?.supplier_credit_threshold_pct ?? 85}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 85
                    setPrefs(p => ({
                      ...p,
                      threshold_config: { ...p.threshold_config, supplier_credit_threshold_pct: val },
                    }))
                  }}
                  className="text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default: 85% of agreed credit limit</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Machinery Engine Service Interval (Hours)
                </label>
                <Input
                  type="number"
                  min="100"
                  max="1000"
                  step="50"
                  value={prefs.threshold_config?.machinery_service_interval_hours ?? 250}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 250
                    setPrefs(p => ({
                      ...p,
                      threshold_config: { ...p.threshold_config, machinery_service_interval_hours: val },
                    }))
                  }}
                  className="text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default: 250 hours (OEM engine standard)</span>
              </div>
            </div>
          </div>

          {/* Direct Verification & Test Console */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Meta WhatsApp Connectivity Test Console
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify real-time delivery to any mobile phone right now to test template formatting and API tokens
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={customTestPhone}
                onChange={e => setCustomTestPhone(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={customTestRole}
                onChange={e => setCustomTestRole(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Managing Director">Role: Managing Director</option>
                <option value="Accounts Head">Role: Accounts Head</option>
                <option value="Site In-Charge">Role: Site In-Charge</option>
                <option value="Audit & Legal">Role: Audit &amp; Legal</option>
              </select>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 text-xs py-2 px-4 rounded-xl"
                loading={testingPhone === customTestPhone && customTestPhone.length > 0}
                onClick={() => handleSendTestMessage(customTestPhone, customTestRole)}
              >
                Dispatch Test Message
              </Button>
            </div>
          </div>

          {/* Sticky Save Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPrefs(initialPreferences)}
              disabled={saving}
            >
              Reset Changes
            </Button>
            <Button
              type="button"
              loading={saving}
              onClick={handleSavePreferences}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Save Alert Preferences
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT & DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <StitchMetric
              label="Total Dispatched"
              value={String(logStats.dispatched)}
              sub="Delivered to WhatsApp"
              tone="emerald"
            />
            <StitchMetric
              label="Delivery Failures"
              value={String(logStats.failed)}
              sub={logStats.failed > 0 ? 'Requires attention / retry' : 'Zero delivery errors'}
              tone={logStats.failed > 0 ? 'rose' : 'default'}
            />
            <StitchMetric
              label="Deduplication Skips"
              value={String(logStats.skipped)}
              sub="Saved from spamming"
              tone="indigo"
            />
            <StitchMetric
              label="Total Scanned"
              value={String(totalLogs)}
              sub="All milestone checks"
              tone="default"
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Search reference, phone, or milestone..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <select
                value={logFilterType}
                onChange={e => setLogFilterType(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="all">All Domains</option>
                <option value="bank_guarantee">Bank Guarantees</option>
                <option value="correspondence">Notices &amp; Claims</option>
                <option value="ra_bill">RA Bills</option>
                <option value="supplier">Supplier Khata</option>
                <option value="dpr">Missing DPR</option>
                <option value="inventory">Store Stock</option>
                <option value="machinery">Machinery Fleet</option>
                <option value="labour_payout">Labour Payout</option>
              </select>

              <select
                value={logFilterStatus}
                onChange={e => setLogFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="dispatched">Dispatched</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={refreshingLogs}
              onClick={handleRefreshLogs}
              className="text-xs px-3 py-1.5 h-auto flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Audit Ledger Table */}
          <StitchTable>
            <table className="w-full text-xs">
              <StitchTableHead>
                <tr>
                  <th className="px-4 py-3 text-left">Entity &amp; Type</th>
                  <th className="px-4 py-3 text-left">Reference / Subject</th>
                  <th className="px-4 py-3 text-left">Milestone</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Recipient</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Dispatched Time</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </StitchTableHead>
              <StitchTableBody>
                {filteredLogs.length === 0 ? (
                  <StitchTableRow>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No alert dispatch logs matching your filter criteria.
                    </td>
                  </StitchTableRow>
                ) : (
                  filteredLogs.map(log => {
                    const isDispatched = log.status === 'dispatched'
                    const isFailed = log.status === 'failed'
                    return (
                      <StitchTableRow key={log.id}>
                        <StitchTableCell>
                          <span className="font-semibold text-slate-800 capitalize block">
                            {log.entity_type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.channel.toUpperCase()}
                          </span>
                        </StitchTableCell>

                        <StitchTableCell>
                          <span className="font-bold text-slate-900 block line-clamp-1">
                            {log.entity_reference || log.entity_id}
                          </span>
                          {log.error_message && (
                            <span className="text-[10px] text-rose-600 block line-clamp-1">
                              {log.error_message}
                            </span>
                          )}
                        </StitchTableCell>

                        <StitchTableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.milestone_key}
                          </span>
                        </StitchTableCell>

                        <StitchTableCell className="hidden sm:table-cell font-mono text-slate-600">
                          {log.recipient_phone || '—'}
                        </StitchTableCell>

                        <StitchTableCell className="hidden md:table-cell text-slate-500">
                          {new Date(log.dispatched_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </StitchTableCell>

                        <StitchTableCell>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isDispatched
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isFailed
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </StitchTableCell>

                        <StitchTableCell align="right">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="text-[11px] py-1 px-2.5 h-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            loading={retryingLogId === log.id}
                            onClick={() => handleRetryDispatch(log.id)}
                            title="Manually re-dispatch this notification to recipient"
                          >
                            Resend
                          </Button>
                        </StitchTableCell>
                      </StitchTableRow>
                    )
                  })
                )}
              </StitchTableBody>
            </table>
          </StitchTable>
        </div>
      )}
    </div>
  )
}
