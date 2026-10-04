'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuditLogEntry, formatAuditAction, fetchEntityAuditLogs } from '@/lib/audit'
import { formatRoleLabel } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'

interface RecordActivityTimelineProps {
  entityType: string
  entityId: string
  title?: string
  subtitle?: string
  initialLogs?: AuditLogEntry[]
  onCountChange?: (count: number) => void
  compact?: boolean
}

export function RecordActivityTimeline({
  entityType,
  entityId,
  title,
  subtitle,
  initialLogs,
  onCountChange,
  compact = false,
}: RecordActivityTimelineProps) {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs ?? [])
  const [loading, setLoading] = useState<boolean>(!initialLogs)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const records = await fetchEntityAuditLogs(supabase, entityType, entityId)
      setLogs(records)
      onCountChange?.(records.length)
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit history.')
    } finally {
      setLoading(false)
    }
  }, [supabase, entityType, entityId, onCountChange])

  useEffect(() => {
    if (!initialLogs) {
      void loadLogs()
    } else {
      setLogs(initialLogs)
      onCountChange?.(initialLogs.length)
    }
  }, [initialLogs, loadLogs, onCountChange])

  const formatDiffValue = (val: any, fieldKey?: string): React.ReactNode => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic">None</span>
    }
    if (typeof val === 'number') {
      if (
        fieldKey?.toLowerCase().includes('amount') ||
        fieldKey?.toLowerCase().includes('balance') ||
        fieldKey?.toLowerCase().includes('paid') ||
        fieldKey?.toLowerCase().includes('received')
      ) {
        return <span className="font-mono font-bold">{formatINR(val)}</span>
      }
      return <span className="font-mono font-semibold">{val.toLocaleString()}</span>
    }
    if (typeof val === 'string') {
      // Check for ISO Date
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        return <span className="font-medium text-slate-800">{formatDate(val)}</span>
      }
      return <span className="text-slate-800 break-words">{val}</span>
    }
    if (typeof val === 'boolean') {
      return <span className="font-mono">{val ? 'Yes' : 'No'}</span>
    }
    return <span className="font-mono text-xs">{JSON.stringify(val)}</span>
  }

  const formatFieldLabel = (rawKey: string): string => {
    return rawKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/Id\b/, 'ID')
  }

  return (
    <div className="space-y-4 text-left">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-slate-900 rounded-full inline-block" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {title || 'Activity History & Provenance Trail'}
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle || 'Cryptographically sealed audit records for this item (who changed what, when).'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors disabled:opacity-50"
          title="Refresh audit history"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-400' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && !logs.length && (
        <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
          <span>Loading immutable audit records...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !logs.length && (
        <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-slate-700">No Historical Modifications Logged</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            This record has not been amended or re-certified since registration. All subsequent edits and payment updates will be permanently tracked here.
          </p>
        </div>
      )}

      {/* Timeline View */}
      {logs.length > 0 && (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {logs.map((log) => {
            const actionStyle = formatAuditAction(log.action)
            const isExpanded = expandedId === log.id
            const diffEntries = Object.entries(log.diff_summary || {})
            const hasDetailedDiff = diffEntries.length > 0

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                    actionStyle.badgeVariant === 'success'
                      ? 'bg-emerald-500 ring-2 ring-emerald-100'
                      : actionStyle.badgeVariant === 'danger'
                      ? 'bg-rose-500 ring-2 ring-rose-100'
                      : actionStyle.badgeVariant === 'warning'
                      ? 'bg-amber-500 ring-2 ring-amber-100'
                      : actionStyle.badgeVariant === 'info'
                      ? 'bg-sky-500 ring-2 ring-sky-100'
                      : 'bg-slate-500 ring-2 ring-slate-100'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2.5">
                  {/* Top Bar: Action Badge + Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        label={actionStyle.label}
                        variant={actionStyle.badgeVariant}
                        className="text-[11px] font-bold"
                      />
                      {log.entity_identifier && (
                        <span className="text-xs font-semibold text-slate-800 font-mono">
                          {log.entity_identifier}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1 tabular-nums">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  </div>

                  {/* Actor Strip */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex-wrap">
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                      </svg>
                      {log.user_name || 'Staff Member'}
                    </span>
                    {log.user_role && (
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-800">
                        {formatRoleLabel(log.user_role)}
                      </span>
                    )}
                    {log.user_email && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({log.user_email})
                      </span>
                    )}
                  </div>

                  {/* Notes / Reason */}
                  {log.notes && (
                    <p className="text-xs text-slate-600 italic pl-1 border-l-2 border-indigo-200">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}

                  {/* Key Diff Inspection Box */}
                  {hasDetailedDiff && (
                    <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/70 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Field Modification Details:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {diffEntries.map(([key, val]) => {
                          const isBeforeAfter =
                            typeof val === 'object' &&
                            val !== null &&
                            ('from' in val || 'to' in val || 'old' in val || 'new' in val)

                          if (isBeforeAfter) {
                            const fromVal = (val as any).from ?? (val as any).old
                            const toVal = (val as any).to ?? (val as any).new

                            return (
                              <div
                                key={key}
                                className="bg-white p-2 rounded border border-slate-100 flex flex-col justify-between"
                              >
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  {formatFieldLabel(key)}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs">
                                  <span className="line-through text-slate-400">
                                    {formatDiffValue(fromVal, key)}
                                  </span>
                                  <span className="text-slate-400">&rarr;</span>
                                  <span className="text-emerald-700 font-semibold">
                                    {formatDiffValue(toVal, key)}
                                  </span>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={key}
                              className="bg-white p-2 rounded border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {formatFieldLabel(key)}
                              </span>
                              <span className="text-slate-800 font-semibold">
                                {formatDiffValue(val, key)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expand Raw JSON Toggle for Enterprise Auditors */}
                  {!compact && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 underline font-mono"
                      >
                        {isExpanded ? 'Hide Raw Audit JSON' : 'Inspect Raw JSON Details'}
                      </button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto space-y-2 mt-2">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Previous Snapshot:</div>
                      <pre className="text-emerald-400">{JSON.stringify(log.previous_values, null, 2)}</pre>
                      <div className="text-slate-400 text-[10px] uppercase font-bold mt-2">New Snapshot:</div>
                      <pre className="text-cyan-400">{JSON.stringify(log.new_values, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
