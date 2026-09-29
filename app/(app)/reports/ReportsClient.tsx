'use client'

import React, { useState, useTransition } from 'react'
import {
  ReportKey,
  ReportResult,
  ReportCategory,
  REPORT_REGISTRY,
  ReportDefinition,
} from '@/lib/reports/types'
import { generateReportCsv, formatReportCurrency, formatReportNumber } from '@/lib/reports/reportGenerators'
import { triggerCsvDownload } from '@/lib/export/csv'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRoleLabel } from '@/lib/permissions'

interface ProjectOption {
  id: string
  name: string
  agency_name: string
}

interface ReportsClientProps {
  initialReport: ReportResult
  projects: ProjectOption[]
  currentUser: {
    displayName: string
    email: string
    role: string
  }
}

const CATEGORY_TABS: { key: 'all' | ReportCategory; label: string; count: number }[] = [
  { key: 'all', label: 'All 24 Reports', count: 24 },
  { key: 'measurement', label: 'Engineering & Measurements', count: 4 },
  { key: 'billing', label: 'Billing & Treasury Ledger', count: 3 },
  { key: 'defense', label: 'Contract Defense & Claims', count: 9 },
  { key: 'operations', label: 'Site Operations & Resources', count: 4 },
  { key: 'financial', label: 'Statutory & Financials', count: 4 },
]

export function ReportsClient({
  initialReport,
  projects,
  currentUser,
}: ReportsClientProps) {
  const [activeReportKey, setActiveReportKey] = useState<ReportKey>(initialReport.reportKey)
  const [selectedCategory, setSelectedCategory] = useState<'all' | ReportCategory>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [report, setReport] = useState<ReportResult>(initialReport)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filter report catalog by selected category
  const filteredReports = Object.values(REPORT_REGISTRY).filter((r: ReportDefinition) => {
    if (selectedCategory === 'all') return true
    return r.category === selectedCategory
  })

  // Fetch report data on change
  const loadReport = (keyToLoad: ReportKey = activeReportKey) => {
    startTransition(async () => {
      try {
        setErrorMsg(null)
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportKey: keyToLoad,
            projectId: selectedProject !== 'all' ? selectedProject : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Failed to load report data')
        }

        setReport(json.report)
      } catch (err: any) {
        console.error('Report fetch error:', err)
        setErrorMsg(err.message || 'Error loading report')
      }
    })
  }

  const handleSelectReport = (key: ReportKey) => {
    setActiveReportKey(key)
    setSelectedStatus('ALL')
    loadReport(key)
  }

  const handleExportCsv = () => {
    const csv = generateReportCsv(report)
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${report.reportKey.toLowerCase()}_${timestamp}.csv`
    triggerCsvDownload(csv, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  const getStatusBadgeVariant = (val: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const v = String(val).toUpperCase()
    if (['CERTIFIED', 'APPROVED', 'PASSED', 'FULLY_PAID', 'RELEASED', 'SERVED', 'ON TRACK', 'ADEQUATE', 'PRESENT'].includes(v)) {
      return 'success'
    }
    if (['SUBMITTED', 'UNDER_REVIEW', 'UNDER_APPROVAL', 'PARTIALLY_PAID', 'RESPONSE_REQUIRED', 'WITHHELD', 'HALF_DAY'].includes(v)) {
      return 'warning'
    }
    if (['REJECTED', 'OVERDUE', 'EXPIRED', 'FORFEITED', 'ABSENT', 'LOW STOCK', 'CLAUSE 12 EXCEEDED (>25%)'].includes(v)) {
      return 'danger'
    }
    if (['DRAFT', 'PROPOSED', 'OPEN', 'SENT', 'RECEIVED'].includes(v)) {
      return 'info'
    }
    return 'default'
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & AUDIT METADATA */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-blue-600 inline-block" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Professional Construction Reporting Engine
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              24 Standard Reports
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-3.5">
            Audit-compliant registers, e-MB extracts, contractual dispute records, and commercial profitability statements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 mr-1.5">User:</span>
            {currentUser.displayName} (<span className="text-blue-600 font-bold">{formatRoleLabel(currentUser.role)}</span>)
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. CATEGORY TABS & REPORT SELECTOR DRAWER */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 print:hidden">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          {CATEGORY_TABS.map(tab => {
            const isActive = selectedCategory === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredReports.map((r: ReportDefinition) => {
            const isSelected = activeReportKey === r.key
            return (
              <button
                key={r.key}
                onClick={() => handleSelectReport(r.key)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    #{r.number}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold truncate max-w-[80px]">
                    {r.orientation}
                  </span>
                </div>
                <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                  {r.shortTitle}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. FILTER CONTROLS & EXPORT ACTIONS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Project Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="all">All Active Projects ({projects.length})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Start */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>

          {/* Date Filter End */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              {(report.availableStatuses || ['ALL']).map(st => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Apply Button */}
          <div className="pt-4">
            <button
              onClick={() => loadReport()}
              disabled={isPending}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? 'Generating...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={report.rows.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium print:hidden">
          {errorMsg}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. OFFICIAL REPORT DOCUMENT (PRINTABLE CONTAINER) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        id="printable-report"
        className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                PillarPro Construction ERP — Standard Indian Works Form
              </p>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5 uppercase">
                {report.reportTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl font-medium">
                {REPORT_REGISTRY[report.reportKey]?.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white mb-1">
                Form No: PP-{REPORT_REGISTRY[report.reportKey]?.number?.toString().padStart(2, '0')}
              </span>
              <p className="text-[11px] text-slate-500 font-semibold">
                Generated: {report.metadata.generatedAt}
              </p>
            </div>
          </div>

          {/* Project & Contract Identification Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Project Name</p>
              <p className="font-bold text-slate-900 truncate">{report.metadata.projectName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Contract / Agreement</p>
              <p className="font-bold text-slate-900 truncate">{report.metadata.agreementNumber || 'General Project Scope'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Employing Agency</p>
              <p className="font-bold text-slate-900 truncate">{report.metadata.employerName || report.metadata.agencyName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Reporting Period</p>
              <p className="font-bold text-blue-800 truncate">{report.metadata.reportingPeriod}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
            <span>
              <strong>Division:</strong> {report.metadata.division}
            </span>
            <span>
              <strong>Recorded By:</strong> {report.metadata.generatedByName} ({report.metadata.generatedByRole})
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {report.rows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p className="font-bold text-slate-700 text-sm mb-1">No Records Found</p>
              <p>There are no entries recorded for this report under the selected project and date filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  {report.columns.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`px-3 py-2.5 border-r border-slate-300 uppercase tracking-wider text-[10px] ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {report.columns.map(col => {
                      const val = row[col.key]
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2 border-r border-slate-200 text-slate-800 ${
                            col.align === 'right'
                              ? 'text-right font-mono'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.format === 'currency' ? (
                            <span className="font-semibold text-slate-900">{formatReportCurrency(Number(val))}</span>
                          ) : col.format === 'number' ? (
                            <span>{formatReportNumber(Number(val))}</span>
                          ) : col.format === 'percent' ? (
                            <span className="font-bold text-slate-700">{Number(val).toFixed(2)}%</span>
                          ) : col.format === 'date' ? (
                            <span className="text-slate-600">{val ? formatDate(String(val)) : '-'}</span>
                          ) : col.format === 'badge' ? (
                            <Badge label={String(val)} variant={getStatusBadgeVariant(String(val))} />
                          ) : (
                            <span>{val !== null && val !== undefined ? String(val) : '-'}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>

              {/* Totals Row */}
              {report.totals && Object.keys(report.totals).length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900">
                    {report.columns.map((col, idx) => {
                      if (idx === 0) {
                        return (
                          <td key={col.key} className="px-3 py-2.5 border-r border-slate-800 text-[11px] uppercase tracking-wider">
                            Grand Total ({report.recordCount} Items)
                          </td>
                        )
                      }
                      const totVal = report.totals?.[col.key]
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 border-r border-slate-800 text-[11px] ${
                            col.align === 'right' ? 'text-right font-mono' : 'text-left'
                          }`}
                        >
                          {totVal !== undefined && totVal !== null ? (
                            col.format === 'currency' ? (
                              formatReportCurrency(Number(totVal))
                            ) : col.format === 'number' ? (
                              formatReportNumber(Number(totVal))
                            ) : col.format === 'percent' ? (
                              `${Number(totVal).toFixed(2)}%`
                            ) : (
                              String(totVal)
                            )
                          ) : (
                            ''
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 5. ATTESTATION & SIGN-OFF BLOCK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t-2 border-slate-900 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            {/* Prepared By */}
            <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between h-32 bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prepared By</p>
                <p className="font-bold text-slate-900 mt-0.5">{report.metadata.preparedByTitle}</p>
              </div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Signature</span>
                <span>Date: ____________</span>
              </div>
            </div>

            {/* Checked By */}
            <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between h-32 bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Checked &amp; Verified By</p>
                <p className="font-bold text-slate-900 mt-0.5">{report.metadata.checkedByTitle}</p>
              </div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Signature</span>
                <span>Date: ____________</span>
              </div>
            </div>

            {/* Approved By */}
            <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between h-32 bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved &amp; Certified By</p>
                <p className="font-bold text-slate-900 mt-0.5">{report.metadata.approvedByTitle}</p>
              </div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Seal / Signature</span>
                <span>Date: ____________</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center italic">
            This document is generated by PillarPro Construction ERP under standard Indian civil engineering works specifications.
            It reflects contemporary records and audit logs maintained at the project site office.
          </p>
        </div>
      </div>
    </div>
  )
}
