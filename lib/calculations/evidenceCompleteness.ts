import {
  EvidenceRecord,
  EvidenceType,
  EvidenceCompletenessItem,
  EvidenceCompletenessSummary,
} from '../types/evidence'
import { ContractEventCategory } from '../types/contractDefense'

interface ChecklistTemplateItem {
  id: string
  label: string
  types: EvidenceType[]
  keywords?: string[]
}

const DEFAULT_EVENT_CHECKLISTS: Record<string, ChecklistTemplateItem[]> = {
  drawing_delay: [
    { id: 'dept_letter', label: 'Department letter / Drawing schedule', types: ['LETTER', 'DOCUMENT', 'PDF'], keywords: ['letter', 'schedule', 'drawing', 'dept'] },
    { id: 'contractor_reminder', label: 'Contractor reminder / Demand letter', types: ['LETTER', 'EMAIL', 'DOCUMENT'], keywords: ['reminder', 'request', 'demand', 'letter'] },
    { id: 'site_photo', label: 'Site photograph of stalled section', types: ['PHOTO', 'VIDEO'], keywords: ['photo', 'site', 'work'] },
    { id: 'daily_report', label: 'Daily progress report / Site record', types: ['DOCUMENT', 'SCAN', 'SITE_ORDER'], keywords: ['dpr', 'report', 'log', 'daily'] },
    { id: 'measurement', label: 'Measurement cross-reference / BOQ impact', types: ['MEASUREMENT', 'PDF', 'DOCUMENT'], keywords: ['measurement', 'boq', 'quantity', 'mb'] },
    { id: 'engineer_ack', label: 'Engineer acknowledgement / Site Order Book', types: ['SITE_ORDER', 'LETTER', 'EMAIL', 'SCAN'], keywords: ['ack', 'order', 'book', 'received', 'signed'] },
  ],
  site_not_handed_over: [
    { id: 'joint_inspection', label: 'Joint site inspection / Demarcation report', types: ['DOCUMENT', 'PDF', 'MEASUREMENT'], keywords: ['joint', 'inspection', 'demarcation', 'survey'] },
    { id: 'contractor_notice', label: 'Contractor site possession demand / Letter', types: ['LETTER', 'EMAIL', 'DOCUMENT'], keywords: ['possession', 'handover', 'notice', 'letter'] },
    { id: 'site_photo', label: 'Site photographs showing obstacles / ROW gap', types: ['PHOTO', 'VIDEO'], keywords: ['photo', 'obstacle', 'encroachment', 'site'] },
    { id: 'hindrance_log', label: 'Hindrance Register entry (Appendix 21)', types: ['DOCUMENT', 'SITE_ORDER', 'SCAN'], keywords: ['hindrance', 'register', 'appendix'] },
    { id: 'dept_comm', label: 'Department minutes / Communication', types: ['LETTER', 'DOCUMENT', 'PDF'], keywords: ['minutes', 'communication', 'dept'] },
    { id: 'clause5_notice', label: 'Clause 5 Statutory Notice letter', types: ['LETTER', 'PDF'], keywords: ['clause 5', 'notice', 'statutory', 'eot'] },
  ],
  utility_shifting: [
    { id: 'utility_survey', label: 'Joint utility survey report', types: ['DOCUMENT', 'DRAWING', 'PDF'], keywords: ['survey', 'utility', 'pole', 'pipe', 'cable'] },
    { id: 'agency_comm', label: 'Communication to utility authority (Power/Water)', types: ['LETTER', 'EMAIL', 'DOCUMENT'], keywords: ['authority', 'board', 'power', 'water', 'letter'] },
    { id: 'site_photo', label: 'Site photographs showing utility impediment', types: ['PHOTO', 'VIDEO'], keywords: ['photo', 'pole', 'line', 'pipe'] },
    { id: 'department_intimation', label: 'Department intimation / Joint memo', types: ['LETTER', 'SITE_ORDER', 'DOCUMENT'], keywords: ['memo', 'intimation', 'dept'] },
    { id: 'contractor_reminder', label: 'Contractor reminder on critical path impact', types: ['LETTER', 'EMAIL'], keywords: ['reminder', 'impact', 'delay'] },
    { id: 'resumption_proof', label: 'Utility shifting completion / Resumption memo', types: ['DOCUMENT', 'PHOTO', 'SITE_ORDER'], keywords: ['resumption', 'shifted', 'cleared', 'completed'] },
  ],
  rain_weather: [
    { id: 'met_report', label: 'IMD / Meteorological rainfall report', types: ['PDF', 'DOCUMENT'], keywords: ['rainfall', 'weather', 'rain', 'imd', 'met'] },
    { id: 'site_rain_gauge', label: 'Site rain gauge register / Daily weather log', types: ['DOCUMENT', 'SCAN'], keywords: ['gauge', 'log', 'weather', 'daily'] },
    { id: 'waterlogged_photos', label: 'Site photographs of inundated / submerged works', types: ['PHOTO', 'VIDEO'], keywords: ['inundated', 'water', 'flooding', 'rain', 'photo'] },
    { id: 'site_order_stoppage', label: 'Site Order Book stoppage entry', types: ['SITE_ORDER', 'SCAN'], keywords: ['order', 'stoppage', 'suspended', 'book'] },
    { id: 'clause5_notice', label: 'Clause 5 notice within 14-day statutory limit', types: ['LETTER', 'PDF'], keywords: ['clause 5', 'notice', 'letter'] },
  ],
  design_change: [
    { id: 'written_instruction', label: 'Written variation / Design alteration instruction', types: ['LETTER', 'SITE_ORDER', 'DOCUMENT'], keywords: ['instruction', 'variation', 'change', 'order'] },
    { id: 'revised_drawing', label: 'Revised Good For Construction (GFC) drawing', types: ['DRAWING', 'PDF'], keywords: ['drawing', 'gfc', 'revision', 'rev'] },
    { id: 'boq_statement', label: 'BOQ deviation comparison statement', types: ['DOCUMENT', 'MEASUREMENT', 'PDF'], keywords: ['boq', 'deviation', 'statement'] },
    { id: 'initial_levels', label: 'Pre-construction level sheet / Initial measurement', types: ['MEASUREMENT', 'PDF', 'SCAN'], keywords: ['level', 'measurement', 'sheet', 'initial'] },
    { id: 'rate_acceptance', label: 'Contractor reservation / Rate analysis letter', types: ['LETTER', 'DOCUMENT'], keywords: ['rate', 'analysis', 'reservation', 'letter'] },
  ],
  default_generic: [
    { id: 'primary_notice', label: 'Primary communication / Official notice', types: ['LETTER', 'EMAIL', 'DOCUMENT'], keywords: ['notice', 'letter', 'memo'] },
    { id: 'site_photo', label: 'Contemporaneous site photograph / Physical proof', types: ['PHOTO', 'VIDEO', 'SCAN'], keywords: ['photo', 'site', 'image'] },
    { id: 'daily_report', label: 'Daily progress report / Hindrance register log', types: ['DOCUMENT', 'SITE_ORDER'], keywords: ['dpr', 'report', 'hindrance'] },
    { id: 'measurement', label: 'Measurement / BOQ cross-reference', types: ['MEASUREMENT', 'DOCUMENT', 'PDF'], keywords: ['measurement', 'boq', 'quantity'] },
    { id: 'dept_reply', label: 'Department response / Acknowledgement', types: ['LETTER', 'EMAIL', 'SITE_ORDER'], keywords: ['reply', 'response', 'ack'] },
  ],
  claim_generic: [
    { id: 'claim_notice', label: 'Statutory intent to claim notice (Clause 2 / 10CC / 12)', types: ['LETTER', 'PDF'], keywords: ['intent', 'claim', 'notice', 'clause'] },
    { id: 'machinery_log', label: 'Machinery idling logs / Logbook entries', types: ['DOCUMENT', 'SCAN', 'RECEIPT'], keywords: ['machinery', 'logbook', 'idling', 'fuel'] },
    { id: 'labour_muster', label: 'Labour muster roll / Wage sheets for idled workforce', types: ['DOCUMENT', 'MEASUREMENT', 'SCAN'], keywords: ['wage', 'labour', 'muster', 'attendance'] },
    { id: 'site_photos', label: 'Site photographs / Videos of idle plant & machinery', types: ['PHOTO', 'VIDEO'], keywords: ['photo', 'idle', 'plant', 'machinery'] },
    { id: 'site_order_ref', label: 'Site order book / Inspection hindrance records', types: ['SITE_ORDER', 'SCAN'], keywords: ['order', 'book', 'inspection'] },
    { id: 'financial_computation', label: 'Hudson / Emden Formula financial computation sheet', types: ['PDF', 'DOCUMENT'], keywords: ['computation', 'formula', 'hudson', 'financial', 'overhead'] },
  ],
}

/**
 * Returns the standard required evidence checklist template for an event or claim category.
 */
export function getRequiredEvidenceChecklist(category?: string | null): ChecklistTemplateItem[] {
  if (!category) return DEFAULT_EVENT_CHECKLISTS.default_generic
  if (category === 'claim' || category.startsWith('claim_')) {
    return DEFAULT_EVENT_CHECKLISTS.claim_generic
  }
  return DEFAULT_EVENT_CHECKLISTS[category] || DEFAULT_EVENT_CHECKLISTS.default_generic
}

/**
 * Calculates Evidence Completeness for a Contract Event, Hindrance, or Claim.
 * Checks linked evidence records against standard checklist items.
 */
export function calculateEvidenceCompleteness(
  category: string,
  linkedEvidence: EvidenceRecord[] = []
): EvidenceCompletenessSummary {
  const checklist = getRequiredEvidenceChecklist(category)
  const usedEvidenceIds = new Set<string>()

  const evaluatedItems: EvidenceCompletenessItem[] = checklist.map(checkItem => {
    // Find matching linked evidence item
    const match = linkedEvidence.find(ev => {
      if (usedEvidenceIds.has(ev.id)) return false
      // Check type compatibility
      const typeMatches = checkItem.types.includes(ev.type)
      if (!typeMatches) return false

      // Check keyword compatibility if keywords defined
      if (checkItem.keywords && checkItem.keywords.length > 0) {
        const text = `${ev.title} ${ev.description || ''} ${ev.original_filename || ''}`.toLowerCase()
        const keywordMatched = checkItem.keywords.some(kw => text.includes(kw.toLowerCase()))
        if (keywordMatched) return true
      }

      return true
    })

    if (match) {
      usedEvidenceIds.add(match.id)
      return {
        id: checkItem.id,
        label: checkItem.label,
        types: checkItem.types,
        fulfilled: true,
        matchedEvidenceId: match.id,
        matchedEvidenceNumber: match.evidence_number,
        matchedEvidenceTitle: match.title,
        documentDate: match.document_date,
      }
    }

    return {
      id: checkItem.id,
      label: checkItem.label,
      types: checkItem.types,
      fulfilled: false,
    }
  })

  const totalRequired = evaluatedItems.length
  const fulfilledCount = evaluatedItems.filter(i => i.fulfilled).length
  const percentage = totalRequired > 0 ? Math.round((fulfilledCount / totalRequired) * 100) : 100

  return {
    totalRequired,
    fulfilledCount,
    ratioString: `${fulfilledCount}/${totalRequired}`,
    percentage,
    isComplete: fulfilledCount === totalRequired,
    items: evaluatedItems,
  }
}

/**
 * Filter evidence list based on user filter criteria
 */
export function filterEvidenceRecords(
  records: EvidenceRecord[],
  filters: {
    search?: string
    type?: string
    projectId?: string
    contractId?: string
    source?: string
    relatedType?: 'event' | 'hindrance' | 'measurement' | 'boq' | 'ra_bill' | 'eot' | 'all'
  }
): EvidenceRecord[] {
  return records.filter(r => {
    // Project filter
    if (filters.projectId && filters.projectId !== 'all' && r.project_id !== filters.projectId) {
      return false
    }

    // Contract filter
    if (filters.contractId && filters.contractId !== 'all' && r.contract_id !== filters.contractId) {
      return false
    }

    // Type filter
    if (filters.type && filters.type !== 'all' && r.type !== filters.type) {
      return false
    }

    // Source filter
    if (filters.source && filters.source !== 'all' && r.source !== filters.source) {
      return false
    }

    // Related record type filter
    if (filters.relatedType && filters.relatedType !== 'all') {
      switch (filters.relatedType) {
        case 'event':
          if (!r.related_contract_event_id) return false
          break
        case 'hindrance':
          if (!r.related_hindrance_id) return false
          break
        case 'measurement':
          if (!r.related_measurement_id) return false
          break
        case 'boq':
          if (!r.related_boq_item_id) return false
          break
        case 'ra_bill':
          if (!r.related_ra_bill_id) return false
          break
        case 'eot':
          if (!r.related_eot_id) return false
          break
      }
    }

    // Text search filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      const matchNumber = r.evidence_number.toLowerCase().includes(q)
      const matchTitle = r.title.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q) || false
      const matchFile = r.original_filename?.toLowerCase().includes(q) || false
      const matchSource = r.source?.toLowerCase().includes(q) || false
      if (!matchNumber && !matchTitle && !matchDesc && !matchFile && !matchSource) {
        return false
      }
    }

    return true
  })
}
