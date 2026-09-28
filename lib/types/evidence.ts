export type EvidenceType =
  | 'DOCUMENT'
  | 'PHOTO'
  | 'VIDEO'
  | 'PDF'
  | 'SCAN'
  | 'LETTER'
  | 'EMAIL'
  | 'DRAWING'
  | 'SITE_ORDER'
  | 'MEASUREMENT'
  | 'RECEIPT'
  | 'OTHER'

export const EVIDENCE_TYPES: EvidenceType[] = [
  'DOCUMENT',
  'PHOTO',
  'VIDEO',
  'PDF',
  'SCAN',
  'LETTER',
  'EMAIL',
  'DRAWING',
  'SITE_ORDER',
  'MEASUREMENT',
  'RECEIPT',
  'OTHER',
]

export const EVIDENCE_TYPE_CONFIG: Record<
  EvidenceType,
  { label: string; icon: string; badgeColor: string; description: string }
> = {
  DOCUMENT: {
    label: 'Document',
    icon: '📄',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Contract documents, specifications, or general office reports',
  },
  PHOTO: {
    label: 'Site Photo',
    icon: '📷',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Geo-tagged or physical site photographs of works or hindrances',
  },
  VIDEO: {
    label: 'Video',
    icon: '🎥',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Site walkthrough, machinery operation, or obstruction videography',
  },
  PDF: {
    label: 'PDF Report',
    icon: '📑',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Official test reports, certificates, or compiled submissions',
  },
  SCAN: {
    label: 'Paper Scan',
    icon: '🖨️',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Physical signed register scans or counterfoil documents',
  },
  LETTER: {
    label: 'Official Letter',
    icon: '✉️',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Departmental correspondence, contractor reminders, speed-post notices',
  },
  EMAIL: {
    label: 'Email Record',
    icon: '📧',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Digital correspondence with Engineer-in-Charge or consultants',
  },
  DRAWING: {
    label: 'Engineering Drawing',
    icon: '📐',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'GFC drawings, cross-sections, structural revisions, L-sections',
  },
  SITE_ORDER: {
    label: 'Site Order Book',
    icon: '📝',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Site Order Book entries, inspection memos, stop orders',
  },
  MEASUREMENT: {
    label: 'Measurement Record',
    icon: '📏',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Joint measurement sheet, level sheet, MB cross-reference',
  },
  RECEIPT: {
    label: 'Receipt / Voucher',
    icon: '🧾',
    badgeColor: 'bg-lime-50 text-lime-700 border-lime-200',
    description: 'Toll slip, diesel voucher, quarry bill, or transit pass proof',
  },
  OTHER: {
    label: 'Other Proof',
    icon: '📎',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Miscellaneous evidence supporting claims or disputes',
  },
}

export interface PhotoMetadata {
  cameraMake?: string
  cameraModel?: string
  dateTimeOriginal?: string
  latitude?: number
  longitude?: number
  altitude?: number
  accuracyMeters?: number
  imageWidth?: number
  imageHeight?: number
}

export interface EvidenceVersion {
  id: string
  evidence_id: string
  version_number: number
  file_url: string
  original_filename?: string | null
  file_type?: string | null
  file_size_bytes?: number | null
  change_summary: string
  metadata?: PhotoMetadata | Record<string, any> | null
  uploaded_by?: string | null
  uploaded_at: string
}

export interface EvidenceRecord {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  evidence_number: string
  type: EvidenceType
  title: string
  description?: string | null
  document_date: string
  source?: string | null

  // Relational business links
  related_contract_event_id?: string | null
  related_hindrance_id?: string | null
  related_measurement_id?: string | null
  related_boq_item_id?: string | null
  related_ra_bill_id?: string | null
  related_eot_id?: string | null
  related_claim_id?: string | null
  related_dispute?: string | null

  // File attributes
  file_url: string
  original_filename?: string | null
  file_type?: string | null
  file_size_bytes?: number | null
  version_number: number
  metadata?: PhotoMetadata | Record<string, any> | null
  notes?: string | null
  status: 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED' | 'DISPUTED'

  created_by?: string | null
  created_at: string
  updated_at: string

  // Joined relations
  projects?: {
    name: string
  } | null
  contracts?: {
    agreement_number?: string | null
    contract_title?: string | null
  } | null
  contract_events?: {
    event_number: string
    description: string
    event_type: string
  } | null
  hindrances?: {
    hindrance_number: number
    description: string
  } | null
  measurement_entries?: {
    entry_number: number
    calculated_quantity: number
  } | null
  boq_items?: {
    item_number: string
    description: string
  } | null
  ra_bills?: {
    bill_number: string
    bill_period_end?: string | null
  } | null
  eot_applications?: {
    application_number: string
  } | null
  versions?: EvidenceVersion[]
}

export interface EvidenceCompletenessItem {
  id: string
  label: string
  types: EvidenceType[]
  fulfilled: boolean
  matchedEvidenceId?: string
  matchedEvidenceNumber?: string
  matchedEvidenceTitle?: string
  documentDate?: string
}

export interface EvidenceCompletenessSummary {
  totalRequired: number
  fulfilledCount: number
  ratioString: string
  percentage: number
  isComplete: boolean
  items: EvidenceCompletenessItem[]
}
