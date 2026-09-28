import {
  ContractEvent,
  DetailedHindrance,
  TimelineNode,
  ContractDefenseStatus,
  EVENT_CATEGORY_CONFIG,
  ContractEventCategory,
} from '../types/contractDefense'

export function calculateEventDelayDays(startDate: string, endDate?: string | null): number {
  if (!startDate) return 0
  const start = new Date(startDate).getTime()
  const end = endDate ? new Date(endDate).getTime() : new Date().getTime()
  if (isNaN(start) || isNaN(end) || end < start) return 0
  const diffDays = (end - start) / (1000 * 60 * 60 * 24)
  return Number((diffDays + 1).toFixed(1))
}

export function buildContractTimeline(
  events: ContractEvent[],
  hindrances: DetailedHindrance[] = []
): TimelineNode[] {
  const nodes: TimelineNode[] = []

  // 1. Map Contract Events
  for (const ev of events) {
    const catConfig = EVENT_CATEGORY_CONFIG[ev.event_type as ContractEventCategory]
    const label = catConfig?.label || ev.event_type || 'Event'

    nodes.push({
      id: `event-${ev.id}`,
      date: ev.event_date || ev.start_date,
      type: 'event',
      title: `${ev.event_number}: ${label}`,
      subtitle: ev.location ? `Location: ${ev.location}` : undefined,
      description: ev.description,
      category: ev.event_type,
      categoryLabel: label,
      responsibleParty: ev.responsible_party || 'Department / Employer',
      location: ev.location || undefined,
      durationDays: ev.actual_delay_days || ev.estimated_delay_days || calculateEventDelayDays(ev.start_date, ev.end_date),
      status: ev.status,
      financialImpact: ev.financial_impact || 0,
      isCritical: ev.eot_relevance || ev.claim_relevance,
      sourceId: ev.id,
    })
  }

  // 2. Map Hindrances that aren't already represented by an event
  const existingHindranceIds = new Set(events.map(e => e.hindrance_id).filter(Boolean))

  for (const h of hindrances) {
    if (existingHindranceIds.has(h.id)) continue

    const catKey = (h.category as ContractEventCategory) || 'other'
    const label = EVENT_CATEGORY_CONFIG[catKey]?.label || h.category || 'Hindrance'
    const status: ContractDefenseStatus =
      h.standard_status ||
      (h.status === 'active'
        ? 'OPEN'
        : h.status === 'acknowledged_by_dept'
        ? 'UNDER_REVIEW'
        : h.status === 'resolved'
        ? 'RESOLVED'
        : h.status === 'disputed'
        ? 'DISPUTED'
        : 'CLOSED')

    nodes.push({
      id: `hindrance-${h.id}`,
      date: h.start_date,
      type: 'hindrance',
      title: `Hindrance #${h.hindrance_number}: ${label}`,
      subtitle: h.location_chainage ? `Location: ${h.location_chainage}` : undefined,
      description: h.description,
      category: h.category,
      categoryLabel: label,
      responsibleParty: h.delay_type === 'compensable' ? 'Department / Employer' : 'Force Majeure',
      location: h.location_chainage || undefined,
      durationDays: Number(h.net_delay_days) || calculateEventDelayDays(h.start_date, h.end_date),
      status,
      isCritical: h.notice_served,
      sourceId: h.id,
    })
  }

  // Sort chronologically (earliest to latest)
  return nodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateDefenseMetrics(events: ContractEvent[], hindrances: DetailedHindrance[]) {
  const openEvents = events.filter(e => e.status === 'OPEN' || e.status === 'UNDER_REVIEW').length
  const totalFinancialExposure = events.reduce((sum, e) => sum + (Number(e.financial_impact) || 0), 0)
  const totalEOTRelevantDays = events
    .filter(e => e.eot_relevance)
    .reduce((sum, e) => sum + (Number(e.actual_delay_days) || Number(e.estimated_delay_days) || 0), 0)

  const openHindrances = hindrances.filter(h => h.status === 'active' || h.standard_status === 'OPEN').length

  return {
    totalEvents: events.length,
    openEvents,
    totalHindrances: hindrances.length,
    openHindrances,
    totalFinancialExposure,
    totalEOTRelevantDays: Number(totalEOTRelevantDays.toFixed(1)),
  }
}
