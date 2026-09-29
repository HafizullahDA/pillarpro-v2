'use client'

import React, { useState } from 'react'
import { AuditLogEntry, formatAuditAction } from '@/lib/audit'
import { formatRoleLabel } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'

interface ProjectItem {
  id: string
  name: string
}

interface AuditTrailClientProps {
  initialLogs: AuditLogEntry[]
  projects: ProjectItem[]
  currentUserRole: string
}

export function AuditTrailClient({
  initialLogs,
  projects,
  currentUserRole,
}: AuditTrailClientProps) {
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Filter logs
  const filteredLogs = initialLogs.filter(log => {
    if (selectedAction !== 'all' && log.action !== selectedAction) {
      return false
    }
    if (selectedProject !== 'all' && log.project_id !== selectedProject) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchIdentifier = (log.entity_identifier ?? '').toLowerCase().includes(q)
      const matchEmail = (log.user_email ?? '').toLowerCase().includes(q)
      const matchName = (log.user_name ?? '').toLowerCase().includes(q)
      const matchNotes = (log.notes ?? '').toLowerCase().includes(q)
      const matchAction = log.action.toLowerCase().includes(q)
      if (!matchIdentifier && !matchEmail && !matchName && !matchNotes && !matchAction) {
        return false
      }
    }
    return true
  })

  // Summary counts
  const countCertifications = initialLogs.filter(l => l.action === 'MEASUREMENT_CERTIFIED').length
  const countBOQVariations = initialLogs.filter(l => ['BOQ_QUANTITY_CHANGED', 'VARIATION_APPROVED'].includes(l.action)).length
  const countFinancial = initialLogs.filter(l => ['PAYMENT_RECORDED', 'RA_BILL_SUBMITTED'].includes(l.action)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-slate-900 inline-block" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Enterprise RBAC &amp; Immutable Audit Trail
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-3.5">
            Cryptographically sealed and database-trigger protected audit history for all high-stakes construction records
          </p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-700">Your Session Role:</span>
          <Badge label={formatRoleLabel(currentUserRole)} variant="info" />
        </div>
      </div>

      {/* Immutable Protection Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs border border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Tamper-Proof Audit Guarantee
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                Non-Destructive
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Every certified measurement, BOQ alteration, variation order, RA bill dispatch, and payment voucher is recorded in an immutable ledger. Database triggers strictly prohibit DELETE or UPDATE operations, ensuring full compliance with CPWD, PWD, and arbitration standards.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Total Audit Events
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {initialLogs.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Active tracking across all sites
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
            e-MB Certifications
          </span>
          <p className="text-2xl font-black text-emerald-800 mt-1 tabular-nums">
            {countCertifications}
          </p>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block truncate">
            Engineer signed measurements
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
            BOQ &amp; Variations
          </span>
          <p className="text-2xl font-black text-blue-900 mt-1 tabular-nums">
            {countBOQVariations}
          </p>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
            Scope changes &amp; approved VOs
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs bg-indigo-50/20">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block">
            RA Bills &amp; Payments
          </span>
          <p className="text-2xl font-black text-indigo-900 mt-1 tabular-nums">
            {countFinancial}
          </p>
          <span className="text-[10px] text-indigo-600/80 mt-0.5 block truncate">
            Bill dispatches &amp; treasury credits
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Actions ({initialLogs.length})</option>
            <option value="MEASUREMENT_CERTIFIED">Measurement Certified</option>
            <option value="MEASUREMENT_CORRECTED">Measurement Corrected</option>
            <option value="BOQ_QUANTITY_CHANGED">BOQ Quantity Changed</option>
            <option value="VARIATION_APPROVED">Variation Approved</option>
            <option value="RA_BILL_SUBMITTED">RA Bill Submitted</option>
            <option value="PAYMENT_RECORDED">Payment Recorded</option>
            <option value="CLAIM_SUBMITTED">Claim Submitted</option>
            <option value="CONTRACT_DATE_CHANGED">Contract Date/Value Changed</option>
          </select>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by record, user, note..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Audit Ledger ({filteredLogs.length} entries)
          </h3>
          <span className="text-xs text-slate-400">
            Chronological Order (Latest First)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-700">No audit records match your current filter</p>
            <p className="text-xs text-slate-400 mt-1">
              Actions will automatically record whenever measurements are certified, BOQs revised, or RA bills submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Record / Target</th>
                  <th className="text-left px-4 py-3 font-semibold">User / Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Diff Summary</th>
                  <th className="text-right px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const actionMeta = formatAuditAction(log.action)
                  const isExpanded = expandedLogId === log.id
                  const diffEntries = Object.entries(log.diff_summary ?? {})

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{formatDate(log.created_at)}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge label={actionMeta.label} variant={actionMeta.badgeVariant} />
                        </td>

                        {/* Record / Target */}
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-slate-900">
                            {log.entity_identifier || `${log.entity_type} (#${log.entity_id.slice(0, 8)})`}
                          </p>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                            {log.entity_type.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* User / Role */}
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-slate-800">{log.user_name || 'System'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                              {log.user_email || 'automated'}
                            </span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                              {log.user_role || 'staff'}
                            </span>
                          </div>
                        </td>

                        {/* Diff Summary */}
                        <td className="px-4 py-3 text-xs">
                          {diffEntries.length === 0 ? (
                            <span className="text-slate-400 text-xs italic">No scalar diff</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {diffEntries.slice(0, 2).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono truncate"
                                  title={`${key}: ${JSON.stringify(val)}`}
                                >
                                  {key}: {typeof val === 'object' && val !== null ? `${(val as any).from ?? ''} -> ${(val as any).to ?? ''}` : String(val)}
                                </span>
                              ))}
                              {diffEntries.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{diffEntries.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Details Toggle */}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Diff Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="px-6 py-4 space-y-3">
                            {log.notes && (
                              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                                <strong>Context:</strong> {log.notes}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Previous Value */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                                  Previous Value
                                </span>
                                <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg overflow-x-auto max-h-48">
                                  {Object.keys(log.previous_values ?? {}).length > 0
                                    ? JSON.stringify(log.previous_values, null, 2)
                                    : 'None (Initial Entry)'}
                                </pre>
                              </div>

                              {/* New Value */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                                  New Value
                                </span>
                                <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg overflow-x-auto max-h-48">
                                  {Object.keys(log.new_values ?? {}).length > 0
                                    ? JSON.stringify(log.new_values, null, 2)
                                    : 'Record Removed'}
                                </pre>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                              <span>Entity ID: <code className="font-mono text-slate-600">{log.entity_id}</code></span>
                              <span>Log ID: <code className="font-mono text-slate-600">{log.id}</code></span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
