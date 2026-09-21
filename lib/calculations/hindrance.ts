/**
 * PillarPro v2 — Hindrance & Delay Defense Engine Calculations
 * 
 * Provides mathematical modeling for:
 * 1. Statutory 14-day notice urgency tracking (CPWD / PWD GCC Clause 5)
 * 2. Multi-hindrance overlapping & net delay calculation
 * 3. Compensable (Department fault) vs Non-compensable (Force majeure) segregation
 * 4. 10% Liquidated Damages (LD) liability shield calculation
 * 5. Official Clause 5 Notice & CPWD Form 27 text generators
 */

export type HindranceCategory =
  | 'site_handover'
  | 'drawing_delay'
  | 'utility_shifting'
  | 'forest_clearance'
  | 'department_material'
  | 'fund_delay'
  | 'extra_work'
  | 'weather'
  | 'force_majeure'
  | 'other'

export type HindranceDelayType = 'compensable' | 'non_compensable'
export type HindranceStatus = 'active' | 'resolved' | 'acknowledged_by_dept' | 'disputed'

export interface HindranceItem {
  id: string
  hindrance_number: number
  category: HindranceCategory
  description: string
  location_chainage?: string | null
  start_date: string
  end_date?: string | null
  status: HindranceStatus
  delay_type: HindranceDelayType
  overlapping_days: number
  net_delay_days: number
  notice_served: boolean
  notice_date?: string | null
  notice_reference_no?: string | null
  officer_acknowledged_by?: string | null
  officer_designation?: string | null
  acknowledgement_date?: string | null
  photo_urls?: string[] | null
  remarks?: string | null
}

export interface NoticeUrgency {
  daysElapsed: number
  daysRemaining: number
  status: 'served' | 'overdue' | 'due_soon' | 'pending'
  label: string
  variant: 'success' | 'danger' | 'warning' | 'neutral'
}

export interface HindranceMetrics {
  totalCount: number
  activeCount: number
  resolvedCount: number
  unservedNoticesCount: number
  urgentNoticesCount: number
  totalGrossDays: number
  totalOverlappingDays: number
  totalNetDays: number
  compensableDays: number
  nonCompensableDays: number
  ldRatePercent: number
  ldProtectedAmount: number
}

export const HINDRANCE_CATEGORY_LABELS: Record<HindranceCategory, string> = {
  site_handover: 'Delay in Handing Over Site / ROW',
  drawing_delay: 'Delay in Structural Drawings / Decisions',
  utility_shifting: 'Obstruction by Electric Poles / Water Lines',
  forest_clearance: 'Forest / Environmental Clearance Delay',
  department_material: 'Non-Supply of Departmental Materials',
  fund_delay: 'Non-Payment of RA Bills / Treasury Budget Lack',
  extra_work: 'Execution of Substantial Extra / Deviation Items',
  weather: 'Abnormal Heavy Rain / Cloudburst / Snowfall',
  force_majeure: 'Civil Curfew / Strike / Force Majeure',
  other: 'Other Departmental Impediment',
}

/**
 * Calculates statutory 14-day notice urgency for a hindrance
 * Based on Clause 5 of CPWD / State PWD General Conditions of Contract
 */
export function getNoticeUrgency(
  startDate: string,
  noticeServed: boolean,
  noticeDate?: string | null,
  asOfDate: string = new Date().toISOString().split('T')[0]
): NoticeUrgency {
  if (noticeServed) {
    return {
      daysElapsed: 0,
      daysRemaining: 14,
      status: 'served',
      label: noticeDate ? `Served on ${noticeDate}` : 'Notice Served',
      variant: 'success',
    }
  }

  const start = new Date(startDate)
  const current = new Date(asOfDate)
  const diffTime = current.getTime() - start.getTime()
  const daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  const daysRemaining = 14 - daysElapsed

  if (daysRemaining < 0) {
    return {
      daysElapsed,
      daysRemaining,
      status: 'overdue',
      label: `Overdue by ${Math.abs(daysRemaining)}d (Statutory Clock Exceeded)`,
      variant: 'danger',
    }
  }

  if (daysRemaining <= 5) {
    return {
      daysElapsed,
      daysRemaining,
      status: 'due_soon',
      label: `Urgent: Notice Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      variant: 'warning',
    }
  }

  return {
    daysElapsed,
    daysRemaining,
    status: 'pending',
    label: `${daysRemaining} days left to serve notice`,
    variant: 'neutral',
  }
}

/**
 * Calculates duration in days between two ISO date strings (inclusive)
 */
export function calculateDurationDays(
  startDate: string,
  endDate?: string | null,
  referenceDate: string = new Date().toISOString().split('T')[0]
): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(referenceDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  if (end < start) return 0
  const diffTime = end.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Comprehensive metrics aggregation across all project hindrances
 */
export function calculateHindranceMetrics(
  hindrances: HindranceItem[],
  awardedAmount: number = 0,
  asOfDate: string = new Date().toISOString().split('T')[0]
): HindranceMetrics {
  let totalGrossDays = 0
  let totalOverlappingDays = 0
  let totalNetDays = 0
  let compensableDays = 0
  let nonCompensableDays = 0
  let activeCount = 0
  let resolvedCount = 0
  let unservedNoticesCount = 0
  let urgentNoticesCount = 0

  for (const h of hindrances) {
    if (h.status === 'active') activeCount++
    if (h.status === 'resolved' || h.status === 'acknowledged_by_dept') resolvedCount++

    const urgency = getNoticeUrgency(h.start_date, h.notice_served, h.notice_date, asOfDate)
    if (!h.notice_served) {
      unservedNoticesCount++
      if (urgency.status === 'due_soon' || urgency.status === 'overdue') {
        urgentNoticesCount++
      }
    }

    const duration = calculateDurationDays(h.start_date, h.end_date, asOfDate)
    totalGrossDays += duration

    const overlapping = Number(h.overlapping_days) || 0
    totalOverlappingDays += overlapping

    const net = Math.max(0, duration - overlapping)
    totalNetDays += net

    if (h.delay_type === 'compensable') {
      compensableDays += net
    } else {
      nonCompensableDays += net
    }
  }

  // 10% Liquidated Damages Cap under standard government civil contracts
  const ldRatePercent = 10
  const ldProtectedAmount = Number(((awardedAmount * ldRatePercent) / 100).toFixed(2))

  return {
    totalCount: hindrances.length,
    activeCount,
    resolvedCount,
    unservedNoticesCount,
    urgentNoticesCount,
    totalGrossDays,
    totalOverlappingDays,
    totalNetDays,
    compensableDays,
    nonCompensableDays,
    ldRatePercent,
    ldProtectedAmount,
  }
}

/**
 * Generates official CPWD Clause 5 Notice Letter text
 */
export function generateClause5NoticeText({
  project,
  hindrance,
  firmName = 'Contracting Agency',
  contractRefNo = 'Work Order / Agreement',
  refNo = 'PP/EOT/NOTICE/01',
  date = new Date().toISOString().split('T')[0],
}: {
  project: { name: string; agency_name?: string | null; awarded_amount?: number | null }
  hindrance: HindranceItem
  firmName?: string
  contractRefNo?: string
  refNo?: string
  date?: string
}): string {
  const categoryLabel = HINDRANCE_CATEGORY_LABELS[hindrance.category] || hindrance.category
  const chainageStr = hindrance.location_chainage ? ` at ${hindrance.location_chainage}` : ''
  const isCompensable = hindrance.delay_type === 'compensable'

  return `REF NO: ${refNo}
DATE: ${date}

TO:
The Executive Engineer / Competent Authority
${project.agency_name || 'Public Works Department'}

SUBJECT: Formal Notice of Site Hindrance under Clause 5 of General Conditions of Contract (GCC)
NAME OF WORK: ${project.name}
AGREEMENT / WORK ORDER REF: ${contractRefNo}

Respected Sir / Madam,

With utmost respect, we bring to your urgent official notice that the execution of work on the subject project has been severely hindered due to reasons beyond the control of the contractor.

DETAILS OF HINDRANCE:
1. Nature of Hindrance: ${categoryLabel}
2. Specific Location / Chainage: ${chainageStr || 'General Site Stretch'}
3. Date of Occurrence / Commencement: ${hindrance.start_date}
4. Description of Obstruction:
   "${hindrance.description}"
5. Contractual Classification: ${isCompensable ? 'Compensable Delay (Department Obligation)' : 'Non-Compensable / Force Majeure'}

STATUTORY NOTICE COMPLIANCE:
In strict compliance with Clause 5 of the Standard GCC (CPWD / PWD Works Manual), the contractor is required to notify the Engineer-in-Charge in writing within 14 days of the occurrence of any hindrance. This letter constitutes our contemporaneous notice reserving all rights to an Extension of Time (EOT)${isCompensable ? ' and statutory compensation / price escalation under Clause 10CA/10CC' : ''}.

REQUEST FOR INSPECTION & REMOVAL:
You are requested to kindly inspect the site along with the Assistant Executive Engineer (AEE) / Junior Engineer (JE) and record the hindrance in the official Site Hindrance Register. We further request prompt administrative intervention to remove this impediment at the earliest so that full-scale execution can resume.

Thanking you,

Yours faithfully,
For ${firmName}

(Authorized Signatory / Managing Partner)
Copy to:
1. The Superintending Engineer, for kind information.
2. The Assistant Executive Engineer / Site-in-Charge, for joint site verification.
3. Office Copy (Record of Hindrance Dossier).`
}

