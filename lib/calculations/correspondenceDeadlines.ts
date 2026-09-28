import {
  CorrespondenceRecord,
  DeadlineCalculation,
  DeadlineUrgency,
} from '../types/correspondence'
import {
  CorrespondenceDirection,
  CorrespondenceCategory,
  CorrespondenceStatus,
} from '../types/correspondence'

/**
 * Transparent calculation of notice deadline from event date + contract notice period.
 * Formula: Event date + Contract-defined notice period = Notice deadline
 */
export function calculateNoticeDeadline(
  eventDate: string,
  noticePeriodDays: number,
  asOfDateStr?: string
): DeadlineCalculation {
  if (!eventDate || isNaN(new Date(eventDate).getTime())) {
    return {
      eventDate: '',
      noticePeriodDays: noticePeriodDays || 0,
      calculatedDeadline: '',
      daysRemaining: 0,
      urgency: 'UPCOMING',
      urgencyLabel: 'No event date set',
      formulaExplanation: 'Event date required to calculate notice deadline.',
    }
  }

  const start = new Date(eventDate)
  const deadlineDate = new Date(start.getTime() + (Number(noticePeriodDays) || 0) * 24 * 60 * 60 * 1000)
  const calculatedDeadline = deadlineDate.toISOString().split('T')[0]

  const today = asOfDateStr ? new Date(asOfDateStr) : new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffMs = deadlineDate.getTime() - today.getTime()
  const daysRemaining = Math.round(diffMs / (24 * 60 * 60 * 1000))

  let urgency: DeadlineUrgency = 'UPCOMING'
  let urgencyLabel = `Due in ${daysRemaining} days`

  if (daysRemaining < 0) {
    urgency = 'OVERDUE'
    urgencyLabel = `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
  } else if (daysRemaining === 0) {
    urgency = 'DUE_TODAY'
    urgencyLabel = 'Due Today!'
  } else if (daysRemaining <= 7) {
    urgency = 'DUE_7_DAYS'
    urgencyLabel = `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
  }

  const formulaExplanation = `Event Date (${eventDate}) + ${noticePeriodDays} Days Notice Period = Calculated Deadline (${calculatedDeadline})`

  return {
    eventDate,
    noticePeriodDays,
    calculatedDeadline,
    daysRemaining,
    urgency,
    urgencyLabel,
    formulaExplanation,
  }
}

/**
 * Computes urgency status for any correspondence response deadline.
 */
export function getDeadlineUrgency(
  deadlineDateStr?: string | null,
  status?: CorrespondenceStatus | string,
  asOfDateStr?: string
): { urgency: DeadlineUrgency; daysRemaining: number; label: string } {
  if (status === 'RESPONDED' || status === 'CLOSED' || status === 'ACKNOWLEDGED') {
    return { urgency: 'RESOLVED', daysRemaining: 0, label: 'Responded / Concluded' }
  }

  if (!deadlineDateStr) {
    return { urgency: 'UPCOMING', daysRemaining: 999, label: 'No deadline set' }
  }

  const deadline = new Date(deadlineDateStr)
  const today = asOfDateStr ? new Date(asOfDateStr) : new Date()
  deadline.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffMs = deadline.getTime() - today.getTime()
  const daysRemaining = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (daysRemaining < 0) {
    return {
      urgency: 'OVERDUE',
      daysRemaining,
      label: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`,
    }
  }

  if (daysRemaining === 0) {
    return { urgency: 'DUE_TODAY', daysRemaining, label: 'Action Due Today!' }
  }

  if (daysRemaining <= 7) {
    return {
      urgency: 'DUE_7_DAYS',
      daysRemaining,
      label: `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    }
  }

  return {
    urgency: 'UPCOMING',
    daysRemaining,
    label: `Due in ${daysRemaining} days`,
  }
}

/**
 * Aggregates dashboard metrics for response deadlines.
 */
export function aggregateDeadlineMetrics(
  records: any[],
  asOfDateStr?: string
) {
  let overdueCount = 0
  let dueTodayCount = 0
  let dueWithin7DaysCount = 0
  let upcomingCount = 0
  let resolvedCount = 0
  let incomingCount = 0
  let outgoingCount = 0
  let siteInstructionCount = 0
  let noticeCount = 0

  for (const r of records) {
    if (r.direction === 'INCOMING') incomingCount++
    if (r.direction === 'OUTGOING') outgoingCount++
    if (r.category === 'SITE_INSTRUCTION') siteInstructionCount++
    if (r.category === 'NOTICE') noticeCount++

    if (r.status === 'RESPONDED' || r.status === 'CLOSED') {
      resolvedCount++
      continue
    }

    if (r.response_required && r.response_deadline) {
      const { urgency } = getDeadlineUrgency(r.response_deadline, r.status, asOfDateStr)
      if (urgency === 'OVERDUE') overdueCount++
      else if (urgency === 'DUE_TODAY') dueTodayCount++
      else if (urgency === 'DUE_7_DAYS') dueWithin7DaysCount++
      else if (urgency === 'UPCOMING') upcomingCount++
    }
  }

  return {
    totalRecords: records.length,
    incomingCount,
    outgoingCount,
    siteInstructionCount,
    noticeCount,
    overdueCount,
    dueTodayCount,
    dueWithin7DaysCount,
    upcomingCount,
    totalActionable: overdueCount + dueTodayCount + dueWithin7DaysCount + upcomingCount,
    resolvedCount,
  }
}

/**
 * Filters correspondence records based on direction, category, project, status, and urgency.
 */
export function filterCorrespondenceRecords(
  records: any[],
  filters: {
    search?: string
    direction?: 'ALL' | 'INCOMING' | 'OUTGOING'
    category?: 'ALL' | CorrespondenceCategory
    status?: 'ALL' | CorrespondenceStatus
    projectId?: string
    contractId?: string
    urgency?: 'ALL' | DeadlineUrgency
    asOfDateStr?: string
  }
): any[] {
  return records.filter(r => {
    // Direction
    if (filters.direction && filters.direction !== 'ALL' && r.direction !== filters.direction) {
      return false
    }

    // Category
    if (filters.category && filters.category !== 'ALL' && r.category !== filters.category) {
      return false
    }

    // Status
    if (filters.status && filters.status !== 'ALL' && r.status !== filters.status) {
      return false
    }

    // Project
    if (filters.projectId && filters.projectId !== 'all' && r.project_id !== filters.projectId) {
      return false
    }

    // Contract
    if (filters.contractId && filters.contractId !== 'all' && r.contract_id !== filters.contractId) {
      return false
    }

    // Urgency
    if (filters.urgency && filters.urgency !== 'ALL') {
      const { urgency } = getDeadlineUrgency(r.response_deadline, r.status, filters.asOfDateStr)
      if (urgency !== filters.urgency) return false
    }

    // Text search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      const matchSubject = r.subject.toLowerCase().includes(q)
      const matchLetter = r.letter_number.toLowerCase().includes(q)
      const matchRef = r.reference_number.toLowerCase().includes(q)
      const matchSender = r.sender.toLowerCase().includes(q)
      const matchRecipient = r.recipient.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q) || false
      if (!matchSubject && !matchLetter && !matchRef && !matchSender && !matchRecipient && !matchDesc) {
        return false
      }
    }

    return true
  })
}
