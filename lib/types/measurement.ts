export type MeasurementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CHECKED'
  | 'CERTIFIED'
  | 'REJECTED'
  | 'CANCELLED'

export type CalculationMode =
  | 'l_b_d'
  | 'l_b'
  | 'l_h'
  | 'num_l_b_h'
  | 'running_length'
  | 'weight'
  | 'count'
  | 'manual'

export type DeviationOrderType = 'deviation' | 'variation' | 'extra_item' | 'none'

export type AdjustmentType =
  | 'test_check_reduction'
  | 'reversal'
  | 'correction'
  | 'addition'
  | 'deduction'

export type DocumentCategory =
  | 'site_photo'
  | 'drawing_cross_section'
  | 'level_sheet'
  | 'rfi_inspection'
  | 'quality_test'
  | 'test_check_memo'
  | 'other'

export interface MeasurementBook {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  book_number: string
  title: string
  financial_year?: string | null
  issued_to_name?: string | null
  issued_to_designation?: string | null
  division?: string | null
  subdivision?: string | null
  total_pages: number
  current_page: number
  status: 'ACTIVE' | 'FULL' | 'CLOSED' | 'ARCHIVED'
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface MeasurementEntry {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  measurement_book_id?: string | null
  boq_item_id: string
  entry_number: string
  page_number: number
  measurement_date: string
  location?: string | null
  chainage_km?: number | null
  chainage_m?: number | null
  chainage_end_km?: number | null
  chainage_end_m?: number | null
  description: string
  calculation_mode: CalculationMode
  number_of_units: number
  length: number
  breadth: number
  depth_height: number
  calculated_quantity: number
  unit: string
  previous_quantity: number
  current_quantity: number
  cumulative_quantity: number
  boq_balance_quantity: number
  is_exceeded: boolean
  deviation_order_type?: DeviationOrderType | null
  billed_in_ra_bill_id?: string | null
  remarks?: string | null
  site_reference?: string | null
  drawing_reference?: string | null
  entered_by?: string | null
  checked_by?: string | null
  checked_at?: string | null
  certified_by?: string | null
  certified_at?: string | null
  status: MeasurementStatus
  created_at: string
  updated_at: string
  boq_items?: {
    id: string
    item_number: string
    description: string
    unit: string
    contract_quantity: number
    contract_rate: number
    contract_amount: number
    item_type: string
  }
}

export interface MeasurementAdjustment {
  id: string
  organization_id: string
  project_id: string
  measurement_entry_id: string
  boq_item_id: string
  adjustment_type: AdjustmentType
  previous_quantity: number
  adjusted_quantity: number
  difference_quantity: number
  reason: string
  authorized_by: string
  created_at: string
  created_by?: string | null
}

export interface MeasurementDocument {
  id: string
  organization_id: string
  project_id: string
  measurement_entry_id?: string | null
  measurement_book_id?: string | null
  file_name: string
  file_url: string
  file_type?: string | null
  document_category: DocumentCategory
  caption?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface MeasurementCertificate {
  id: string
  organization_id: string
  project_id: string
  contract_id?: string | null
  measurement_book_id?: string | null
  certificate_number: string
  certificate_date: string
  period_from: string
  period_to: string
  total_items_measured: number
  total_certified_value: number
  certified_by_name: string
  certified_by_designation?: string | null
  statutory_declaration: string
  status: 'DRAFT' | 'ISSUED' | 'REVOKED'
  created_at: string
}

export interface MeasurementAbstractItem {
  boq_item_id: string
  item_number: string
  description: string
  unit: string
  contract_quantity: number
  contract_rate: number
  contract_amount: number
  previous_quantity: number
  current_quantity: number
  cumulative_quantity: number
  balance_quantity: number
  cumulative_amount: number
  certified_quantity: number
  certified_amount: number
  is_exceeded: boolean
  entry_count: number
}

export const CALCULATION_MODES: {
  value: CalculationMode
  label: string
  formula: string
  description: string
}[] = [
  {
    value: 'l_b_d',
    label: 'Length × Breadth × Depth (L × B × D)',
    formula: 'Nos × L × B × D',
    description: 'Earthwork excavation, concrete foundations, PCC/RCC, masonry',
  },
  {
    value: 'l_b',
    label: 'Length × Breadth (Area / Plaster / Flooring)',
    formula: 'Nos × L × B',
    description: 'Plastering, painting, flooring, road surfacing, waterproofing',
  },
  {
    value: 'l_h',
    label: 'Length × Height (Wall area / Fencing / Kerbs)',
    formula: 'Nos × L × H',
    description: 'Boundary walls, side cladding, guardrails, painting on walls',
  },
  {
    value: 'num_l_b_h',
    label: 'Nos × Length × Breadth × Height',
    formula: 'Nos × L × B × H',
    description: 'Columns, pedestals, isolated footings, repetitive precast units',
  },
  {
    value: 'running_length',
    label: 'Running Length (Nos × L)',
    formula: 'Nos × Length',
    description: 'Pipes, kerb stones, expansion joints, railings, wiring conduits',
  },
  {
    value: 'weight',
    label: 'Weight (Calculated/Bar Bending)',
    formula: 'Nos × Length × Unit Wt (d²/162)',
    description: 'Structural steel, reinforcement rebar, MS plates, tie rods',
  },
  {
    value: 'count',
    label: 'Count / Number',
    formula: 'Nos',
    description: 'Manholes, valves, light fixtures, doors, fittings, trees planted',
  },
  {
    value: 'manual',
    label: 'Direct / Manual Entry',
    formula: 'Quantity',
    description: 'Lump sum items, weighbridge slips, specialized testing, direct billing',
  },
]
