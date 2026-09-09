'use client'

import { useState } from 'react'
import { UserProfileModal } from './UserProfileModal'
import { Logo } from '@/components/ui/Logo'

export function MobileHeader({
  userName,
  userRole,
  userEmail,
}: {
  userName: string
  userRole: string
  userEmail?: string | null
}) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <Logo theme="dark" href="/dashboard" size="sm" />
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize border border-slate-700">
            {userRole.replace('_', ' ')}
          </span>
        </div>

        {/* Tappable Mobile User Avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          title="Account Settings & Profile"
          aria-label="Open Profile and Account Settings"
        >
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs border border-blue-400/30">
            {userName.slice(0, 2).toUpperCase()}
          </div>
        </button>
      </header>

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

