'use client'

import { getDeadlineUrgency } from '@/lib/calculations/correspondenceDeadlines'
import { CorrespondenceStatus } from '@/lib/types/correspondence'

interface DeadlineBadgeProps {
  deadlineDate?: string | null
  status?: CorrespondenceStatus | string
  eventDate?: string | null
  noticePeriodDays?: number | null
  size?: 'sm' | 'md'
}

export function DeadlineBadge({
  deadlineDate,
  status,
  eventDate,
  noticePeriodDays,
  size = 'md',
}: DeadlineBadgeProps) {
  if (status === 'RESPONDED' || status === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span>✓</span>
        <span>Concluded</span>
      </span>
    )
  }

  if (!deadlineDate) {
    return <span className="text-[10px] text-slate-400 italic">No deadline</span>
  }

  const { urgency, label } = getDeadlineUrgency(deadlineDate, status)

  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'
  let dotColor = 'bg-blue-500'

  if (urgency === 'OVERDUE') {
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300'
    dotColor = 'bg-rose-500 animate-pulse'
  } else if (urgency === 'DUE_TODAY') {
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-black'
    dotColor = 'bg-amber-600 animate-ping'
  } else if (urgency === 'DUE_7_DAYS') {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
    dotColor = 'bg-amber-500'
  }

  const tooltipText = eventDate && noticePeriodDays
    ? `Event Date (${eventDate}) + ${noticePeriodDays}d Notice Period = Deadline (${deadlineDate})`
    : `Response Deadline: ${deadlineDate}`

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-mono tracking-tight transition-all ${badgeColor} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-semibold'
      }`}
      title={tooltipText}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
    </span>
  )
}
