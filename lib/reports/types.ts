/**
 * Professional Reporting Engine Types for PillarPro Enterprise.
 * Covers 24 standardized Indian Government Construction & Engineering Reports.
 */

export type ReportKey =
  | 'MEASUREMENT_BOOK'
  | 'ABSTRACT_OF_MEASUREMENTS'
  | 'BOQ_PROGRESS'
  | 'QUANTITY_BALANCE'
  | 'RA_BILL_ABSTRACT'
  | 'RA_BILL_REGISTER'
  | 'PAYMENT_REGISTER'
  | 'CONTRACT_EVENT_REGISTER'
  | 'HINDRANCE_REGISTER'
  | 'CORRESPONDENCE_REGISTER'
  | 'NOTICE_REGISTER'
  | 'EOT_REGISTER'
  | 'VARIATION_REGISTER'
  | 'EXTRA_ITEM_REGISTER'
  | 'CLAIM_REGISTER'
  | 'EVIDENCE_REGISTER'
  | 'LABOUR_REGISTER'
  | 'MATERIAL_REGISTER'
  | 'MACHINERY_LOG'
  | 'SUPPLIER_STATEMENT'
  | 'BG_REGISTER'
  | 'SECURITY_DEPOSIT_REGISTER'
  | 'PROJECT_COST_REPORT'
  | 'PROJECT_PROFITABILITY_REPORT'

export type ReportCategory =
  | 'measurement'
  | 'billing'
  | 'defense'
  | 'operations'
  | 'financial'

export interface ReportDefinition {
  key: ReportKey
  number: number
  title: string
  shortTitle: string
  category: ReportCategory
  categoryLabel: string
  description: string
  orientation: 'portrait' | 'landscape'
  applicableSignoffs: {
    preparedBy: string
    checkedBy: string
    approvedBy: string
  }
}

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'number' | 'date' | 'percent' | 'badge' | 'text'
  width?: string
}

export interface ReportMetadata {
  projectId?: string | null
  projectName: string
  agencyName: string
  contractId?: string | null
  agreementNumber: string
  employerName: string
  division: string
  reportingPeriod: string
  periodStart?: string | null
  periodEnd?: string | null
  generatedAt: string
  generatedByName: string
  generatedByEmail: string
  generatedByRole: string
  preparedByTitle: string
  checkedByTitle: string
  approvedByTitle: string
  departmentStandardNotice?: string
}

export interface ReportResult {
  reportKey: ReportKey
  reportTitle: string
  category: ReportCategory
  orientation: 'portrait' | 'landscape'
  metadata: ReportMetadata
  columns: ReportColumn[]
  rows: Record<string, any>[]
  totals?: Record<string, any>
  availableStatuses: string[]
  recordCount: number
}

export interface ReportFilterParams {
  reportKey: ReportKey
  projectId?: string
  startDate?: string
  endDate?: string
  status?: string
}

export const REPORT_REGISTRY: Record<ReportKey, ReportDefinition> = {
  MEASUREMENT_BOOK: {
    key: 'MEASUREMENT_BOOK',
    number: 1,
    title: 'Measurement Book (e-MB Detail Record)',
    shortTitle: 'Measurement Book',
    category: 'measurement',
    categoryLabel: 'Engineering & Measurements',
    description: 'Itemized chainage, dimension, and quantity details recorded from field measurements.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Site Engineer (Recorded By)',
      checkedBy: 'Junior Engineer / Assistant Engineer',
      approvedBy: 'Executive Engineer / Project Director',
    },
  },
  ABSTRACT_OF_MEASUREMENTS: {
    key: 'ABSTRACT_OF_MEASUREMENTS',
    number: 2,
    title: 'Abstract of Measurements',
    shortTitle: 'Abstract of Measurements',
    category: 'measurement',
    categoryLabel: 'Engineering & Measurements',
    description: 'Cumulative quantity summary item-wise up to date against tender provisions.',
    orientation: 'portrait',
    applicableSignoffs: {
      preparedBy: 'Billing Engineer',
      checkedBy: 'Quantity Surveyor',
      approvedBy: 'Project Manager',
    },
  },
  BOQ_PROGRESS: {
    key: 'BOQ_PROGRESS',
    number: 3,
    title: 'BOQ Schedule Physical & Financial Progress',
    shortTitle: 'BOQ Progress',
    category: 'measurement',
    categoryLabel: 'Engineering & Measurements',
    description: 'Item-rate comparison of tender vs executed quantities and financial realizations.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Planning Engineer',
      checkedBy: 'Project Manager',
      approvedBy: 'Managing Partner / Contractor',
    },
  },
  QUANTITY_BALANCE: {
    key: 'QUANTITY_BALANCE',
    number: 4,
    title: 'Quantity Balance & Variation Threshold Report',
    shortTitle: 'Quantity Balance',
    category: 'measurement',
    categoryLabel: 'Engineering & Measurements',
    description: 'Tracks residual BOQ balance, deviations, and potential 25% clause limit breaches.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Quantity Surveyor',
      checkedBy: 'Billing Engineer',
      approvedBy: 'Chief Project Engineer',
    },
  },
  RA_BILL_ABSTRACT: {
    key: 'RA_BILL_ABSTRACT',
    number: 5,
    title: 'Running Account (RA) Bill Abstract',
    shortTitle: 'RA Bill Abstract',
    category: 'billing',
    categoryLabel: 'Billing & Treasury Ledger',
    description: 'Official bill abstract showing gross certified value, statutory withholdings, and net payable.',
    orientation: 'portrait',
    applicableSignoffs: {
      preparedBy: 'Contractor Billing Engineer',
      checkedBy: 'Departmental Sub-Divisional Officer (SDO)',
      approvedBy: 'Executive Engineer (Pay & Accounts)',
    },
  },
  RA_BILL_REGISTER: {
    key: 'RA_BILL_REGISTER',
    number: 6,
    title: 'Running Account (RA) Bill Cumulative Register',
    shortTitle: 'RA Bill Register',
    category: 'billing',
    categoryLabel: 'Billing & Treasury Ledger',
    description: 'Chronological register of all submitted, passed, and pending government contractor bills.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Billing Incharge',
      checkedBy: 'Accounts Manager',
      approvedBy: 'Managing Partner',
    },
  },
  PAYMENT_REGISTER: {
    key: 'PAYMENT_REGISTER',
    number: 7,
    title: 'Department Treasury Payment & Remittance Register',
    shortTitle: 'Payment Register',
    category: 'billing',
    categoryLabel: 'Billing & Treasury Ledger',
    description: 'Treasury vouchers, bank UTRs, and statutory tax deduction credits against passed bills.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Senior Accountant',
      checkedBy: 'Chief Financial Officer',
      approvedBy: 'Managing Partner',
    },
  },
  CONTRACT_EVENT_REGISTER: {
    key: 'CONTRACT_EVENT_REGISTER',
    number: 8,
    title: 'Contractual Milestone & Site Event Register',
    shortTitle: 'Contract Event Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Contemporary record diary of site handovers, drawings issues, and contractual notices.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Site Engineer',
      checkedBy: 'Project Manager',
      approvedBy: 'Contract Administrator',
    },
  },
  HINDRANCE_REGISTER: {
    key: 'HINDRANCE_REGISTER',
    number: 9,
    title: 'Hindrance Register (Delays & Disruptions)',
    shortTitle: 'Hindrance Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Departmental and non-contractor site hindrances, overlaps, and net delay impact diary.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Site Engineer (Incharge)',
      checkedBy: 'Assistant Engineer / Resident Engineer',
      approvedBy: 'Executive Engineer / Project Director',
    },
  },
  CORRESPONDENCE_REGISTER: {
    key: 'CORRESPONDENCE_REGISTER',
    number: 10,
    title: 'Contractual Correspondence Register',
    shortTitle: 'Correspondence Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Inward & outward letters, site orders, instructions, and response deadline tracking.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Correspondence Clerk',
      checkedBy: 'Liaison Officer',
      approvedBy: 'Project Manager',
    },
  },
  NOTICE_REGISTER: {
    key: 'NOTICE_REGISTER',
    number: 11,
    title: 'Contractual Notice Compliance Register',
    shortTitle: 'Notice Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Time-bar notices issued under GCC clauses (Clause 5, 10CC, 12, arbitration rules).',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Contracts Engineer',
      checkedBy: 'Legal / Claims Consultant',
      approvedBy: 'Authorized Signatory',
    },
  },
  EOT_REGISTER: {
    key: 'EOT_REGISTER',
    number: 12,
    title: 'Extension of Time (EOT) Case Register',
    shortTitle: 'EOT Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Factual record of days claimed, days approved, pending determinations, and revised completion dates.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Contracts Engineer',
      checkedBy: 'Claims Specialist',
      approvedBy: 'Managing Partner',
    },
  },
  VARIATION_REGISTER: {
    key: 'VARIATION_REGISTER',
    number: 13,
    title: 'Contract Variations & Deviations Register',
    shortTitle: 'Variation Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Official deviation orders, quantity variations, instruction authorities, and sanctioned values.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Quantity Surveyor',
      checkedBy: 'Billing Engineer',
      approvedBy: 'Project Manager',
    },
  },
  EXTRA_ITEM_REGISTER: {
    key: 'EXTRA_ITEM_REGISTER',
    number: 14,
    title: 'Extra Items & Substituted Items Sanction Register',
    shortTitle: 'Extra Item Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Non-schedule extra items, rate analysis submissions, and department approval sanctions.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Billing Engineer',
      checkedBy: 'Chief QS Engineer',
      approvedBy: 'Executive Engineer / Project Authority',
    },
  },
  CLAIM_REGISTER: {
    key: 'CLAIM_REGISTER',
    number: 15,
    title: 'Contractual Claims & Compensation Register',
    shortTitle: 'Claim Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Delay prolongation, idle plant, material escalation, and contractual claim ledger.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Claims Engineer',
      checkedBy: 'Arbitration Counsel / Technical Advisor',
      approvedBy: 'Managing Partner',
    },
  },
  EVIDENCE_REGISTER: {
    key: 'EVIDENCE_REGISTER',
    number: 16,
    title: 'Evidence Vault & Contemporaneous Records Register',
    shortTitle: 'Evidence Register',
    category: 'defense',
    categoryLabel: 'Contract Defense & Claims',
    description: 'Geotagged site photos, measurement sheets, test certificates, and site order book extracts.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Document Controller',
      checkedBy: 'Site Engineer',
      approvedBy: 'Project Manager',
    },
  },
  LABOUR_REGISTER: {
    key: 'LABOUR_REGISTER',
    number: 17,
    title: 'Labour Deployment & Wage Payment Register',
    shortTitle: 'Labour Register',
    category: 'operations',
    categoryLabel: 'Site Operations & Resources',
    description: 'Statutory muster roll, skilled/unskilled man-days, daily rates, and wage disbursement records.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Timekeeper / Supervisor',
      checkedBy: 'Labour Officer',
      approvedBy: 'Project Manager',
    },
  },
  MATERIAL_REGISTER: {
    key: 'MATERIAL_REGISTER',
    number: 18,
    title: 'Material Inward & Site Consumption Register',
    shortTitle: 'Material Register',
    category: 'operations',
    categoryLabel: 'Site Operations & Resources',
    description: 'Cement, steel, aggregates, bitumen delivery challans, testing, and reconciliation balances.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Store Manager',
      checkedBy: 'Quality Control Engineer',
      approvedBy: 'Project Manager',
    },
  },
  MACHINERY_LOG: {
    key: 'MACHINERY_LOG',
    number: 19,
    title: 'Plant, Machinery & Equipment Utilization Log',
    shortTitle: 'Machinery Log',
    category: 'operations',
    categoryLabel: 'Site Operations & Resources',
    description: 'Excavators, batching plants, transit mixers, diesel consumption, and idle hour logbook.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Plant Supervisor',
      checkedBy: 'Mechanical Engineer',
      approvedBy: 'Project Manager',
    },
  },
  SUPPLIER_STATEMENT: {
    key: 'SUPPLIER_STATEMENT',
    number: 20,
    title: 'Supplier Khata Statement & Reconciliation Ledger',
    shortTitle: 'Supplier Statement',
    category: 'operations',
    categoryLabel: 'Site Operations & Resources',
    description: 'Material purchases, invoices, payments made, and outstanding payable balances by vendor.',
    orientation: 'portrait',
    applicableSignoffs: {
      preparedBy: 'Store / Procurement Incharge',
      checkedBy: 'Accountant',
      approvedBy: 'Managing Partner',
    },
  },
  BG_REGISTER: {
    key: 'BG_REGISTER',
    number: 21,
    title: 'Bank Guarantee (BG) & Financial Undertakings Register',
    shortTitle: 'BG Register',
    category: 'financial',
    categoryLabel: 'Statutory Guarantees & Financials',
    description: 'Performance security, advance BGs, margin money, expiry tracking, and claim validity periods.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Finance Executive',
      checkedBy: 'Chief Accountant',
      approvedBy: 'Managing Partner',
    },
  },
  SECURITY_DEPOSIT_REGISTER: {
    key: 'SECURITY_DEPOSIT_REGISTER',
    number: 22,
    title: 'Security Deposit & Retention Money Register',
    shortTitle: 'Security Deposit Register',
    category: 'financial',
    categoryLabel: 'Statutory Guarantees & Financials',
    description: 'Deducted retention, earnest money deposits, FDRs, and Defect Liability Period (DLP) release dates.',
    orientation: 'landscape',
    applicableSignoffs: {
      preparedBy: 'Billing Engineer',
      checkedBy: 'Senior Accountant',
      approvedBy: 'Managing Partner',
    },
  },
  PROJECT_COST_REPORT: {
    key: 'PROJECT_COST_REPORT',
    number: 23,
    title: 'Project Cost Incurred & Overhead Breakdown Report',
    shortTitle: 'Project Cost Report',
    category: 'financial',
    categoryLabel: 'Statutory Guarantees & Financials',
    description: 'Detailed analysis of material, labour, machinery, subcontract, and administrative site overheads.',
    orientation: 'portrait',
    applicableSignoffs: {
      preparedBy: 'Cost Accountant',
      checkedBy: 'Project Financial Controller',
      approvedBy: 'Managing Partner',
    },
  },
  PROJECT_PROFITABILITY_REPORT: {
    key: 'PROJECT_PROFITABILITY_REPORT',
    number: 24,
    title: 'Project Profitability & Operating Margin Statement',
    shortTitle: 'Profitability Report',
    category: 'financial',
    categoryLabel: 'Statutory Guarantees & Financials',
    description: 'Earned value revenue vs total costs incurred, gross margin %, receivables, and net contractor earnings.',
    orientation: 'portrait',
    applicableSignoffs: {
      preparedBy: 'Head of Accounts',
      checkedBy: 'Finance Partner',
      approvedBy: 'Managing Partner',
    },
  },
}
