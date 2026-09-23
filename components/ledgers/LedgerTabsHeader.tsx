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
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3.5 pb-2.5 space-y-2.5">
        {/* Hub Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                📚
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {locale === 'hi' ? 'प्रोजेक्ट लेजर व खाते' : 'Project Ledgers'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                6-in-1 Books
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {locale === 'hi'
                ? 'साइट खाते: मजदूरी, माल स्टॉक, मशीनरी व ईंधन, सप्लायर बिल, क्लाइंट क्लेम एवं छिटपुट खर्चा'
                : 'Primary site registers: Labour, Store inventory, Machinery & diesel, Supplier khata, RA bills, and Petty cash.'}
            </p>
          </div>
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {visibleTabs.map(tab => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span className="text-sm">{tab.icon}</span>
                <div className="flex flex-col items-start leading-tight">
                  <span>{locale === 'hi' ? tab.labelHi : tab.labelEn}</span>
                  <span
                    className={cn(
                      'text-[9px] font-normal',
                      isActive ? 'text-slate-300' : 'text-slate-400'
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

