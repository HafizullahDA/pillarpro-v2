'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './NavLinks'
import { Icons } from './NavIcons'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '@/lib/utils'

export function IconRail({ userName, userRole = 'Owner' }: { userName: string; userRole?: string }) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <aside className="hidden md:flex lg:hidden flex-col w-16 min-h-screen bg-slate-900 shrink-0 items-center py-4 gap-1">
        {/* Logo */}
        <div className="mb-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        </div>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
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
        {/* User avatar at bottom */}
        <div className="mt-auto">
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
      />
    </>
  )
}
