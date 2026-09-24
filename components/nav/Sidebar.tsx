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
  const { locale, setLocale, t } = useLanguage()

  const visibleNavItems = NAV_ITEMS.filter(item => isNavVisible(item.href, userRole))

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-900 text-white shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <Logo theme="dark" href="/dashboard" size="md" />
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleNavItems.map(item => {
            const active = pathname.startsWith(item.href)
            const label = t((item as any).i18nKey || '', item.label)
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
                {label}
              </Link>
            )
          })}
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
