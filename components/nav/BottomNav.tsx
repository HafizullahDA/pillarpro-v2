'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { NAV_ITEMS } from './NavLinks'
import { Icons } from './NavIcons'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const PRIMARY_TABS = [
  { href: '/dashboard',  label: 'Home',       icon: 'dashboard'  },
  { href: '/projects',   label: 'Projects',   icon: 'projects'   },
  { href: '/attendance', label: 'Attendance', icon: 'attendance' },
  { href: '/expenses',   label: 'Expenses',   icon: 'expenses'   },
]

// All other NAV_ITEMS appear in the "More" drawer on mobile
const PRIMARY_HREFS = new Set(PRIMARY_TABS.map(t => t.href))
const MORE_ITEMS = NAV_ITEMS.filter(item => !PRIMARY_HREFS.has(item.href))

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ITEMS.some(item => pathname.startsWith(item.href))

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
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl px-4 pt-4 pb-5 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex flex-col items-center pb-2 mb-3 border-b border-slate-100">
              <div className="w-10 h-1 rounded-full bg-slate-300 mb-2" />
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  All Modules & Navigation
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Grid of Navigation Items */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto mb-4 p-0.5">
              {MORE_ITEMS.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all text-center border',
                      active
                        ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/70 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <span className={active ? 'text-blue-600' : 'text-slate-500'}>
                      {Icons[item.icon as keyof typeof Icons]}
                    </span>
                    <span className="truncate max-w-full">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="w-full py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-100 mt-auto"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex md:hidden safe-area-pb shadow-lg">
        {PRIMARY_TABS.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 text-xs font-medium transition-colors',
                active ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <span className={active ? 'text-blue-600' : 'text-slate-400'}>
                {Icons[tab.icon as keyof typeof Icons]}
              </span>
              {tab.label}
            </Link>
          )
        })}

        {/* More Tab */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 text-xs font-medium transition-colors',
            moreOpen || isMoreActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700',
          )}
          aria-label="More navigation options"
        >
          <span className={moreOpen || isMoreActive ? 'text-blue-600' : 'text-slate-400'}>
            {Icons.more}
          </span>
          More
        </button>
      </nav>
    </>
  )
}

