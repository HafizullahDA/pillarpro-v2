// Nav items shared between Sidebar, IconRail, BottomNav
export const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: 'dashboard' },
  { href: '/projects',    label: 'Projects',    icon: 'projects'  },
  { href: '/vendors',     label: 'Vendors',     icon: 'vendors'   },
  { href: '/suppliers',   label: 'Suppliers',   icon: 'suppliers' },
  { href: '/attendance',  label: 'Attendance',  icon: 'attendance'},
  { href: '/receivables', label: 'Receivables', icon: 'receivables'},
  { href: '/partners',    label: 'Partners',    icon: 'partners'  },
  { href: '/expenses',    label: 'Expenses',    icon: 'expenses'  },
  { href: '/admin/users',   label: 'Users',       icon: 'admin'     },
  { href: '/admin/periods', label: 'Month Close', icon: 'admin'     },
] as const

export type NavItem = typeof NAV_ITEMS[number]
