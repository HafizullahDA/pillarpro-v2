'use client'

import { formatINR } from '@/lib/format'
import { VariationContractSummary } from '@/lib/types/variations'

interface Props {
  summary: VariationContractSummary
  projectName?: string
}

export function ContractValueBreakdownCard({ summary, projectName }: Props) {
  const netApprovedDelta =
    summary.approvedVariations + summary.approvedExtraItems - summary.deletedWork
  const netDeltaPercent =
    summary.originalContractValue > 0
      ? ((netApprovedDelta / summary.originalContractValue) * 100).toFixed(2)
      : '0.00'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Official Contract Value &amp; Variation Reconciliation</span>
            {projectName && (
              <span className="text-xs font-normal text-slate-500">({projectName})</span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            Reconciles approved modifications under Clause 12. Proposed variations are strictly segregated.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Current Sanctioned Value</span>
          <span className="text-xl font-bold font-mono text-blue-700">
            {formatINR(summary.currentContractValue)}
          </span>
        </div>
      </div>

      {/* Statutory Formula Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
        <div className="font-semibold text-slate-700 mb-1 text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span>Statutory Reconciliation Formula</span>
          <span className="text-slate-500 font-normal">
            Net Variation: {Number(netDeltaPercent) >= 0 ? '+' : ''}
            {netDeltaPercent}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-slate-800">
          <div className="bg-white px-2.5 py-1 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Original Agreement</span>
            <span className="font-bold text-slate-900">{formatINR(summary.originalContractValue)}</span>
          </div>
          <span className="text-slate-400 font-bold text-sm">+</span>
          <div className="bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
            <span className="text-[10px] text-indigo-700 block">Approved Variations</span>
            <span className="font-bold text-indigo-900">{formatINR(summary.approvedVariations)}</span>
          </div>
          <span className="text-slate-400 font-bold text-sm">+</span>
          <div className="bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block">Approved Extra Items</span>
            <span className="font-bold text-emerald-900">{formatINR(summary.approvedExtraItems)}</span>
          </div>
          <span className="text-slate-400 font-bold text-sm">-</span>
          <div className="bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
            <span className="text-[10px] text-rose-700 block">Deleted Work</span>
            <span className="font-bold text-rose-900">{formatINR(summary.deletedWork)}</span>
          </div>
          <span className="text-slate-400 font-bold text-sm">=</span>
          <div className="bg-blue-50 px-2.5 py-1 rounded border border-blue-300">
            <span className="text-[10px] text-blue-700 block font-sans font-semibold">Current Value</span>
            <span className="font-bold text-blue-900">{formatINR(summary.currentContractValue)}</span>
          </div>
        </div>
      </div>

      {/* The 6 Contracting Stages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Original */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span>1. ORIGINAL</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {formatINR(summary.originalContractValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tender schedule sum</div>
        </div>

        {/* 2. Proposed (Tentative / Unapproved) */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 mb-1">
            <span>2. PROPOSED</span>
            <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">
              UNAPPROVED
            </span>
          </div>
          <div className="text-sm font-bold font-mono text-amber-900">
            {formatINR(summary.proposedVariations)}
          </div>
          <div className="text-[10px] text-amber-700 mt-1">
            Excluded from current value
          </div>
        </div>

        {/* 3. Approved */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900 mb-1">
            <span>3. APPROVED</span>
            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-bold">
              SANCTIONED
            </span>
          </div>
          <div className="text-sm font-bold font-mono text-emerald-900">
            {formatINR(summary.approvedVariations + summary.approvedExtraItems)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">
            {summary.approvedCount} orders sanctioned
          </div>
        </div>

        {/* 4. Executed */}
        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900 mb-1">
            <span>4. EXECUTED</span>
          </div>
          <div className="text-sm font-bold font-mono text-teal-900">
            {formatINR(summary.executedValue)}
          </div>
          <div className="text-[10px] text-teal-700 mt-1">Measured on site (e-MB)</div>
        </div>

        {/* 5. Billed */}
        <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-900 mb-1">
            <span>5. BILLED</span>
          </div>
          <div className="text-sm font-bold font-mono text-cyan-900">
            {formatINR(summary.billedValue)}
          </div>
          <div className="text-[10px] text-cyan-700 mt-1">Claimed in RA Bills</div>
        </div>

        {/* 6. Paid */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-900 mb-1">
            <span>6. PAID</span>
          </div>
          <div className="text-sm font-bold font-mono text-blue-900">
            {formatINR(summary.paidValue)}
          </div>
          <div className="text-[10px] text-blue-700 mt-1">Disbursed by dept</div>
        </div>
      </div>
    </div>
  )
}
