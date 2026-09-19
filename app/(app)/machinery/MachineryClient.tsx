'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { NewAssetDrawer } from '@/components/machinery/NewAssetDrawer'
import { LogDieselDrawer } from '@/components/machinery/LogDieselDrawer'
import { canManageMachinery } from '@/lib/permissions'

export interface MachineryAsset {
  id: string
  asset_name: string
  asset_type: string
  registration_number: string | null
  model_year: string | null
  ownership: 'owned' | 'hired'
  meter_tracking: 'hours' | 'km'
  hourly_rate: number
  current_meter: number
  status: string
  notes: string | null
  project_id: string | null
  projects?: { name: string } | null
}

export interface MachineryLog {
  id: string
  asset_id: string
  project_id: string | null
  log_date: string
  operator_name: string | null
  start_meter: number
  end_meter: number
  total_run: number
  work_description: string | null
  diesel_liters: number
  diesel_rate_per_liter: number
  diesel_cost: number
  fuel_vendor: string | null
  machinery_assets?: {
    asset_name: string
    registration_number: string | null
    meter_tracking: string
  } | null
  projects?: { name: string } | null
}

interface MachineryClientProps {
  initialAssets: MachineryAsset[]
  initialLogs: MachineryLog[]
  projects: { id: string; name: string }[]
  userRole: string
}

export function MachineryClient({
  initialAssets,
  initialLogs,
  projects,
  userRole,
}: MachineryClientProps) {
  const [activeTab, setActiveTab] = useState<'logbook' | 'assets' | 'analytics'>('logbook')
  const [newAssetOpen, setNewAssetOpen] = useState(false)
  const [logDieselOpen, setLogDieselOpen] = useState(false)
  const [selectedAssetForLog, setSelectedAssetForLog] = useState<string | undefined>()

  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterAsset, setFilterAsset] = useState<string>('all')

  const canManage = canManageMachinery(userRole)

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalDieselLiters = 0
    let totalDieselCost = 0
    let totalHoursRun = 0
    let totalKmRun = 0

    initialLogs.forEach(log => {
      totalDieselLiters += Number(log.diesel_liters) || 0
      totalDieselCost += Number(log.diesel_cost) || 0
      const tracking = log.machinery_assets?.meter_tracking || 'hours'
      if (tracking === 'km') {
        totalKmRun += Number(log.total_run) || 0
      } else {
        totalHoursRun += Number(log.total_run) || 0
      }
    })

    const activeAssetsCount = initialAssets.filter(a => a.status === 'active').length
    const hiredAssetsCount = initialAssets.filter(a => a.ownership === 'hired').length

    return {
      totalDieselLiters,
      totalDieselCost,
      totalHoursRun,
      totalKmRun,
      activeAssetsCount,
      hiredAssetsCount,
    }
  }, [initialAssets, initialLogs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      if (filterProject !== 'all' && log.project_id !== filterProject) return false
      if (filterAsset !== 'all' && log.asset_id !== filterAsset) return false
      return true
    })
  }, [initialLogs, filterProject, filterAsset])

  const openLogForSpecificAsset = (assetId: string) => {
    setSelectedAssetForLog(assetId)
    setLogDieselOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Machinery & Diesel Logbook</h1>
            <Badge label="Fleet OS" variant="info" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track daily machine operational hours, equipment rental costs, and diesel fuel dispense.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewAssetOpen(true)}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Asset
            </Button>
            <Button
              size="sm"
              disabled={initialAssets.length === 0}
              onClick={() => {
                setSelectedAssetForLog(undefined)
                setLogDieselOpen(true)
              }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Log Hours & Diesel
            </Button>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Fleet</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.activeAssetsCount}</span>
            <span className="text-xs text-slate-500">machines ({metrics.hiredAssetsCount} hired)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Machine Hours</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{metrics.totalHoursRun.toFixed(1)}</span>
            <span className="text-xs text-slate-500">hrs logged</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diesel Consumed</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.totalDieselLiters.toLocaleString('en-IN')}</span>
            <span className="text-xs text-slate-500">Liters</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fuel Expense</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatINR(metrics.totalDieselCost)}</span>
          </div>
        </div>
      </div>

      {/* Module Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('logbook')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'logbook'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Logbook ({initialLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fleet Register ({initialAssets.length})
        </button>
      </div>

      {/* Tab Content: Daily Logbook */}
      {activeTab === 'logbook' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Sites</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterAsset}
                onChange={e => setFilterAsset(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Machines / Vehicles</option>
                {initialAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.asset_name}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLogs.length} entries
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              title="No Machinery or Diesel Logs Found"
              description="Record daily operator hours and fuel issued to track machine efficiency."
              action={
                canManage && initialAssets.length > 0 ? (
                  <Button size="sm" onClick={() => setLogDieselOpen(true)}>
                    Log Daily Run Now
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Machine / Vehicle</th>
                      <th className="py-3 px-4">Site / Project</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4 text-right">Start Meter</th>
                      <th className="py-3 px-4 text-right">End Meter</th>
                      <th className="py-3 px-4 text-right">Run (Hrs/Km)</th>
                      <th className="py-3 px-4 text-right">Diesel (L)</th>
                      <th className="py-3 px-4 text-right">Fuel Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLogs.map(log => {
                      const unit = log.machinery_assets?.meter_tracking === 'km' ? 'km' : 'hrs'
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {formatDate(log.log_date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">
                              {log.machinery_assets?.asset_name || 'Machine'}
                            </span>
                            {log.machinery_assets?.registration_number && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {log.machinery_assets.registration_number}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {log.projects?.name || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {log.operator_name || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {log.start_meter}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {log.end_meter}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-blue-600">
                            {log.total_run} {unit}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-amber-600">
                            {log.diesel_liters > 0 ? `${log.diesel_liters} L` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {log.diesel_cost > 0 ? formatINR(log.diesel_cost) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Fleet Register */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {initialAssets.length === 0 ? (
            <EmptyState
              title="No Fleet Equipment Registered"
              description="Add company-owned or hired JCBs, tippers, rollers, and generators."
              action={
                canManage ? (
                  <Button size="sm" onClick={() => setNewAssetOpen(true)}>
                    Add First Asset
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialAssets.map(asset => (
                <div
                  key={asset.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{asset.asset_name}</h3>
                        <p className="text-xs text-slate-500 capitalize">{asset.asset_type.replace('_', ' ')}</p>
                      </div>
                      <Badge
                        label={asset.ownership === 'owned' ? 'Owned' : 'Hired'}
                        variant={asset.ownership === 'owned' ? 'success' : 'warning'}
                      />
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      {asset.registration_number && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Reg No:</span>
                          <span className="font-mono font-semibold">{asset.registration_number}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Current Reading:</span>
                        <span className="font-semibold text-blue-600 font-mono">
                          {asset.current_meter} {asset.meter_tracking === 'km' ? 'Km' : 'Hours'}
                        </span>
                      </div>

                      {asset.ownership === 'hired' && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Hire Rate:</span>
                          <span className="font-semibold text-slate-800">{formatINR(asset.hourly_rate)} / hr</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Assigned Site:</span>
                        <span className="truncate max-w-[150px]">{asset.projects?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openLogForSpecificAsset(asset.id)}
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Log Reading
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      <NewAssetDrawer
        open={newAssetOpen}
        onClose={() => setNewAssetOpen(false)}
        projects={projects}
      />

      <LogDieselDrawer
        open={logDieselOpen}
        onClose={() => setLogDieselOpen(false)}
        assets={initialAssets.map(a => ({
          id: a.id,
          asset_name: a.asset_name,
          asset_type: a.asset_type,
          registration_number: a.registration_number,
          current_meter: a.current_meter,
          meter_tracking: a.meter_tracking,
        }))}
        projects={projects}
        preselectedAssetId={selectedAssetForLog}
      />
    </div>
  )
}
