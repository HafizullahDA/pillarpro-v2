'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { href: '/attendance?quick=1', label: 'Attendance', color: 'bg-emerald-500' },
  { href: '/expenses?quick=1',   label: 'Expense',    color: 'bg-amber-500'   },
  { href: '/vendors?quick=purchase', label: 'Purchase', color: 'bg-sky-500'  },
]

export function FAB() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2 mb-2">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 group"
            >
              <span className="bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                {a.label}
              </span>
              <div className={cn('h-10 w-10 rounded-full shadow-lg flex items-center justify-center text-white', a.color)}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'h-14 w-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-200',
          open ? 'bg-slate-700 rotate-45' : 'bg-blue-600',
        )}
        aria-label="Quick add"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
