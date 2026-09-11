import { canViewPartners, canManageUsers, canManagePeriods } from '@/lib/permissions'

// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: 'dashboard' },
  { href: '/projects',    label: 'Projects',    icon: 'projects'  },
  { href: '/suppliers',   label: 'Suppliers',   icon: 'suppliers' },
  { href: '/attendance',  label: 'Attendance',  icon: 'attendance'},
  { href: '/receivables', label: 'Receivables', icon: 'receivables'},
  { href: '/ra-bills',    label: 'RA Bills',    icon: 'ra_bills'   },
  { href: '/partners',    label: 'Partners',    icon: 'partners'  },
  { href: '/expenses',    label: 'Expenses',    icon: 'expenses'  },
  { href: '/admin/users',   label: 'Team',        icon: 'admin'     },
  { href: '/admin/periods', label: 'Month Close', icon: 'admin'     },
] as const

export type NavItem = typeof NAV_ITEMS[number]

export function isNavVisible(href: string, role: string | null | undefined): boolean {
  if (href === '/partners') return canViewPartners(role)
  if (href === '/admin/users') return canManageUsers(role)
  if (href === '/admin/periods') return canManagePeriods(role)
  return true
}
