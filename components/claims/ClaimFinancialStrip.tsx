'use client'

import { formatINR } from '@/lib/format'
import { ClaimFinancialSummary } from '@/lib/types/claims'

interface Props {
  summary: ClaimFinancialSummary
  projectName?: string
}

export function ClaimFinancialStrip({ summary, projectName }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Contractual Claims &amp; Disputes Realization</span>
            {projectName && (
              <span className="text-xs font-normal text-slate-500">({projectName})</span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            Damages, prolongation overheads, idle resources and dispute quantification.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Pending Recovery / Settlement</span>
          <span className="text-xl font-bold font-mono text-amber-700">
            {formatINR(summary.totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Statutory Advisory Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-950 flex items-start gap-2.5 text-xs">
        <span className="text-base leading-none">ℹ️</span>
        <div className="text-[11px] leading-relaxed">
          <b>Accounting Safeguard:</b> Claims represent contractor assertions under dispute and are <b>not</b> recognized as recoverable revenue until formal determination or award is issued by the Contracting Authority or Arbitral Tribunal.
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Claimed Amount */}
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900 mb-1">
            <span>CLAIMED AMOUNT</span>
            <span className="text-[9px] bg-purple-200 text-purple-900 px-1 py-0.2 rounded font-bold">
              {summary.totalCount} CLAIMS
            </span>
          </div>
          <div className="text-base font-bold font-mono text-purple-900">
            {formatINR(summary.totalClaimed)}
          </div>
          <div className="text-[10px] text-purple-700 mt-1">Quantified contractor assertions</div>
        </div>

        {/* 2. Approved Amount */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900 mb-1">
            <span>APPROVED AMOUNT</span>
            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-bold">
              {summary.approvedCount} SANCTIONED
            </span>
          </div>
          <div className="text-base font-bold font-mono text-emerald-900">
            {formatINR(summary.totalApproved)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">Sanctioned by Authority / DRB</div>
        </div>

        {/* 3. Paid Amount */}
        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900 mb-1">
            <span>PAID AMOUNT</span>
            <span className="text-[9px] bg-teal-200 text-teal-900 px-1 py-0.2 rounded font-bold">
              {summary.paidCount} DISBURSED
            </span>
          </div>
          <div className="text-base font-bold font-mono text-teal-900">
            {formatINR(summary.totalPaid)}
          </div>
          <div className="text-[10px] text-teal-700 mt-1">Realized payments cleared</div>
        </div>

        {/* 4. Outstanding Amount */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 mb-1">
            <span>OUTSTANDING</span>
          </div>
          <div className="text-base font-bold font-mono text-amber-900">
            {formatINR(summary.totalOutstanding)}
          </div>
          <div className="text-[10px] text-amber-700 mt-1">Pending determination / release</div>
        </div>
      </div>
    </div>
  )
}
