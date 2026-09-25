import { canViewPartners, canManageUsers, canManagePeriods } from '@/lib/permissions'

// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',       i18nKey: 'nav.dashboard',     icon: 'dashboard' },
  { href: '/projects',      label: 'Projects',        i18nKey: 'nav.projects',      icon: 'projects'  },
  { href: '/ledgers',       label: 'Ledgers',         i18nKey: 'nav.ledgers',       icon: 'ledgers'   },
  { href: '/hindrances',    label: 'Delay Defense',   i18nKey: 'nav.hindrances',    icon: 'shield'    },
  { href: '/partners',      label: 'Partners',        i18nKey: 'nav.partners',      icon: 'partners'  },
  { href: '/admin/users',   label: 'Team & Roles',    i18nKey: 'nav.team',          icon: 'admin'     },
  { href: '/admin/periods', label: 'Month Close',     i18nKey: 'nav.month_close',   icon: 'admin'     },
] as const

export type NavItem = typeof NAV_ITEMS[number]

export function isNavVisible(href: string, role: string | null | undefined): boolean {
  if (href === '/partners') return canViewPartners(role)
  if (href === '/admin/users') return canManageUsers(role)
  if (href === '/admin/periods') return canManagePeriods(role)
  return true
}
