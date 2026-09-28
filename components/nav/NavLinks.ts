import { canViewPartners, canManageUsers, canManagePeriods } from '@/lib/permissions'

// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard',       i18nKey: 'nav.dashboard',     icon: 'dashboard' },
  { href: '/projects',          label: 'Projects',        i18nKey: 'nav.projects',      icon: 'projects'  },
  { href: '/ledgers/suppliers', label: 'Supplier Khata',  i18nKey: 'nav.suppliers',     icon: 'suppliers' },
  { href: '/ledgers/ra-bills',  label: 'Client & RA Bills', i18nKey: 'nav.ra_bills',    icon: 'ra_bills'  },
  { href: '/ledgers/attendance', label: 'Labour & Wages', i18nKey: 'nav.attendance',   icon: 'attendance'},
  { href: '/ledgers/machinery', label: 'Machinery & Fuel', i18nKey: 'nav.machinery',   icon: 'machinery' },
  { href: '/ledgers/inventory', label: 'Store & Stock',   i18nKey: 'nav.inventory',    icon: 'inventory' },
  { href: '/ledgers/expenses',  label: 'Site Expenses',   i18nKey: 'nav.expenses',     icon: 'expenses'  },
  { href: '/hindrances',        label: 'Delay Defense',   i18nKey: 'nav.hindrances',    icon: 'shield'    },
  { href: '/partners',          label: 'Partners',        i18nKey: 'nav.partners',      icon: 'partners'  },
  { href: '/admin/users',       label: 'Team & Roles',    i18nKey: 'nav.team',          icon: 'admin'     },
  { href: '/admin/periods',     label: 'Month Close',     i18nKey: 'nav.month_close',   icon: 'admin'     },
] as const


export type NavItem = typeof NAV_ITEMS[number]

export function isNavVisible(href: string, role: string | null | undefined): boolean {
  if (href === '/partners') return canViewPartners(role)
  if (href === '/admin/users') return canManageUsers(role)
  if (href === '/admin/periods') return canManagePeriods(role)
  return true
}
