'use client'

import { ClauseStatus } from '@/lib/types/contractClauses'

interface ClauseStatusBadgeProps {
  status: ClauseStatus
  isAiExtracted?: boolean
  sourcePageRef?: string | null
  showSafetyNotice?: boolean
}

export function ClauseStatusBadge({
  status,
  isAiExtracted,
  sourcePageRef,
  showSafetyNotice = true,
}: ClauseStatusBadgeProps) {
  if (status === 'APPROVED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Verified &amp; Approved</span>
        <span className="text-[10px] text-emerald-600 font-normal border-l border-emerald-200 pl-1.5">
          Drives Deadlines
        </span>
      </div>
    )
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span>Under Review</span>
      </div>
    )
  }

  if (status === 'REJECTED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 line-through">
        <span>Rejected</span>
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col gap-0.5">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Draft / Unverified</span>
        {isAiExtracted && (
          <span className="text-[10px] bg-amber-200/70 text-amber-950 px-1.5 py-0.2 rounded font-mono">
            AI Extracted
          </span>
        )}
      </div>

      {showSafetyNotice && isAiExtracted && (
        <span className="text-[10px] text-amber-800 font-medium italic">
          AI extracted — verify against original contract.
          {sourcePageRef && ` (${sourcePageRef})`}
        </span>
      )}
    </div>
  )
}
