export type ContractEventCategory =
  | 'site_not_handed_over'
  | 'drawing_delay'
  | 'design_change'
  | 'approval_delay'
  | 'material_approval_delay'
  | 'utility_shifting'
  | 'encroachment'
  | 'force_majeure'
  | 'rain_weather'
  | 'law_order_issue'
  | 'department_instruction'
  | 'variation_instruction'
  | 'suspension'
  | 'payment_delay'
  | 'access_restriction'
  | 'other'

export type ContractDefenseStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'DISPUTED'

export interface ContractEvent {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  hindrance_id?: string | null
  event_number: string
  event_type: ContractEventCategory | string
  event_date: string
  start_date: string
  end_date?: string | null
  location?: string | null
  affected_boq_items?: string[]
  affected_activities?: string | null
  description: string
  cause?: string | null
  responsible_party?: string | null
  impact?: string | null
  estimated_delay_days: number
  actual_delay_days: number
  labour_affected?: string | null
  machinery_affected?: string | null
  material_affected?: string | null
  financial_impact: number
  eot_relevance: boolean
  eot_clause?: string | null
  claim_relevance: boolean
  claim_heads?: string | null
  status: ContractDefenseStatus
  remarks?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  projects?: {
    name: string
    agency_name?: string | null
  } | null
  contracts?: {
    agreement_number?: string | null
    contract_name?: string | null
  } | null
}

export interface DetailedHindrance {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  hindrance_number: number
  hindrance_code?: string | null
  category: string
  description: string
  location_chainage?: string | null
  start_date: string
  end_date?: string | null
  status: string
  standard_status?: ContractDefenseStatus
  delay_type: string
  overlapping_days: number
  net_delay_days: number
  notice_served: boolean
  notice_date?: string | null
  notice_reference_no?: string | null
  officer_acknowledged_by?: string | null
  officer_designation?: string | null
  acknowledgement_date?: string | null
  affected_work?: string | null
  affected_boq_items?: string[]
  labour_impact?: string | null
  machinery_impact?: string | null
  department_communication?: string | null
  contractor_communication?: string | null
  removal_date?: string | null
  duration_days?: number
  photo_urls?: string[] | null
  document_urls?: string[] | null
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface TimelineNode {
  id: string
  date: string
  type: 'event' | 'hindrance' | 'milestone' | 'notice'
  title: string
  subtitle?: string
  description: string
  category: string
  categoryLabel: string
  responsibleParty?: string
  location?: string
  durationDays?: number
  status: ContractDefenseStatus
  financialImpact?: number
  isCritical: boolean
  sourceId: string
}

export const EVENT_CATEGORY_CONFIG: Record<
  ContractEventCategory,
  { label: string; neutralTerm: string; defaultParty: string }
> = {
  site_not_handed_over: {
    label: 'Site not handed over',
    neutralTerm: 'Site possession / Right of Way (ROW) pending handing over',
    defaultParty: 'Department / Employer',
  },
  drawing_delay: {
    label: 'Drawing delay',
    neutralTerm: 'Pending issuance of Good For Construction (GFC) drawings',
    defaultParty: 'Department / Consultant',
  },
  design_change: {
    label: 'Design change',
    neutralTerm: 'Revision in approved structural / architectural design',
    defaultParty: 'Department / Consultant',
  },
  approval_delay: {
    label: 'Approval delay',
    neutralTerm: 'Statutory or departmental administrative approval in progress',
    defaultParty: 'Department / Statutory Authority',
  },
  material_approval_delay: {
    label: 'Material approval delay',
    neutralTerm: 'Mix design / material source sample approval in progress',
    defaultParty: 'Quality Control / Consultant',
  },
  utility_shifting: {
    label: 'Utility shifting',
    neutralTerm: 'Electric poles, water pipelines, or cables awaiting shifting',
    defaultParty: 'Utility Agency / PDD / Jal Shakti',
  },
  encroachment: {
    label: 'Encroachment',
    neutralTerm: 'Local land encroachment / structure obstruction on alignment',
    defaultParty: 'Revenue Dept / Local Administration',
  },
  force_majeure: {
    label: 'Force majeure',
    neutralTerm: 'Unforeseen event beyond reasonable control / Act of God',
    defaultParty: 'External / Neutral',
  },
  rain_weather: {
    label: 'Rain/weather',
    neutralTerm: 'Excessive unseasonal precipitation / adverse weather condition',
    defaultParty: 'Nature / Environmental',
  },
  law_order_issue: {
    label: 'Law/order issue',
    neutralTerm: 'Local public restriction / law and order enforcement',
    defaultParty: 'Civil Administration',
  },
  department_instruction: {
    label: 'Department instruction',
    neutralTerm: 'Written site instruction or hold order issued by Engineer-in-Charge',
    defaultParty: 'Department / Employer',
  },
  variation_instruction: {
    label: 'Variation instruction',
    neutralTerm: 'Instruction to execute extra, deviation, or substituted items',
    defaultParty: 'Department / Employer',
  },
  suspension: {
    label: 'Suspension',
    neutralTerm: 'Temporary suspension of works instructed under GCC Clause 15',
    defaultParty: 'Department / Employer',
  },
  payment_delay: {
    label: 'Payment delay',
    neutralTerm: 'Running Account bill payment release pending beyond stipulated period',
    defaultParty: 'Department / Treasury',
  },
  access_restriction: {
    label: 'Access restriction',
    neutralTerm: 'Site access route obstructed or restricted by surrounding works',
    defaultParty: 'Third Party / Administration',
  },
  other: {
    label: 'Other',
    neutralTerm: 'Site condition requiring contractual notice and time record',
    defaultParty: 'External / Other',
  },
}
