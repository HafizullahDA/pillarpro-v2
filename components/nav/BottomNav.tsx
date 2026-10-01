'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { NAV_ITEMS, NAV_GROUPS, isNavVisible } from './NavLinks'
import { Icons } from './NavIcons'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '@/lib/utils'
import { formatRoleLabel } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const PRIMARY_TABS = [
  { href: '/dashboard',         label: 'Home',      i18nKey: 'nav.dashboard',  icon: 'dashboard', aliases: ['/dashboard'] },
  { href: '/projects',          label: 'Projects',  i18nKey: 'nav.projects',   icon: 'projects',  aliases: ['/projects']  },
  { href: '/ledgers/suppliers', label: 'Suppliers', i18nKey: 'nav.suppliers',  icon: 'suppliers', aliases: ['/suppliers', '/ledgers/suppliers'] },
  { href: '/ledgers/ra-bills',  label: 'RA Bills',  i18nKey: 'nav.ra_bills',   icon: 'ra_bills',  aliases: ['/ra-bills', '/ledgers/ra-bills']  },
]

// All primary tabs and aliases that should not duplicate in the "More" drawer
const PRIMARY_HREFS = new Set([
  '/dashboard',
  '/projects',
  '/ledgers/suppliers',
  '/ledgers/ra-bills',
  '/suppliers',
  '/ra-bills',
])

export function BottomNav({
  userName = 'User',
  userRole = 'owner',
  userEmail,
}: {
  userName?: string
  userRole?: string
  userEmail?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Collapsible group state for mobile More drawer
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
  const [utilitiesExpanded, setUtilitiesExpanded] = useState<boolean>(() => pathname.startsWith('/offline'))

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const moreItems = NAV_ITEMS
    .filter(item => !PRIMARY_HREFS.has(item.href))
    .filter(item => isNavVisible(item.href, userRole))

  const isMoreActive =
    pathname.startsWith('/offline') ||
    moreItems.some(item => pathname === item.href || pathname.startsWith(item.href))

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl px-4 pt-4 pb-5 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex flex-col items-center pb-2 mb-3 border-b border-slate-100">
              <div className="w-10 h-1 rounded-full bg-slate-300 mb-2" />
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  All Modules &amp; Firm Hub
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Tappable Profile / User Card */}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false)
                setProfileOpen(true)
              }}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 mb-3 text-left transition-colors group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {userName}
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 capitalize">
                    {formatRoleLabel(userRole)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{userEmail || 'Tap to view profile & settings'}</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                Profile
              </span>
            </button>

            {/* Collapsible Accordion Modules with Visual Tree Line (|) */}
            <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1 mb-3 custom-scrollbar">
              {NAV_GROUPS.map(group => {
                const groupItems = group.items
                  .filter(item => !PRIMARY_HREFS.has(item.href))
                  .filter(item => isNavVisible(item.href, userRole))

                if (groupItems.length === 0) return null

                const isExpanded = !!expandedGroups[group.id]
                const hasActiveChild = groupItems.some(item =>
                  item.href === '/ledgers/suppliers'
                    ? pathname.startsWith('/ledgers/suppliers') || pathname.startsWith('/suppliers')
                    : item.href === '/ledgers/ra-bills'
                    ? pathname.startsWith('/ledgers/ra-bills') || pathname.startsWith('/ra-bills')
                    : pathname.startsWith(item.href)
                )

                return (
                  <div key={group.id} className="space-y-1">
                    {/* Collapsible Cluster Heading */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={isExpanded}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border select-none',
                        hasActiveChild
                          ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                          {t(group.i18nKey || '', group.label)}
                        </span>
                        {hasActiveChild && !isExpanded && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                          {groupItems.length}
                        </span>
                        <svg
                          className={cn(
                            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                            isExpanded ? 'rotate-90 text-blue-600' : 'rotate-0'
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

                    {/* Sub-cards Container with Visual Tree Line (|) */}
                    {isExpanded && (
                      <div className="relative ml-4 pl-3 border-l-2 border-slate-300 space-y-1.5 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {groupItems.map(item => {
                          const active = pathname.startsWith(item.href)
                          const isAi = item.href === '/contract-ai'
                          return (
                            <div key={item.href} className="relative flex items-center group">
                              {/* Horizontal tree branch connector |─ */}
                              <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-slate-300 pointer-events-none" />

                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMoreOpen(false)}
                                className={cn(
                                  'w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border shadow-2xs',
                                  active
                                    ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-xs'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                )}
                              >
                                <span className={active ? 'text-white' : isAi ? 'text-blue-600' : 'text-slate-500'}>
                                  {Icons[item.icon as keyof typeof Icons]}
                                </span>
                                <span className="truncate flex-1">
                                  {t((item as any).i18nKey || '', item.label)}
                                </span>
                                {'badge' in item && (item as any).badge && (
                                  <span
                                    className={cn(
                                      'text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0',
                                      active
                                        ? 'bg-white/20 text-white'
                                        : 'bg-blue-100 text-blue-700'
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
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setOwnerExpanded(prev => !prev)}
                    aria-expanded={ownerExpanded}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border select-none',
                      pathname.startsWith('/admin/visitors')
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                        : 'bg-amber-50/50 border-amber-200/80 text-amber-800 hover:bg-amber-100/70'
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                      Platform Owner
                    </span>
                    <svg
                      className={cn(
                        'w-3.5 h-3.5 text-amber-600 transition-transform duration-200',
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
                    <div className="relative ml-4 pl-3 border-l-2 border-amber-300 space-y-1.5 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="relative flex items-center group">
                        <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-amber-300 pointer-events-none" />
                        <Link
                          href="/admin/visitors"
                          onClick={() => setMoreOpen(false)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold bg-white border border-amber-200 text-amber-900 shadow-2xs hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Visitor Telemetry</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            Live
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Utilities & Offline Collapsible */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setUtilitiesExpanded(prev => !prev)}
                  aria-expanded={utilitiesExpanded}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition-all select-none"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                    Utilities &amp; Sync
                  </span>
                  <svg
                    className={cn(
                      'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                      utilitiesExpanded ? 'rotate-90 text-blue-600' : 'rotate-0'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {utilitiesExpanded && (
                  <div className="relative ml-4 pl-3 border-l-2 border-slate-300 space-y-1.5 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="relative flex items-center group">
                      <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-slate-300 pointer-events-none" />
                      <Link
                        href="/offline"
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border shadow-2xs',
                          pathname.startsWith('/offline')
                            ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200/90 text-emerald-800 hover:bg-emerald-50'
                        )}
                      >
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">Offline Hub</span>
                      </Link>
                    </div>

                    <div className="relative flex items-center group">
                      <span className="absolute -left-3 top-1/2 w-2.5 h-px bg-slate-300 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false)
                          setProfileOpen(true)
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 text-left shadow-2xs"
                      >
                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">{t('common.edit', 'Firm & Profile')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="w-full py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-100 mt-auto"
            >
              {t('common.logout', 'Sign out')}
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex md:hidden safe-area-pb shadow-lg">
        {PRIMARY_TABS.map(tab => {
          const active =
            pathname === tab.href ||
            pathname.startsWith(tab.href) ||
            (tab.aliases && tab.aliases.some(a => pathname === a || pathname.startsWith(a)))
          const tabLabel = t(tab.i18nKey, tab.label)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors relative',
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <div className="relative">
                {Icons[tab.icon as keyof typeof Icons]}
              </div>
              <span className="mt-1 truncate max-w-[64px]">{tabLabel}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors relative',
            isMoreActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <span className="mt-1">More</span>
          {isMoreActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </nav>

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
