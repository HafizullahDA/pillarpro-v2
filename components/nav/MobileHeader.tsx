'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatRoleLabel } from '@/lib/permissions'
import { UserProfileModal } from './UserProfileModal'
import { Logo } from '@/components/ui/Logo'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { locale, setLocale } = useLanguage()

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <Logo theme="dark" href="/dashboard" size="sm" />
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize border border-slate-700">
            {formatRoleLabel(userRole)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Telemetry Button for Platform Owner on Mobile */}
          {userEmail?.trim().toLowerCase() === 'pillarprojk@gmail.com' && (
            <Link
              href="/admin/visitors"
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors flex items-center justify-center"
              title="Visitor Telemetry (Owner)"
              aria-label="Visitor Telemetry"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
          )}

          {/* Quick Language Switcher Button for Foremen on mobile */}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Switch Language / भाषा बदलें"
          >
            {locale === 'en' ? 'हिन्दी' : 'EN'}
          </button>

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
        </div>
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

