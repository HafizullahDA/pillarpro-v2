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

            {/* Grouped Modules */}
            <div className="space-y-3.5 overflow-y-auto max-h-[50vh] pr-1 mb-3 custom-scrollbar">
              {NAV_GROUPS.map(group => {
                const groupItems = group.items
                  .filter(item => !PRIMARY_HREFS.has(item.href))
                  .filter(item => isNavVisible(item.href, userRole))

                if (groupItems.length === 0) return null

                return (
                  <div key={group.id} className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      {t(group.i18nKey || '', group.label)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupItems.map(item => {
                        const active = pathname.startsWith(item.href)
                        const isAi = item.href === '/contract-ai'
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border',
                              active
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-xs'
                                : 'bg-slate-50/70 border-slate-200/70 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                            )}
                          >
                            <span className={active ? 'text-blue-600' : isAi ? 'text-blue-500' : 'text-slate-500'}>
                              {Icons[item.icon as keyof typeof Icons]}
                            </span>
                            <span className="truncate flex-1">
                              {t((item as any).i18nKey || '', item.label)}
                            </span>
                            {'badge' in item && (item as any).badge && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 shrink-0">
                                {(item as any).badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Platform Owner Telemetry Shortcut */}
              {userEmail?.trim().toLowerCase() === 'pillarprojk@gmail.com' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 px-1">
                    Platform Owner
                  </p>
                  <Link
                    href="/admin/visitors"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs hover:bg-amber-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Visitor Telemetry</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                      Live
                    </span>
                  </Link>
                </div>
              )}

              {/* Utilities & Offline */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                  Utilities &amp; Sync
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/offline"
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border',
                      pathname.startsWith('/offline')
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-xs'
                        : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900',
                    )}
                  >
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">Offline Hub</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      setProfileOpen(true)
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border bg-slate-50/70 border-slate-200/70 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{t('common.edit', 'Firm & Profile')}</span>
                  </button>
                </div>
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
