'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavVisible } from './NavLinks'
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

  const visibleNavItems = NAV_ITEMS.filter(item => isNavVisible(item.href, userRole))

  return (
    <>
      <aside className="hidden md:flex lg:hidden flex-col w-16 min-h-screen bg-slate-900 shrink-0 items-center py-4 gap-1">
        {/* Logo */}
        <div className="mb-3">
          <Logo showWordmark={false} href="/dashboard" size="sm" />
        </div>
        {visibleNavItems.map(item => {
          const active = pathname.startsWith(item.href)
          const title = t((item as any).i18nKey || '', item.label)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={title}
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-xl transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-white',
              )}
            >
              {Icons[item.icon as keyof typeof Icons]}
            </Link>
          )
        })}
        {/* User avatar and platform owner telemetry at bottom */}
        <div className="mt-auto flex flex-col items-center gap-2">
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
            <span className="text-xs font-semibold">{userName.slice(0,2).toUpperCase()}</span>
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
