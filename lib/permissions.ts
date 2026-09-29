/**
 * Centralized Role-Based Access Control (RBAC) System for PillarPro.
 * Single source of truth for all 10 construction enterprise role definitions and module permissions.
 * Designed for Indian Government Contractors (CPWD, State PWD, NHAI, MES, Railways).
 */

export type UserRole =
  | 'owner'
  | 'partner'
  | 'managing_partner' // Backward-compatible alias for partner
  | 'project_manager'
  | 'site_engineer'
  | 'billing_engineer'
  | 'accountant'
  | 'store_manager'
  | 'site_supervisor'
  | 'data_entry'
  | 'viewer'

export type CanonicalRole =
  | 'owner'
  | 'partner'
  | 'project_manager'
  | 'site_engineer'
  | 'billing_engineer'
  | 'accountant'
  | 'store_manager'
  | 'site_supervisor'
  | 'data_entry'
  | 'viewer'

export const ROLES_CONFIG: {
  id: CanonicalRole
  label: string
  description: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}[] = [
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full administrative and financial authority across all projects, firm settings, user management, and month-close locks.',
    badgeVariant: 'danger',
  },
  {
    id: 'partner',
    label: 'Partner / Managing Partner',
    description: 'Executive operational and financial access across all contracts, equity ledgers, and approvals. Cannot delete firm audit history or alter ownership.',
    badgeVariant: 'warning',
  },
  {
    id: 'project_manager',
    label: 'Project Manager (PM)',
    description: 'Site project in-charge: manages contracts, site hindrances, formal correspondence, variation requests, claims, and EOT submissions.',
    badgeVariant: 'info',
  },
  {
    id: 'billing_engineer',
    label: 'Billing Engineer / QS',
    description: 'Quantity surveying authority: certifies e-MB measurements, prepares RA bills, analyzes variation rates, and drafts statutory claims.',
    badgeVariant: 'success',
  },
  {
    id: 'site_engineer',
    label: 'Site Engineer',
    description: 'Field operations: records e-MB measurements, inspects work fronts, reports site hindrances, and tracks daily progress reports (DPR).',
    badgeVariant: 'info',
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Financial ledger: manages vendor khata, disburses labour wages, tracks bank guarantees (BG/FDR), records RA receipts, and audits tax/deductions.',
    badgeVariant: 'success',
  },
  {
    id: 'store_manager',
    label: 'Store Manager',
    description: 'Warehouse & materials: issues Goods Receipt Notes (GRN), manages site store issues, tracks material wastage, and diesel consumption.',
    badgeVariant: 'default',
  },
  {
    id: 'site_supervisor',
    label: 'Site Supervisor / Foreman',
    description: 'Daily field muster: records worker attendance, logs site petty expenses, tracks equipment running hours, and flags site bottlenecks.',
    badgeVariant: 'default',
  },
  {
    id: 'data_entry',
    label: 'Data Entry Operator',
    description: 'Draft recording: inputs physical measurement sheets, vendor bills, and labour logs in DRAFT mode for engineering review.',
    badgeVariant: 'default',
  },
  {
    id: 'viewer',
    label: 'Auditor / Viewer',
    description: 'Read-only access across all operational and financial records. For chartered accountants, external auditors, and client inspections.',
    badgeVariant: 'default',
  },
]

export function formatRoleLabel(role?: string | null): string {
  if (!role) return 'Staff Member'
  const clean = role.toLowerCase().trim()
  if (clean === 'owner') return 'Owner'
  if (clean === 'managing_partner') return 'Managing Partner'
  if (clean === 'partner') return 'Partner'
  if (clean === 'project_manager') return 'Project Manager'
  if (clean === 'billing_engineer') return 'Billing Engineer'
  if (clean === 'site_engineer') return 'Site Engineer'
  if (clean === 'accountant') return 'Accountant'
  if (clean === 'store_manager') return 'Store Manager'
  if (clean === 'site_supervisor') return 'Site Supervisor'
  if (clean === 'data_entry') return 'Data Entry Operator'
  if (clean === 'viewer') return 'Viewer / Auditor'
  return clean.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function normalizeRole(role: string | null | undefined): CanonicalRole | null {
  if (!role) return null
  const r = role.toLowerCase().trim()
  if (r === 'owner') return 'owner'
  if (r === 'partner' || r === 'managing_partner') return 'partner'
  if (r === 'project_manager' || r === 'pm') return 'project_manager'
  if (r === 'billing_engineer' || r === 'qs') return 'billing_engineer'
  if (r === 'site_engineer') return 'site_engineer'
  if (r === 'accountant') return 'accountant'
  if (r === 'store_manager' || r === 'storekeeper') return 'store_manager'
  if (r === 'site_supervisor' || r === 'supervisor') return 'site_supervisor'
  if (r === 'data_entry' || r === 'clerk') return 'data_entry'
  if (r === 'viewer' || r === 'auditor') return 'viewer'
  return null
}

export type AppModule =
  | 'projects'
  | 'contracts'
  | 'boq'
  | 'measurement'
  | 'ra_bills'
  | 'payments'
  | 'labour'
  | 'materials'
  | 'machinery'
  | 'suppliers'
  | 'expenses'
  | 'contract_events'
  | 'correspondence'
  | 'eot'
  | 'variations'
  | 'claims'
  | 'evidence'
  | 'bg'
  | 'reports'
  | 'settings'
  // Backward compatibility modules:
  | 'dashboard'
  | 'periods'
  | 'users'
  | 'dpr'
  | 'inventory'
  | 'receivables'
  | 'attendance'
  | 'partners'

export type AppAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'manage'
  | 'certify'
  | 'approve'
  | 'submit'

/**
 * Enterprise Single Source of Truth Permissions Matrix for 10 Canonical Roles
 */
const PERMISSIONS_MATRIX: Record<CanonicalRole, Partial<Record<AppModule, AppAction[]>>> = {
  // 1. OWNER: Full power everywhere
  owner: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit', 'delete', 'archive', 'manage'],
    contracts: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    boq: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    measurement: ['view', 'create', 'edit', 'delete', 'certify', 'manage'],
    ra_bills: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'manage'],
    payments: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    labour: ['view', 'create', 'edit', 'delete', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'manage'],
    materials: ['view', 'create', 'edit', 'delete', 'manage'],
    inventory: ['view', 'create', 'edit', 'delete', 'manage'],
    machinery: ['view', 'create', 'edit', 'delete', 'manage'],
    suppliers: ['view', 'create', 'edit', 'delete', 'manage'],
    expenses: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    contract_events: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    correspondence: ['view', 'create', 'edit', 'delete', 'submit', 'manage'],
    eot: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'manage'],
    variations: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'manage'],
    claims: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'manage'],
    evidence: ['view', 'create', 'edit', 'delete', 'manage'],
    bg: ['view', 'create', 'edit', 'delete', 'manage'],
    reports: ['view', 'manage'],
    settings: ['view', 'manage'],
    receivables: ['view', 'create', 'edit', 'manage'],
    partners: ['view', 'create', 'edit', 'delete', 'manage'],
    periods: ['view', 'manage'],
    users: ['view', 'manage'],
    dpr: ['view', 'create', 'edit', 'delete', 'manage'],
  },

  // 2. PARTNER: Full operational & financial execution
  partner: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit'],
    contracts: ['view', 'create', 'edit', 'approve'],
    boq: ['view', 'create', 'edit', 'approve'],
    measurement: ['view', 'create', 'edit', 'certify'],
    ra_bills: ['view', 'create', 'edit', 'submit', 'approve'],
    payments: ['view', 'create', 'edit', 'approve'],
    labour: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit', 'delete'],
    materials: ['view', 'create', 'edit'],
    inventory: ['view', 'create', 'edit'],
    machinery: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit', 'approve'],
    contract_events: ['view', 'create', 'edit', 'approve'],
    correspondence: ['view', 'create', 'edit', 'submit'],
    eot: ['view', 'create', 'edit', 'submit', 'approve'],
    variations: ['view', 'create', 'edit', 'submit', 'approve'],
    claims: ['view', 'create', 'edit', 'submit', 'approve'],
    evidence: ['view', 'create', 'edit'],
    bg: ['view', 'create', 'edit'],
    reports: ['view'],
    settings: ['view'],
    receivables: ['view', 'create', 'edit'],
    partners: ['view', 'create', 'edit'],
    dpr: ['view', 'create', 'edit'],
  },

  // 3. PROJECT MANAGER: Site in-charge & Contract Defense Leader
  project_manager: {
    dashboard: ['view'],
    projects: ['view', 'edit'],
    contracts: ['view', 'edit'],
    boq: ['view', 'create', 'edit', 'approve'],
    measurement: ['view', 'create', 'edit', 'certify'],
    ra_bills: ['view', 'create', 'edit', 'submit'],
    payments: ['view'],
    labour: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit'],
    materials: ['view', 'create', 'edit', 'approve'],
    inventory: ['view', 'create', 'edit'],
    machinery: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit', 'approve'],
    contract_events: ['view', 'create', 'edit', 'approve'],
    correspondence: ['view', 'create', 'edit', 'submit'],
    eot: ['view', 'create', 'edit', 'submit'],
    variations: ['view', 'create', 'edit', 'submit'],
    claims: ['view', 'create', 'edit', 'submit'],
    evidence: ['view', 'create', 'edit', 'delete'],
    bg: ['view'],
    reports: ['view'],
    settings: ['view'],
    receivables: ['view'],
    dpr: ['view', 'create', 'edit'],
  },

  // 4. BILLING ENGINEER: QS, e-MB Certification, RA Bills, Variations & Claims
  billing_engineer: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view', 'edit'],
    boq: ['view', 'create', 'edit'],
    measurement: ['view', 'create', 'edit', 'certify'],
    ra_bills: ['view', 'create', 'edit', 'submit'],
    payments: ['view'],
    labour: ['view'],
    attendance: ['view'],
    materials: ['view'],
    inventory: ['view'],
    machinery: ['view'],
    suppliers: ['view'],
    expenses: ['view'],
    contract_events: ['view', 'create', 'edit'],
    correspondence: ['view', 'create', 'edit'],
    eot: ['view', 'create', 'edit', 'submit'],
    variations: ['view', 'create', 'edit', 'submit'],
    claims: ['view', 'create', 'edit', 'submit'],
    evidence: ['view', 'create', 'edit'],
    bg: ['view'],
    reports: ['view'],
    receivables: ['view'],
    dpr: ['view'],
  },

  // 5. SITE ENGINEER: Field measurements, Hindrance entry, DPR
  site_engineer: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view'],
    boq: ['view'],
    measurement: ['view', 'create', 'edit'], // Cannot certify
    ra_bills: ['view'],
    labour: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit'],
    materials: ['view', 'create'],
    inventory: ['view', 'create'],
    machinery: ['view', 'create', 'edit'],
    suppliers: ['view'],
    expenses: ['view', 'create', 'edit'],
    contract_events: ['view', 'create', 'edit'],
    correspondence: ['view', 'create'],
    eot: ['view'],
    variations: ['view', 'create'],
    claims: ['view', 'create'],
    evidence: ['view', 'create', 'edit'],
    reports: ['view'],
    dpr: ['view', 'create', 'edit'],
  },

  // 6. ACCOUNTANT: Ledgers, Supplier khata, Payments, BGs, Tax/Deductions
  accountant: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view'],
    boq: ['view'],
    measurement: ['view'],
    ra_bills: ['view', 'edit'], // Record deductions & payment reconciliation
    payments: ['view', 'create', 'edit', 'approve'],
    labour: ['view', 'create', 'edit'],
    attendance: ['view'],
    materials: ['view'],
    inventory: ['view', 'create', 'edit'],
    machinery: ['view'],
    suppliers: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit', 'approve'],
    contract_events: ['view'],
    correspondence: ['view'],
    eot: ['view'],
    variations: ['view'],
    claims: ['view', 'edit'], // Record claim receipts
    evidence: ['view', 'create'],
    bg: ['view', 'create', 'edit'],
    reports: ['view'],
    receivables: ['view', 'create', 'edit'],
    dpr: ['view'],
  },

  // 7. STORE MANAGER: Warehouse, GRN, Stock issues, Material deliveries
  store_manager: {
    dashboard: ['view'],
    projects: ['view'],
    boq: ['view'],
    materials: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    machinery: ['view', 'create', 'edit'], // Fuel issue logs
    suppliers: ['view', 'create'], // Material delivery challans
    expenses: ['view', 'create'], // Freight / unloading
    evidence: ['view', 'create'], // Delivery slips & weighbridge tickets
    reports: ['view'],
  },

  // 8. SITE SUPERVISOR: Daily labour muster, machine hours, site cash
  site_supervisor: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view'],
    boq: ['view'],
    measurement: ['view', 'create'], // Draft measurement recording
    labour: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit'],
    materials: ['view', 'create'],
    inventory: ['view', 'create'],
    machinery: ['view', 'create', 'edit'],
    suppliers: ['view'],
    expenses: ['view', 'create', 'edit'],
    contract_events: ['view', 'create'],
    evidence: ['view', 'create'],
    dpr: ['view', 'create', 'edit'],
  },

  // 9. DATA ENTRY: Typing clerk in draft mode
  data_entry: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view'],
    boq: ['view'],
    measurement: ['view', 'create'],
    ra_bills: ['view'],
    labour: ['view', 'create'],
    attendance: ['view', 'create'],
    materials: ['view', 'create'],
    inventory: ['view', 'create'],
    machinery: ['view', 'create'],
    suppliers: ['view', 'create'],
    expenses: ['view', 'create'],
    contract_events: ['view', 'create'],
    correspondence: ['view', 'create'],
    eot: ['view'],
    variations: ['view'],
    claims: ['view'],
    evidence: ['view', 'create'],
  },

  // 10. VIEWER: Complete read-only audit access
  viewer: {
    dashboard: ['view'],
    projects: ['view'],
    contracts: ['view'],
    boq: ['view'],
    measurement: ['view'],
    ra_bills: ['view'],
    payments: ['view'],
    labour: ['view'],
    attendance: ['view'],
    materials: ['view'],
    inventory: ['view'],
    machinery: ['view'],
    suppliers: ['view'],
    expenses: ['view'],
    contract_events: ['view'],
    correspondence: ['view'],
    eot: ['view'],
    variations: ['view'],
    claims: ['view'],
    evidence: ['view'],
    bg: ['view'],
    reports: ['view'],
    receivables: ['view'],
    dpr: ['view'],
  },
}

/**
 * Primary permission evaluation function.
 */
export function can(
  rawRole: string | null | undefined,
  module: AppModule,
  action: AppAction
): boolean {
  const role = normalizeRole(rawRole)
  if (!role) return false
  const allowedActions = PERMISSIONS_MATRIX[role]?.[module]
  if (!allowedActions) return false
  return allowedActions.includes(action)
}

// ==============================================================================
// Ergonomic Guard Helpers for High-Stakes Actions (Prompt Explicitly Protected)
// ==============================================================================

/** Protects: Certified measurements */
export function canCertifyMeasurement(role: string | null | undefined): boolean {
  return can(role, 'measurement', 'certify')
}

/** Protects: Approved BOQ changes */
export function canApproveBOQ(role: string | null | undefined): boolean {
  return can(role, 'boq', 'approve')
}

/** Protects: RA Bills submission */
export function canSubmitRABill(role: string | null | undefined): boolean {
  return can(role, 'ra_bills', 'submit')
}

/** Protects: Payments recording & approval */
export function canRecordPayment(role: string | null | undefined): boolean {
  return can(role, 'payments', 'create')
}

/** Protects: Claims preparation & filing */
export function canSubmitClaim(role: string | null | undefined): boolean {
  return can(role, 'claims', 'submit')
}

/** Protects: Contract amendments & date alterations */
export function canAmendContract(role: string | null | undefined): boolean {
  const r = normalizeRole(role)
  return r === 'owner' || r === 'partner' || r === 'project_manager'
}

/** Protects: Extension of Time (EOT) applications */
export function canSubmitEOT(role: string | null | undefined): boolean {
  return can(role, 'eot', 'submit')
}

/** Protects: Variation order approvals */
export function canApproveVariation(role: string | null | undefined): boolean {
  return can(role, 'variations', 'approve')
}

// ==============================================================================
// Existing Backward-Compatible Helpers
// ==============================================================================
export const canArchiveProject = (role: string | null | undefined) => can(role, 'projects', 'archive')
export const canCreateProject  = (role: string | null | undefined) => can(role, 'projects', 'create')

export const canDeleteExpense  = (role: string | null | undefined) => can(role, 'expenses', 'delete')
export const canCreateExpense  = (role: string | null | undefined) => can(role, 'expenses', 'create')

export const canDeleteSupplier = (role: string | null | undefined) => can(role, 'suppliers', 'delete')
export const canCreateSupplier = (role: string | null | undefined) => can(role, 'suppliers', 'create')

export const canCreateRaBill   = (role: string | null | undefined) => can(role, 'ra_bills', 'create')
export const canEditRaBill     = (role: string | null | undefined) => can(role, 'ra_bills', 'edit')
export const canCreateAttendance = (role: string | null | undefined) => can(role, 'attendance', 'create')
export const canDeleteWorker     = (role: string | null | undefined) => can(role, 'attendance', 'delete')

export const canViewPartners   = (role: string | null | undefined) => can(role, 'partners', 'view')
export const canCreatePartner  = (role: string | null | undefined) => can(role, 'partners', 'create')

export const canManageUsers    = (role: string | null | undefined) => can(role, 'users', 'manage')
export const canManagePeriods  = (role: string | null | undefined) => can(role, 'periods', 'manage')
export const canManageWages    = (role: string | null | undefined) => {
  const r = normalizeRole(role)
  return r === 'owner' || r === 'partner' || r === 'accountant'
}

export const canManageMachinery = (role: string | null | undefined) => can(role, 'machinery', 'create')
export const canDeleteMachinery = (role: string | null | undefined) => can(role, 'machinery', 'delete')

export const canManageDPR = (role: string | null | undefined) => can(role, 'dpr', 'create')
export const canDeleteDPR = (role: string | null | undefined) => can(role, 'dpr', 'delete')

export const canManageInventory = (role: string | null | undefined) => can(role, 'inventory', 'create')
export const canDeleteInventory = (role: string | null | undefined) => can(role, 'inventory', 'delete')

export const canViewContracts = (role: string | null | undefined) => can(role, 'contracts', 'view')
export const canManageContracts = (role: string | null | undefined) => can(role, 'contracts', 'edit')
