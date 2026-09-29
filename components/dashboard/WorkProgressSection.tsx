'use client'

import React from 'react'
import Link from 'next/link'
import { formatINR } from '@/lib/format'
import { BOQItemSummary, MeasurementEntrySummary } from './types'

interface WorkProgressProps {
  boqItems: BOQItemSummary[]
  measurements: MeasurementEntrySummary[]
  currentContractValue: number
  billedValue: number
}

export function WorkProgressSection({
  boqItems,
  measurements,
  currentContractValue,
  billedValue,
}: WorkProgressProps) {
  // Executed value from BOQ measured quantities * rate
  const executedValue = boqItems.reduce(
    (sum, b) => sum + ((Number(b.measured_quantity) || 0) * (Number(b.rate) || 0)),
    0
  )

  const physicalProgressPct = currentContractValue > 0
    ? Math.min(100, Math.round((executedValue / currentContractValue) * 100))
    : 0

  const financialProgressPct = currentContractValue > 0
    ? Math.min(100, Math.round((billedValue / currentContractValue) * 100))
    : 0

  // Total BOQ balance = sum of max(0, quantity - measured_quantity) * rate
  const boqBalanceValue = boqItems.reduce((sum, b) => {
    const unmeasuredQty = Math.max(0, (Number(b.quantity) || 0) - (Number(b.measured_quantity) || 0))
    return sum + (unmeasuredQty * (Number(b.rate) || 0))
  }, 0)

  // Unmeasured items count (where measured_quantity is 0)
  const unmeasuredItemsCount = boqItems.filter(b => !b.measured_quantity || Number(b.measured_quantity) <= 0).length

  // Unbilled certified work: e-MB entries certified by department but not yet billed in any RA bill
  const boqRateMap = new Map(boqItems.map(b => [b.id, Number(b.rate) || 0]))

  const unbilledCertifiedEntries = measurements.filter(
    m => m.status === 'CERTIFIED' && !m.billed_in_ra_bill_id
  )

  const unbilledCertifiedValue = unbilledCertifiedEntries.reduce((sum, m) => {
    const rate = boqRateMap.get(m.boq_item_id) || 0
    return sum + ((Number(m.calculated_quantity) || 0) * rate)
  }, 0)

  return (
    <div id="work-progress" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-indigo-600 inline-block" />
            <h2 className="text-base font-bold text-slate-900">2. Work Progress &amp; BOQ Execution</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              e-MB &amp; Schedule A
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Physical site measurement verification vs financial billing realization
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <span className="text-slate-600">Physical: <strong className="text-slate-900">{physicalProgressPct}%</strong></span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-600">Financial: <strong className="text-slate-900">{financialProgressPct}%</strong></span>
          </div>
        </div>
      </div>

      {/* 5 Progress Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Physical Progress */}
        <Link
          href="/measurements"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Physical Progress
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-indigo-900 tabular-nums group-hover:text-indigo-600 transition-colors">
              {physicalProgressPct}%
            </p>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${physicalProgressPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {formatINR(executedValue)} executed
          </span>
        </Link>

        {/* Financial Progress */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Financial Progress
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-emerald-800 tabular-nums group-hover:text-emerald-600 transition-colors">
              {financialProgressPct}%
            </p>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${financialProgressPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {formatINR(billedValue)} billed in RA
          </span>
        </Link>

        {/* BOQ Balance */}
        <Link
          href="/boq"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            BOQ Balance
          </span>
          <p className="text-base font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(boqBalanceValue)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            Remaining tender scope
          </span>
        </Link>

        {/* Unmeasured Work */}
        <Link
          href="/boq"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Unmeasured Scope
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-base font-bold text-slate-900 tabular-nums group-hover:text-amber-600 transition-colors">
              {unmeasuredItemsCount} <span className="text-xs font-normal text-slate-500">items</span>
            </p>
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block truncate font-medium">
            Pending e-MB measurement
          </span>
        </Link>

        {/* Unbilled Certified Work */}
        <Link
          href="/measurements"
          className="group block p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-white hover:border-emerald-500 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block truncate">
              Unbilled Certified
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-base font-bold text-emerald-800 mt-1 tabular-nums group-hover:text-emerald-600 transition-colors truncate">
            {formatINR(unbilledCertifiedValue)}
          </p>
          <span className="text-[10px] text-emerald-700/80 mt-1 block truncate">
            {unbilledCertifiedEntries.length} certified entries ready for RA
          </span>
        </Link>
      </div>
    </div>
  )
}
