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
    icon: '👷‍♂️',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'inventory',
    href: '/ledgers/inventory',
    labelEn: 'Store & Stock',
    labelHi: 'स्टॉक व माल रजिस्टर',
    subLabel: 'Materials & MAS',
    icon: '📦',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'machinery',
    href: '/ledgers/machinery',
    labelEn: 'Machinery & Diesel',
    labelHi: 'मशीनरी व डीजल',
    subLabel: 'Hours & POL Log',
    icon: '🚜',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'suppliers',
    href: '/ledgers/suppliers',
    labelEn: 'Supplier Khata',
    labelHi: 'सप्लायर खाता',
    subLabel: 'Bills & Payables',
    icon: '🏢',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'ra-bills',
    href: '/ledgers/ra-bills',
    labelEn: 'Client & RA Bills',
    labelHi: 'क्लाइंट बिल व क्लेम',
    subLabel: 'Form 43 & Retention',
    icon: '🏛️',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'expenses',
    href: '/ledgers/expenses',
    labelEn: 'Site Cash & Expenses',
    labelHi: 'छिटपुट खर्चा',
    subLabel: 'Petty Cash & Vouchers',
    icon: '🧾',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
] as const

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
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs shrink-0">
                📚
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
        <div className="p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
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
                      : 'bg-white text-slate-700 shadow-2xs border border-slate-200/60 group-hover:scale-110 group-hover:-rotate-3 group-hover:border-blue-200 group-hover:shadow-xs'
                  )}
                >
                  {tab.icon}
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
