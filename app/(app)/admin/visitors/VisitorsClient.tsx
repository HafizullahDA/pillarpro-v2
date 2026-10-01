'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PageViewItem {
  path: string
  at?: string
  timestamp?: string
  added_seconds?: number
  is_heartbeat?: boolean
}

interface VisitorSession {
  id: string
  session_id: string
  visitor_id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  organization_name: string | null
  ip_address: string | null
  city: string | null
  country: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  referrer: string | null
  entry_path: string
  last_path: string
  pages_viewed: PageViewItem[] | null
  duration_seconds: number
  pageview_count: number
  started_at: string
  last_heartbeat_at: string
}

interface VisitorsClientProps {
  currentUserEmail: string
  initialSessions: VisitorSession[]
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Just arrived'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const remSecs = seconds % 60
  if (mins < 60) return `${mins}m ${remSecs}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Active now'
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return 'Just now'
  const diffMs = Date.now() - time
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'Just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function isSessionActive(lastHeartbeat: string | null | undefined): boolean {
  if (!lastHeartbeat) return false
  const time = new Date(lastHeartbeat).getTime()
  if (isNaN(time)) return false
  const diffMs = Date.now() - time
  return diffMs < 120000 // Active within last 2 minutes
}

export function VisitorsClient({
  currentUserEmail,
  initialSessions,
}: VisitorsClientProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<VisitorSession[]>(initialSessions)
  const [tab, setTab] = useState<'all' | 'contractors' | 'guests'>('all')
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync state whenever props update
  useEffect(() => {
    setSessions(initialSessions)
  }, [initialSessions])

  // Periodic polling every 30 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [router])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = sessions.length
    const now = Date.now()
    const last24hCount = sessions.filter(
      s => now - new Date(s.started_at).getTime() < 86400000
    ).length
    const activeNow = sessions.filter(s => isSessionActive(s.last_heartbeat_at)).length
    const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0
    const identifiedCount = sessions.filter(s => !!s.user_email).length
    const guestCount = total - identifiedCount

    return {
      total,
      last24hCount,
      activeNow,
      avgDuration,
      identifiedCount,
      guestCount,
    }
  }, [sessions])

  // Filtered Sessions
  const displayedSessions = useMemo(() => {
    return sessions.filter(s => {
      if (tab === 'contractors' && !s.user_email) return false
      if (tab === 'guests' && s.user_email) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchEmail = s.user_email?.toLowerCase().includes(q)
        const matchName = s.user_name?.toLowerCase().includes(q)
        const matchOrg = s.organization_name?.toLowerCase().includes(q)
        const matchCity = s.city?.toLowerCase().includes(q)
        const matchPath = s.last_path?.toLowerCase().includes(q) || s.entry_path?.toLowerCase().includes(q)
        const matchVisitorId = s.visitor_id.toLowerCase().includes(q)

        return matchEmail || matchName || matchOrg || matchCity || matchPath || matchVisitorId
      }

      return true
    })
  }, [sessions, tab, search])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Visitor Telemetry &amp; Stay Duration
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Platform Owner Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of visitors across all devices, landing pages, pricing, and active duration of stay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-xs"
          >
            <svg className={`w-3.5 h-3.5 text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── METRIC TILES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Visits Logged</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{metrics.total}</p>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">+{metrics.last24hCount}</span> in last 24 hours
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active On Site Now</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{metrics.activeNow}</p>
            {metrics.activeNow > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Heartbeat in last 2 mins</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Average Stay Duration</p>
          <p className="text-2xl font-extrabold text-blue-700 tabular-nums">{formatDuration(metrics.avgDuration)}</p>
          <p className="text-xs text-slate-500">Active engagement time</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Visitor Breakdown</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-slate-900">{metrics.identifiedCount} <span className="text-xs font-normal text-slate-500">Contractors</span></p>
            <span className="text-slate-300">•</span>
            <p className="text-xl font-bold text-slate-900">{metrics.guestCount} <span className="text-xs font-normal text-slate-500">Guests</span></p>
          </div>
          <p className="text-xs text-slate-500">Across web &amp; mobile PWA</p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Visitors ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setTab('contractors')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === 'contractors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contractors ({metrics.identifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('guests')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === 'guests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anonymous Guests ({metrics.guestCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
            placeholder="Search email, city, firm, or path..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── VISITOR SESSIONS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Visitor / Identity</th>
                <th className="py-3 px-4">Time Stayed</th>
                <th className="py-3 px-4">Location &amp; Device</th>
                <th className="py-3 px-4">Source &amp; Entry</th>
                <th className="py-3 px-4">Pages Viewed</th>
                <th className="py-3 px-4 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No visitor sessions recorded yet. Visitors arriving at pillarprojk.com will appear here automatically.
                  </td>
                </tr>
              ) : (
                displayedSessions.map(session => {
                  const active = isSessionActive(session.last_heartbeat_at)
                  const isContractor = !!session.user_email
                  const pages = Array.isArray(session.pages_viewed) ? session.pages_viewed : []

                  return (
                    <tr
                      key={session.session_id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                    >
                      <td className="py-3.5 px-4">
                        {isContractor ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {(session.user_name || session.user_email || 'U').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                {session.user_name || session.user_email?.split('@')[0]}
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                                  Contractor
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500">{session.user_email}</p>
                              {session.organization_name && (
                                <p className="text-[10px] text-slate-400 font-medium">{session.organization_name}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0">
                              G
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                Guest #{session.visitor_id.slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {session.ip_address ? `IP: ${session.ip_address.slice(0, 10)}...` : 'Web Visitor'}
                              </p>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {active && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active on site right now"></span>
                          )}
                          <span
                            className={`font-bold tabular-nums px-2 py-0.5 rounded-lg text-xs ${
                              session.duration_seconds >= 60
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : session.duration_seconds >= 15
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {formatDuration(session.duration_seconds)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {session.pageview_count} pageview{session.pageview_count > 1 ? 's' : ''}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">
                          {session.city ? `${session.city}, ${session.country || ''}` : (session.country || 'Unknown location')}
                        </p>
                        <p className="text-[11px] text-slate-500 capitalize">
                          {session.device_type} • {session.browser || 'Browser'} ({session.os || 'OS'})
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {session.referrer ? session.referrer.slice(0, 30) : 'Direct Navigation'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Started: {session.entry_path}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {pages.slice(0, 3).map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {p.path}
                            </span>
                          ))}
                          {pages.length > 3 && (
                            <span className="text-[10px] text-blue-600 font-semibold px-1">
                              +{pages.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <p className="font-medium text-slate-900">{formatTimeAgo(session.started_at)}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(session.started_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SESSION DETAIL MODAL ── */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Visitor Session Journey Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Session ID:</span>
                  <span className="font-mono text-slate-800">{selectedSession.session_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Total Duration Stayed:</span>
                  <span className="font-bold text-emerald-700">{formatDuration(selectedSession.duration_seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Device &amp; Browser:</span>
                  <span className="text-slate-800">{selectedSession.device_type} • {selectedSession.browser} ({selectedSession.os})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Location:</span>
                  <span className="text-slate-800">{selectedSession.city || 'Unknown'}, {selectedSession.country || ''}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider">
                  Page Navigation Trail:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(selectedSession.pages_viewed || []).map((pv: any, idx) => {
                    const timeVal = pv.at || pv.timestamp
                    const hasValidDate = timeVal && !isNaN(new Date(timeVal).getTime())
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[11px]"
                      >
                        <span className="text-blue-700 font-semibold">{pv.path || '/'}</span>
                        <span className="text-slate-500 text-[10px]">
                          {hasValidDate ? new Date(timeVal).toLocaleTimeString('en-IN') : 'Live'}
                          {pv.added_seconds ? ` (+${pv.added_seconds}s)` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
