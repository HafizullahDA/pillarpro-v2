'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icons } from './NavIcons'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const PRIMARY_TABS = [
  { href: '/dashboard',  label: 'Home',       icon: 'dashboard'  },
  { href: '/projects',   label: 'Projects',   icon: 'projects'   },
  { href: '/attendance', label: 'Attendance', icon: 'attendance' },
  { href: '/expenses',   label: 'Expenses',   icon: 'expenses'   },
]

const MORE_ITEMS = [
  { href: '/vendors',     label: 'Vendors',     icon: 'vendors'     },
  { href: '/receivables', label: 'Receivables', icon: 'receivables' },
  { href: '/partners',    label: 'Partners',    icon: 'partners'    },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl px-4 py-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-3 mb-4">
              {MORE_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium',
                    pathname.startsWith(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className={pathname.startsWith(item.href) ? 'text-blue-600' : 'text-slate-500'}>
                    {Icons[item.icon as keyof typeof Icons]}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              onClick={signOut}
              className="w-full py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex md:hidden safe-area-pb">
        {PRIMARY_TABS.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 text-xs font-medium transition-colors',
                active ? 'text-blue-600' : 'text-slate-500',
              )}
            >
              <span className={active ? 'text-blue-600' : 'text-slate-400'}>
                {Icons[tab.icon as keyof typeof Icons]}
              </span>
              {tab.label}
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 text-xs font-medium transition-colors',
            moreOpen ? 'text-blue-600' : 'text-slate-500',
          )}
        >
          <span className={moreOpen ? 'text-blue-600' : 'text-slate-400'}>{Icons.more}</span>
          More
        </button>
      </nav>
    </>
  )
}
