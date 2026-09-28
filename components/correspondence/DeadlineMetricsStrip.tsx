'use client'

import { DeadlineUrgency } from '@/lib/types/correspondence'

interface DeadlineMetricsStripProps {
  metrics: {
    totalRecords: number
    incomingCount: number
    outgoingCount: number
    siteInstructionCount: number
    noticeCount: number
    overdueCount: number
    dueTodayCount: number
    dueWithin7DaysCount: number
    upcomingCount: number
    totalActionable: number
    resolvedCount: number
  }
  selectedUrgency?: 'ALL' | DeadlineUrgency
  onSelectUrgency?: (urgency: 'ALL' | DeadlineUrgency) => void
}

export function DeadlineMetricsStrip({
  metrics,
  selectedUrgency = 'ALL',
  onSelectUrgency,
}: DeadlineMetricsStripProps) {
  const { overdueCount, dueTodayCount, dueWithin7DaysCount, upcomingCount, totalActionable } = metrics

  return (
    <div className="space-y-3">
      {/* 4 Deadline Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* 1. OVERDUE */}
        <button
          type="button"
          onClick={() => onSelectUrgency?.(selectedUrgency === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedUrgency === 'OVERDUE'
              ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500'
              : overdueCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Overdue Deadlines
            </span>
            {overdueCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {overdueCount}
            </span>
            <span className="text-[11px] font-semibold text-rose-800/80">Pending Action</span>
          </div>
          <p className="mt-1.5 text-[10px] text-rose-800/80">
            {overdueCount > 0 ? 'Immediate response or reminder required' : 'No overdue response deadlines'}
          </p>
        </button>

        {/* 2. DUE TODAY */}
        <button
          type="button"
          onClick={() => onSelectUrgency?.(selectedUrgency === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedUrgency === 'DUE_TODAY'
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500'
              : dueTodayCount > 0
              ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/80'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Due Today
            </span>
            {dueTodayCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${dueTodayCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {dueTodayCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-800/80">Statutory Limit</span>
          </div>
          <p className="mt-1.5 text-[10px] text-amber-800/80">
            {dueTodayCount > 0 ? 'Action window expires before 23:59' : 'No deadlines expiring today'}
          </p>
        </button>

        {/* 3. DUE WITHIN 7 DAYS */}
        <button
          type="button"
          onClick={() => onSelectUrgency?.(selectedUrgency === 'DUE_7_DAYS' ? 'ALL' : 'DUE_7_DAYS')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedUrgency === 'DUE_7_DAYS'
              ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-500'
              : dueWithin7DaysCount > 0
              ? 'bg-orange-50/60 border-orange-200 hover:bg-orange-100/60'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-900">
              Due Within 7 Days
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${dueWithin7DaysCount > 0 ? 'text-orange-700' : 'text-slate-900'}`}>
              {dueWithin7DaysCount}
            </span>
            <span className="text-[11px] font-semibold text-orange-800/80">This Week</span>
          </div>
          <p className="mt-1.5 text-[10px] text-orange-800/80">
            Prepare draft responses &amp; notice dispatches
          </p>
        </button>

        {/* 4. UPCOMING */}
        <button
          type="button"
          onClick={() => onSelectUrgency?.(selectedUrgency === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedUrgency === 'UPCOMING'
              ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Upcoming Deadlines
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{upcomingCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">&gt; 7 Days Ahead</span>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            {totalActionable} total actionable response clocks active
          </p>
        </button>
      </div>

      {/* Filter notice banner if filter active */}
      {selectedUrgency !== 'ALL' && (
        <div className="bg-slate-100 px-3.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Filtering list by: <b>{selectedUrgency.replace(/_/g, ' ')}</b></span>
          <button
            onClick={() => onSelectUrgency?.('ALL')}
            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
          >
            Show All &times;
          </button>
        </div>
      )}
    </div>
  )
}
