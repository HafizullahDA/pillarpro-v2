import { canViewPartners, canManageUsers, canManagePeriods } from '@/lib/permissions'

// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   i18nKey: 'nav.dashboard',   icon: 'dashboard' },
  { href: '/projects',    label: 'Projects',    i18nKey: 'nav.projects',    icon: 'projects'  },
  { href: '/suppliers',   label: 'Suppliers',   i18nKey: 'nav.suppliers',   icon: 'suppliers' },
  { href: '/inventory',   label: 'Store & Stock', i18nKey: 'nav.inventory', icon: 'inventory' },
  { href: '/attendance',  label: 'Attendance',  i18nKey: 'nav.attendance',  icon: 'attendance'},
  { href: '/machinery',   label: 'Machinery & Fuel', i18nKey: 'nav.machinery', icon: 'machinery' },
  { href: '/receivables', label: 'Receivables', i18nKey: 'nav.receivables', icon: 'receivables'},
  { href: '/ra-bills',    label: 'RA Bills',    i18nKey: 'nav.ra_bills',    icon: 'ra_bills'   },
  { href: '/partners',    label: 'Partners',    i18nKey: 'nav.partners',    icon: 'partners'  },
  { href: '/expenses',    label: 'Expenses',    i18nKey: 'nav.expenses',    icon: 'expenses'  },
  { href: '/admin/users',   label: 'Team',        i18nKey: 'nav.team',        icon: 'admin'     },
  { href: '/admin/periods', label: 'Month Close', i18nKey: 'nav.month_close', icon: 'admin'     },
] as const

export type NavItem = typeof NAV_ITEMS[number]

export function isNavVisible(href: string, role: string | null | undefined): boolean {
  if (href === '/partners') return canViewPartners(role)
  if (href === '/admin/users') return canManageUsers(role)
  if (href === '/admin/periods') return canManagePeriods(role)
  return true
}
