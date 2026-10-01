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
  const { t } = useLanguage()

  return (
    <>
      <aside className="hidden md:flex lg:hidden flex-col w-16 min-h-screen bg-slate-900 shrink-0 items-center py-4 gap-1 overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <div className="mb-2">
          <Logo showWordmark={false} href="/dashboard" size="sm" />
        </div>

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
