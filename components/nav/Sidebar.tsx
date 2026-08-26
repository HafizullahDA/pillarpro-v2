'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './NavLinks'
import { Icons } from './NavIcons'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '@/lib/utils'

export function Sidebar({
  userName,
  userRole,
  userEmail,
}: {
  userName: string
  userRole: string
  userEmail?: string | null
}) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-900 text-white shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight">PillarPro</span>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )}
              >
                <span className={active ? 'text-white' : 'text-slate-500'}>
                  {Icons[item.icon as keyof typeof Icons]}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        {/* User - Clickable Profile Button */}
        <div className="px-3 py-3 border-t border-slate-800">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-semibold text-xs shadow-sm">
              {userName.slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole.replace('_', ' ')}</p>
            </div>
            <svg className="h-4 w-4 text-slate-500 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
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
