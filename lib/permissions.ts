/**
 * Centralized Role-Based Access Control (RBAC) System for PillarPro.
 * Single source of truth for all role definitions and module permissions.
 */

export type UserRole =
  | 'owner'
  | 'partner'
  | 'managing_partner' // Backward-compatible alias for partner
  | 'site_supervisor'
  | 'accountant'
  | 'viewer'

export type CanonicalRole =
  | 'owner'
  | 'partner'
  | 'site_supervisor'
  | 'accountant'
  | 'viewer'

export const ROLES_CONFIG: {
  id: CanonicalRole
  label: string
  description: string
}[] = [
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full access everywhere including project archiving, deletion, user administration, and month close.',
  },
  {
    id: 'partner',
    label: 'Partner',
    description: 'Full operational access across all projects, financial statements, and partner equity (no user management or month close).',
  },
  {
    id: 'site_supervisor',
    label: 'Site Supervisor',
    description: 'Operational logging for assigned sites: log daily attendance, add site workers, and record expenses. Read-only everywhere else.',
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Financial management across suppliers, procurements, RA bills, and expenses. Read-only on attendance, no archive/delete.',
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only access across all core modules for external auditors and client demos. Cannot create, edit, delete, or access admin.',
  },
]

export function normalizeRole(role: string | null | undefined): CanonicalRole | null {
  if (!role) return null
  const r = role.toLowerCase().trim()
  if (r === 'owner') return 'owner'
  if (r === 'partner' || r === 'managing_partner') return 'partner'
  if (r === 'site_supervisor') return 'site_supervisor'
  if (r === 'accountant') return 'accountant'
  if (r === 'viewer') return 'viewer'
  return null
}

export type AppModule =
  | 'dashboard'
  | 'projects'
  | 'suppliers'
  | 'ra_bills'
  | 'attendance'
  | 'expenses'
  | 'receivables'
  | 'partners'
  | 'periods'
  | 'users'

export type AppAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'manage'

/**
 * Single source of truth permissions matrix
 */
const PERMISSIONS_MATRIX: Record<CanonicalRole, Partial<Record<AppModule, AppAction[]>>> = {
  owner: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit', 'archive'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    ra_bills: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit', 'delete'],
    receivables: ['view', 'create', 'edit'],
    partners: ['view', 'create', 'edit'],
    periods: ['view', 'manage'],
    users: ['view', 'manage'],
  },
  partner: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    ra_bills: ['view', 'create', 'edit'],
    attendance: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit'],
    receivables: ['view', 'create', 'edit'],
    partners: ['view', 'create', 'edit'],
    // periods: None
    // users: None
  },
  site_supervisor: {
    dashboard: ['view'],
    projects: ['view'],
    suppliers: ['view'],
    ra_bills: ['view'],
    attendance: ['view', 'create', 'edit'],
    expenses: ['view', 'create', 'edit'],
    receivables: ['view'],
    // partners: None
    // periods: None
    // users: None
  },
  accountant: {
    dashboard: ['view'],
    projects: ['view'],
    suppliers: ['view', 'create', 'edit'],
    ra_bills: ['view', 'create', 'edit'],
    attendance: ['view'],
    expenses: ['view', 'create', 'edit'],
    receivables: ['view', 'create', 'edit'],
    // partners: None
    // periods: None
    // users: None
  },
  viewer: {
    dashboard: ['view'],
    projects: ['view'],
    suppliers: ['view'],
    ra_bills: ['view'],
    attendance: ['view'],
    expenses: ['view'],
    receivables: ['view'],
    // partners: None
    // periods: None
    // users: None
  },
}

/**
 * Check if a role has permission to perform an action on a module.
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

// Ergonomic helpers for high-frequency permission checks:
export const canArchiveProject = (role: string | null | undefined) => can(role, 'projects', 'archive')
export const canCreateProject  = (role: string | null | undefined) => can(role, 'projects', 'create')

export const canDeleteExpense  = (role: string | null | undefined) => can(role, 'expenses', 'delete')
export const canCreateExpense  = (role: string | null | undefined) => can(role, 'expenses', 'create')

export const canDeleteSupplier = (role: string | null | undefined) => can(role, 'suppliers', 'delete')
export const canCreateSupplier = (role: string | null | undefined) => can(role, 'suppliers', 'create')

export const canCreateRaBill   = (role: string | null | undefined) => can(role, 'ra_bills', 'create')
export const canCreateAttendance = (role: string | null | undefined) => can(role, 'attendance', 'create')

export const canViewPartners   = (role: string | null | undefined) => can(role, 'partners', 'view')
export const canCreatePartner  = (role: string | null | undefined) => can(role, 'partners', 'create')

export const canManageUsers    = (role: string | null | undefined) => can(role, 'users', 'manage')
export const canManagePeriods  = (role: string | null | undefined) => can(role, 'periods', 'manage')
export const canManageWages    = (role: string | null | undefined) => {
  const r = normalizeRole(role)
  return r === 'owner' || r === 'partner' || r === 'accountant'
}

