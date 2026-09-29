'use client'

import React from 'react'
import Link from 'next/link'
import {
  InventoryItemSummary,
  MachineryAssetSummary,
  MeasurementEntrySummary,
  ContractEventSummary,
  HindranceSummary,
  WagePaymentSummary,
} from './types'

interface OperationalRiskProps {
  inventoryItems: InventoryItemSummary[]
  machineryAssets: MachineryAssetSummary[]
  measurements: MeasurementEntrySummary[]
  events: ContractEventSummary[]
  hindrances: HindranceSummary[]
  wagePayments: WagePaymentSummary[]
}

export function OperationalRiskSection({
  inventoryItems,
  machineryAssets,
  measurements,
  events,
  hindrances,
  wagePayments,
}: OperationalRiskProps) {
  // 1. Low Material Stock Alerts
  const lowStockItems = inventoryItems.filter(
    item => (Number(item.minimum_stock_alert) > 0 && Number(item.current_stock) <= Number(item.minimum_stock_alert)) ||
            Number(item.current_stock) <= 0
  )

  // 2. Machinery Idle / Breakdown
  const idleMachinery = machineryAssets.filter(
    m => m.status === 'idle' || m.status === 'breakdown'
  )
  const breakdownCount = machineryAssets.filter(m => m.status === 'breakdown').length
  const idleCount = machineryAssets.filter(m => m.status === 'idle').length

  // 3. Labour Shortage / Unpaid Muster Risk
  const unpaidWorkersCount = new Set(
    wagePayments.filter(w => w.status === 'unpaid' || w.status === 'partial').map(w => w.worker_id)
  ).size

  // 4. Delayed Work Fronts
  const delayedEvents = events.filter(
    e => (['OPEN', 'UNDER_REVIEW', 'DISPUTED'].includes(e.status)) &&
         ((Number(e.estimated_delay_days) || 0) > 0 || (Number(e.actual_delay_days) || 0) > 0)
  )
  const delayedHindrances = hindrances.filter(
    h => (h.status === 'active' || h.status === 'disputed' || !h.end_date) &&
         ((Number(h.net_delay_days) || 0) > 0)
  )
  const delayedFrontsCount = delayedEvents.length + delayedHindrances.length

  // 5. Measurements Pending Certification
  const uncertifiedMeasurements = measurements.filter(
    m => ['DRAFT', 'SUBMITTED', 'CHECKED'].includes(m.status)
  )

  return (
    <div id="operational-risk" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-orange-500 inline-block" />
            <h2 className="text-base font-bold text-slate-900">5. Operational Risk &amp; Site Bottlenecks</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              Site Execution Health
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Material buffer alerts, idle plant &amp; machinery, labour liabilities, delayed work stretches, and uncertified measurements
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {lowStockItems.length > 0 || idleMachinery.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-semibold border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              {lowStockItems.length + idleMachinery.length} Site Attention Item{lowStockItems.length + idleMachinery.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Site Operations Smooth
            </span>
          )}
        </div>
      </div>

      {/* 5 Risk Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Low Material Stock */}
        <Link
          href="/inventory"
          className={`group block p-3.5 rounded-xl border transition-all ${lowStockItems.length > 0 ? 'border-orange-300 bg-orange-50/50 hover:bg-white hover:border-orange-500 hover:shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${lowStockItems.length > 0 ? 'text-orange-800' : 'text-slate-500'}`}>
              Low Stock Alerts
            </span>
            {lowStockItems.length > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            )}
          </div>
          <p className={`text-xl font-black mt-1 tabular-nums ${lowStockItems.length > 0 ? 'text-orange-900 group-hover:text-orange-600' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>
            {lowStockItems.length} <span className="text-xs font-normal text-slate-500">items</span>
          </p>
          <span className={`text-[10px] mt-0.5 block truncate ${lowStockItems.length > 0 ? 'text-orange-700 font-medium' : 'text-slate-400'}`}>
            {lowStockItems.length > 0 ? 'Below safety threshold' : 'All stores healthy'}
          </span>
        </Link>

        {/* Machinery Idle / Breakdown */}
        <Link
          href="/machinery"
          className={`group block p-3.5 rounded-xl border transition-all ${idleMachinery.length > 0 ? 'border-amber-300 bg-amber-50/50 hover:bg-white hover:border-amber-500 hover:shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400'}`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${idleMachinery.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
            Machinery Idle
          </span>
          <p className={`text-xl font-black mt-1 tabular-nums ${idleMachinery.length > 0 ? 'text-amber-900 group-hover:text-amber-600' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>
            {idleMachinery.length} <span className="text-xs font-normal text-slate-500">assets</span>
          </p>
          <span className={`text-[10px] mt-0.5 block truncate ${idleMachinery.length > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
            {breakdownCount > 0 ? `${breakdownCount} breakdown, ${idleCount} idle` : idleCount > 0 ? `${idleCount} idle on site` : 'All plant active'}
          </span>
        </Link>

        {/* Labour Shortage / Wage Muster Watch */}
        <Link
          href="/labour"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Labour Watch
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors">
            {unpaidWorkersCount} <span className="text-xs font-normal text-slate-500">pending</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {unpaidWorkersCount > 0 ? 'Workers with unpaid dues' : 'Muster rolls cleared'}
          </span>
        </Link>

        {/* Delayed Work Fronts */}
        <Link
          href="/hindrances"
          className={`group block p-3.5 rounded-xl border transition-all ${delayedFrontsCount > 0 ? 'border-amber-300 bg-amber-50/50 hover:bg-white hover:border-amber-500 hover:shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400'}`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${delayedFrontsCount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
            Delayed Fronts
          </span>
          <p className={`text-xl font-black mt-1 tabular-nums ${delayedFrontsCount > 0 ? 'text-amber-900 group-hover:text-amber-600' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>
            {delayedFrontsCount} <span className="text-xs font-normal text-slate-500">stretches</span>
          </p>
          <span className={`text-[10px] mt-0.5 block truncate ${delayedFrontsCount > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
            Site fronts with active delay
          </span>
        </Link>

        {/* Measurement Pending Certification */}
        <Link
          href="/measurements"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Pending Certification
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums group-hover:text-indigo-600 transition-colors">
            {uncertifiedMeasurements.length} <span className="text-xs font-normal text-slate-500">e-MB</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Draft / Submitted / Checked
          </span>
        </Link>
      </div>
    </div>
  )
}
