'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_GROUPS, isNavVisible } from './NavLinks'
import { Icons } from './NavIcons'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '@/lib/utils'
import { formatRoleLabel } from '@/lib/permissions'
import { Logo } from '@/components/ui/Logo'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Sidebar({
  userName,
  userRole,
  userEmail,
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean
  userName: string
  userRole: string
  userEmail?: string | null
}) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const { locale, setLocale, t } = useLanguage()

  // Helper to determine which group currently owns the active pathname
  const getActiveGroupId = useCallback(() => {
    for (const group of NAV_GROUPS) {
      const match = group.items.some(item =>
        item.href === '/ledgers/suppliers'
          ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
          : item.href === '/ledgers/ra-bills'
          ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
          : pathname.startsWith(item.href)
      )
      if (match) return group.id
    }
    return null
  }, [pathname])

  // Collapsible state: only heading visible by default, auto-opens the active section
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    const activeId = getActiveGroupId()
    if (activeId) {
      initial[activeId] = true
    }
    return initial
  })

  const [ownerExpanded, setOwnerExpanded] = useState<boolean>(() => pathname.startsWith('/admin/visitors'))

  // Auto-expand group when route changes into its scope
  useEffect(() => {
    const activeId = getActiveGroupId()
    if (activeId) {
      setExpandedGroups(prev => ({ ...prev, [activeId]: true }))
    }
    if (pathname.startsWith('/admin/visitors')) {
      setOwnerExpanded(true)
    }
  }, [pathname, getActiveGroupId])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-900 text-white shrink-0 border-r border-slate-800/80">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <Logo theme="dark" href="/dashboard" size="md" />
        </div>

        {/* Navigation with Collapsible Heading Accordions */}
        <nav className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto custom-scrollbar">
          {/* Top Primary Command Center Link */}
          <div>
            <Link
              href="/dashboard"
              className={cn(
                'relative overflow-hidden flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all select-none group',
                pathname === '/dashboard' || pathname === '/'
                  ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(0,0,0,0.3)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-white'
                  : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 transition-colors',
                  pathname === '/dashboard' || pathname === '/' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                )}
              >
                {Icons.dashboard}
              </span>
              <span className="flex-1 truncate">{t('nav.dashboard', 'Command Center')}</span>
            </Link>
          </div>

          {/* Operational Clusters - Collapsible Headings */}
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
                {/* Heading Button with bottom divider */}
                <div className="pb-1 border-b border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors select-none group hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'text-[10.5px] font-bold uppercase tracking-[0.09em] truncate transition-colors',
                          hasActiveChild ? 'text-slate-200' : 'text-slate-300 group-hover:text-white'
                        )}
                      >
                        {t(group.i18nKey || '', group.label)}
                      </span>
                      {hasActiveChild && !isExpanded && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-mono font-medium leading-none bg-slate-800/90 text-slate-300 border border-slate-700/60 shadow-2xs group-hover:border-slate-600 transition-colors">
                        {groupVisibleItems.length}
                      </span>
                      <svg
                        className={cn(
                          'w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0',
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
                </div>

                {/* Sub-items Container with thin 1px 20-25% white vertical connector line */}
                {isExpanded && (
                  <div className="relative ml-3 pl-1.5 border-l border-white/20 space-y-0.5 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
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
                        <div key={item.href} className="relative flex items-center">
                          <Link
                            href={item.href}
                            className={cn(
                              'relative overflow-hidden w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all select-none group',
                              active
                                ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(0,0,0,0.3)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-white'
                                : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                            )}
                          >
                            <span
                              className={cn(
                                'w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 transition-colors',
                                active
                                  ? 'text-white'
                                  : isAi
                                  ? 'text-blue-400 group-hover:text-blue-300'
                                  : 'text-slate-500 group-hover:text-slate-300'
                              )}
                            >
                              {Icons[item.icon as keyof typeof Icons]}
                            </span>
                            <span className="flex-1 truncate">{label}</span>
                            {'badge' in item && (item as any).badge && (
                              <span
                                className={cn(
                                  'text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs leading-none',
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
          {(isPlatformAdmin || userEmail?.trim().toLowerCase() === 'pillarprojk@gmail.com') && (
            <div className="pt-3 border-t border-slate-800/80 space-y-1">
              <div className="pb-1 border-b border-slate-800/70">
                <button
                  type="button"
                  onClick={() => setOwnerExpanded(prev => !prev)}
                  aria-expanded={ownerExpanded}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors select-none group hover:bg-slate-800/40 text-amber-300"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] truncate text-amber-300/90 group-hover:text-amber-200">
                      Platform Owner
                    </span>
                    {pathname.startsWith('/admin/visitors') && !ownerExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-mono font-medium leading-none bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-2xs">
                      1
                    </span>
                    <svg
                      className={cn(
                        'w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-transform duration-200 shrink-0',
                        ownerExpanded ? 'rotate-90 text-amber-300' : 'rotate-0'
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
              </div>

              {ownerExpanded && (
                <div className="relative ml-3 pl-1.5 border-l border-amber-500/30 space-y-0.5 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="relative flex items-center">
                    <Link
                      href="/admin/visitors"
                      className={cn(
                        'relative overflow-hidden w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all select-none group',
                        pathname.startsWith('/admin/visitors')
                          ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.3)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-amber-400'
                          : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 transition-colors',
                          pathname.startsWith('/admin/visitors') ? 'text-amber-300' : 'text-amber-500/70 group-hover:text-amber-400'
                        )}
                      >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </span>
                      <span className="flex-1 truncate">Visitor Telemetry</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 leading-none">
                        Live
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bilingual Hindi/English Language Switcher */}
        <div className="px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>{locale === 'hi' ? 'भाषा' : 'Language'}</span>
          </span>
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => setLocale('en')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors',
                locale === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLocale('hi')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors',
                locale === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* User - Clickable Profile Button */}
        <div className="px-3 py-3 border-t border-slate-800">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-semibold text-xs shadow-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{formatRoleLabel(userRole)}</p>
            </div>
            <svg className="h-4 w-4 text-slate-500 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Legal & Version Footer */}
        <div className="px-4 py-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <Link href="/pricing" target="_blank" className="hover:text-slate-300 transition-colors">Pricing</Link>
            <span>•</span>
            <Link href="/terms" target="_blank" className="hover:text-slate-300 transition-colors">Terms</Link>
            <span>•</span>
            <Link href="/privacy" target="_blank" className="hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
          <span className="text-slate-600">v0.1.0</span>
        </div>
      </aside>

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
