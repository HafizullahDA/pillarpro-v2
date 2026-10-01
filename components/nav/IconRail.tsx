'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_GROUPS, isNavVisible } from './NavLinks'
import { Icons } from './NavIcons'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatRoleLabel } from '@/lib/permissions'

export function IconRail({
  userName,
  userRole = 'Owner',
  userEmail,
}: {
  userName: string
  userRole?: string
  userEmail?: string | null
}) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { t } = useLanguage()

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const group of NAV_GROUPS) {
      const match = group.items.some(item =>
        item.href === '/ledgers/suppliers'
          ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
          : item.href === '/ledgers/ra-bills'
          ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
          : pathname.startsWith(item.href)
      )
      if (match) initial[group.id] = true
    }
    return initial
  })

  const [ownerExpanded, setOwnerExpanded] = useState<boolean>(() => pathname.startsWith('/admin/visitors'))

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  return (
    <>
      <aside className="hidden md:flex lg:hidden flex-col w-16 min-h-screen bg-slate-900 shrink-0 items-center py-4 gap-1 overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <div className="mb-1">
          <Logo showWordmark={false} href="/dashboard" size="sm" />
        </div>

        {/* Tablet Navigation Drawer Toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          title="All Modules (Tree View)"
          className="flex items-center justify-center h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all mb-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Dashboard Command Center */}
        <Link
          href="/dashboard"
          title={t('nav.dashboard', 'Command Center')}
          className={cn(
            'flex items-center justify-center h-10 w-10 rounded-xl transition-all',
            pathname === '/dashboard' || pathname === '/'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white',
          )}
        >
          {Icons.dashboard}
        </Link>

        {/* Grouped Clusters with subtle hair-line dividers */}
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => isNavVisible(item.href, userRole))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.id} className="flex flex-col items-center gap-1 w-full">
              <div className="h-px w-6 bg-slate-800 my-1" />
              {visibleItems.map(item => {
                const active =
                  item.href === '/ledgers/suppliers'
                    ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
                    : item.href === '/ledgers/ra-bills'
                    ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
                    : pathname.startsWith(item.href)

                const title = t((item as any).i18nKey || '', item.label)
                const isAi = item.href === '/contract-ai'

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={title}
                    className={cn(
                      'flex items-center justify-center h-10 w-10 rounded-xl transition-all relative group',
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isAi
                        ? 'text-blue-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    {Icons[item.icon as keyof typeof Icons]}
                    {isAi && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* User avatar and platform owner telemetry at bottom */}
        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          {userEmail?.trim().toLowerCase() === 'pillarprojk@gmail.com' && (
            <Link
              href="/admin/visitors"
              title="Visitor Telemetry (Owner)"
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-xl transition-colors',
                pathname.startsWith('/admin/visitors')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400 hover:bg-slate-800'
              )}
            >
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
          )}

          <button
            onClick={() => setProfileOpen(true)}
            className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center hover:opacity-90 transition-opacity text-white"
            title={userName}
          >
            <span className="text-xs font-semibold">{userName.slice(0, 2).toUpperCase()}</span>
          </button>
        </div>
      </aside>

      {/* Tablet Slide-out Tree Navigation Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex animate-in fade-in duration-150"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-72 bg-slate-900 h-full border-r border-slate-800 text-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <Logo theme="dark" href="/dashboard" size="md" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tree Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto custom-scrollbar">
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                  pathname === '/dashboard' || pathname === '/'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span className={pathname === '/dashboard' || pathname === '/' ? 'text-white' : 'text-slate-400'}>
                  {Icons.dashboard}
                </span>
                <span className="flex-1 truncate">{t('nav.dashboard', 'Command Center')}</span>
              </Link>

              {NAV_GROUPS.map(group => {
                const groupVisibleItems = group.items.filter(item => isNavVisible(item.href, userRole))
                if (groupVisibleItems.length === 0) return null

                const isExpanded = !!expandedGroups[group.id]
                const hasActiveChild = groupVisibleItems.some(item =>
                  item.href === '/ledgers/suppliers'
                    ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
                    : item.href === '/ledgers/ra-bills'
                    ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
                    : pathname.startsWith(item.href)
                )

                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={isExpanded}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all select-none group',
                        hasActiveChild
                          ? 'text-white bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                          {t(group.i18nKey || '', group.label)}
                        </span>
                        {hasActiveChild && !isExpanded && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {groupVisibleItems.length}
                        </span>
                        <svg
                          className={cn(
                            'w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200',
                            isExpanded ? 'rotate-90 text-blue-400' : 'rotate-0'
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="relative ml-4.5 pl-3 border-l-2 border-slate-700/70 space-y-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {groupVisibleItems.map(item => {
                          const active =
                            item.href === '/ledgers/suppliers'
                              ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
                              : item.href === '/ledgers/ra-bills'
                              ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
                              : pathname.startsWith(item.href)

                          const label = t((item as any).i18nKey || '', item.label)
                          const isAi = item.href === '/contract-ai'

                          return (
                            <div key={item.href} className="relative flex items-center group/item">
                              <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-slate-700/70 pointer-events-none group-hover/item:bg-slate-500 transition-colors" />

                              <Link
                                href={item.href}
                                onClick={() => setDrawerOpen(false)}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                                  active
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs border-blue-500'
                                    : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
                                )}
                              >
                                <span className={active ? 'text-white' : isAi ? 'text-blue-400' : 'text-slate-400'}>
                                  {Icons[item.icon as keyof typeof Icons]}
                                </span>
                                <span className="flex-1 truncate">{label}</span>
                                {'badge' in item && (item as any).badge && (
                                  <span
                                    className={cn(
                                      'text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs',
                                      active
                                        ? 'bg-white/20 text-white'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                    )}
                                  >
                                    {(item as any).badge}
                                  </span>
                                )}
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Exclusive Platform Owner Section */}
              {userEmail?.trim().toLowerCase() === 'pillarprojk@gmail.com' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <button
                    type="button"
                    onClick={() => setOwnerExpanded(prev => !prev)}
                    aria-expanded={ownerExpanded}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all select-none group',
                      pathname.startsWith('/admin/visitors')
                        ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
                        : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/50'
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                      Platform Owner
                    </span>
                    <svg
                      className={cn(
                        'w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-400 transition-transform duration-200',
                        ownerExpanded ? 'rotate-90' : 'rotate-0'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {ownerExpanded && (
                    <div className="relative ml-4.5 pl-3 border-l-2 border-amber-500/40 space-y-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="relative flex items-center group/item">
                        <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-amber-500/40 pointer-events-none group-hover/item:bg-amber-400 transition-colors" />
                        <Link
                          href="/admin/visitors"
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                            pathname.startsWith('/admin/visitors')
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white border-slate-800/80'
                          )}
                        >
                          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="flex-1 truncate">Visitor Telemetry</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Live
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Profile footer in drawer */}
            <div className="px-3 py-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false)
                  setProfileOpen(true)
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-semibold text-xs shadow-sm">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400 capitalize">{formatRoleLabel(userRole)}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
      />
    </>
  )
}
