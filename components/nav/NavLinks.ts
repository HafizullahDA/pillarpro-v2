import { canViewPartners, canManageUsers, canManagePeriods } from '@/lib/permissions'

// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard',       i18nKey: 'nav.dashboard',     icon: 'dashboard' },
  { href: '/projects',          label: 'Projects',        i18nKey: 'nav.projects',      icon: 'projects'  },
  { href: '/contract-ai',       label: 'ContractIQ', i18nKey: 'nav.contract_copilot', icon: 'copilot', badge: 'AI' },
  { href: '/measurement',       label: 'Measurement',     i18nKey: 'nav.measurement',   icon: 'measurement'},
  { href: '/ledgers/suppliers', label: 'Supplier Khata',  i18nKey: 'nav.suppliers',     icon: 'suppliers' },
  { href: '/ledgers/ra-bills',  label: 'Client & RA Bills', i18nKey: 'nav.ra_bills',    icon: 'ra_bills'  },
  { href: '/ledgers/attendance', label: 'Labour & Wages', i18nKey: 'nav.attendance',   icon: 'attendance'},
  { href: '/ledgers/machinery', label: 'Machinery & Fuel', i18nKey: 'nav.machinery',   icon: 'machinery' },
  { href: '/ledgers/inventory', label: 'Store & Stock',   i18nKey: 'nav.inventory',    icon: 'inventory' },
  { href: '/ledgers/expenses',  label: 'Site Expenses',   i18nKey: 'nav.expenses',     icon: 'expenses'  },
  { href: '/hindrances',        label: 'Contract Defense',   i18nKey: 'nav.hindrances',    icon: 'shield'    },
  { href: '/reports',           label: 'Reports & Books', i18nKey: 'nav.reports',       icon: 'reports'   },
  { href: '/partners',          label: 'Partners',        i18nKey: 'nav.partners',      icon: 'partners'  },
  { href: '/admin/users',       label: 'Team & Roles',    i18nKey: 'nav.team',          icon: 'admin'     },
  { href: '/admin/periods',     label: 'Month Close',     i18nKey: 'nav.month_close',   icon: 'admin'     },
  { href: '/admin/audit',       label: 'Audit Trail',     i18nKey: 'nav.audit',         icon: 'shield'    },
] as const


export type NavItem = typeof NAV_ITEMS[number]

export function isNavVisible(href: string, role: string | null | undefined): boolean {
  if (href === '/partners') return canViewPartners(role)
  if (href === '/admin/users') return canManageUsers(role)
  if (href === '/admin/periods') return canManagePeriods(role)
  if (href === '/admin/audit') {
    return role === 'owner' || role === 'partner' || role === 'managing_partner' || role === 'project_manager' || role === 'billing_engineer' || role === 'accountant' || role === 'viewer'
  }
  return true
}
