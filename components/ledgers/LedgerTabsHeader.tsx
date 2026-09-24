'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface LedgerTabsHeaderProps {
  userRole?: string
}

export const LEDGER_TABS = [
  {
    id: 'attendance',
    href: '/ledgers/attendance',
    labelEn: 'Labour & Wages',
    labelHi: 'मस्टरोल व मजदूरी',
    subLabel: 'Muster Roll & OT',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'inventory',
    href: '/ledgers/inventory',
    labelEn: 'Store & Stock',
    labelHi: 'स्टॉक व माल रजिस्टर',
    subLabel: 'Materials & MAS',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'machinery',
    href: '/ledgers/machinery',
    labelEn: 'Machinery & Diesel',
    labelHi: 'मशीनरी व डीजल',
    subLabel: 'Hours & POL Log',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'suppliers',
    href: '/ledgers/suppliers',
    labelEn: 'Supplier Khata',
    labelHi: 'सप्लायर खाता',
    subLabel: 'Bills & Payables',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'ra-bills',
    href: '/ledgers/ra-bills',
    labelEn: 'Client & RA Bills',
    labelHi: 'क्लाइंट बिल व क्लेम',
    subLabel: 'Form 43 & Retention',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'expenses',
    href: '/ledgers/expenses',
    labelEn: 'Site Cash & Expenses',
    labelHi: 'छिटपुट खर्चा',
    subLabel: 'Petty Cash & Vouchers',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
] as const

function getTabIcon(id: string) {
  switch (id) {
    case 'attendance':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case 'inventory':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    case 'machinery':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      )
    case 'suppliers':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'ra-bills':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'expenses':
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
  }
}

export function LedgerTabsHeader({ userRole = 'owner' }: LedgerTabsHeaderProps) {
  const pathname = usePathname()
  const { locale } = useLanguage()

  const normalizedRole = userRole?.toLowerCase().trim() || 'owner'
  const visibleTabs = LEDGER_TABS.filter(
    tab => (tab.roles as readonly string[]).includes(normalizedRole) || normalizedRole === 'owner' || !userRole
  )

  return (
    <div className="bg-white border-b border-slate-200 md:sticky md:top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2 sm:pt-3.5 sm:pb-2.5 space-y-2 sm:space-y-2.5">
        {/* Hub Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {locale === 'hi' ? 'प्रोजेक्ट लेजर व खाते' : 'Project Ledgers'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                6-in-1 Books
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
              {locale === 'hi'
                ? 'साइट खाते: मजदूरी, माल स्टॉक, मशीनरी व ईंधन, सप्लायर बिल, क्लाइंट क्लेम एवं छिटपुट खर्चा'
                : 'Primary site registers: Labour, Store inventory, Machinery & diesel, Supplier khata, RA bills, and Petty cash.'}
            </p>
          </div>
        </div>

        {/* Unified Single-Themed Segmented Tabs (Matches PillarPro Blue/Slate Design System) */}
        <div className="p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full touch-pan-x overscroll-contain">
          {visibleTabs.map(tab => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 ease-out shrink-0 select-none cursor-pointer',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 hover:bg-blue-500 active:translate-y-0 active:scale-[0.98]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:-translate-y-0.5 hover:shadow-xs hover:border-slate-200/90 border border-transparent font-medium active:translate-y-0 active:scale-[0.98]'
                )}
              >
                <span
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-lg text-sm shrink-0 transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-blue-500/40 text-white group-hover:scale-110'
                      : 'bg-white text-slate-700 shadow-2xs border border-slate-200/60 group-hover:scale-110 group-hover:border-blue-200 group-hover:shadow-xs'
                  )}
                >
                  {getTabIcon(tab.id)}
                </span>
                <div className="flex flex-col items-start leading-tight">
                  <span
                    className={cn(
                      'text-xs tracking-tight transition-colors duration-150',
                      isActive ? 'text-white font-semibold' : 'text-slate-800 group-hover:text-blue-700 font-medium'
                    )}
                  >
                    {locale === 'hi' ? tab.labelHi : tab.labelEn}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-normal tracking-tight transition-colors duration-150',
                      isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  >
                    {tab.subLabel}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
