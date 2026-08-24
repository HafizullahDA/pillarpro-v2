'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './NavLinks'
import { Icons } from './NavIcons'
import { cn } from '@/lib/utils'

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname()

  return (
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
      {/* User */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-slate-300">{userName.slice(0,2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500 capitalize">{userRole.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
