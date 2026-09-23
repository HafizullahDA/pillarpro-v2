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
    activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/50',
    inactiveClass: 'bg-amber-50/90 text-amber-950 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-2xs',
    iconBgActive: 'bg-amber-400/40 text-slate-950',
    iconBgInactive: 'bg-amber-200/80 text-amber-900',
    subLabelActive: 'text-amber-950 font-medium',
    subLabelInactive: 'text-amber-800/90',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'inventory',
    href: '/ledgers/inventory',
    labelEn: 'Store & Stock',
    labelHi: 'स्टॉक व माल रजिस्टर',
    subLabel: 'Materials & MAS',
    icon: '📦',
    activeClass: 'bg-cyan-600 text-white border-cyan-700 shadow-md ring-2 ring-cyan-400/50',
    inactiveClass: 'bg-cyan-50/90 text-cyan-950 border-cyan-300 hover:bg-cyan-100 hover:border-cyan-400 shadow-2xs',
    iconBgActive: 'bg-cyan-500/40 text-white',
    iconBgInactive: 'bg-cyan-200/80 text-cyan-900',
    subLabelActive: 'text-cyan-100 font-medium',
    subLabelInactive: 'text-cyan-800/90',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'machinery',
    href: '/ledgers/machinery',
    labelEn: 'Machinery & Diesel',
    labelHi: 'मशीनरी व डीजल',
    subLabel: 'Hours & POL Log',
    icon: '🚜',
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/50',
    inactiveClass: 'bg-emerald-50/90 text-emerald-950 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 shadow-2xs',
    iconBgActive: 'bg-emerald-500/40 text-white',
    iconBgInactive: 'bg-emerald-200/80 text-emerald-900',
    subLabelActive: 'text-emerald-100 font-medium',
    subLabelInactive: 'text-emerald-800/90',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer'],
  },
  {
    id: 'suppliers',
    href: '/ledgers/suppliers',
    labelEn: 'Supplier Khata',
    labelHi: 'सप्लायर खाता',
    subLabel: 'Bills & Payables',
    icon: '🏢',
    activeClass: 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/50',
    inactiveClass: 'bg-indigo-50/90 text-indigo-950 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400 shadow-2xs',
    iconBgActive: 'bg-indigo-500/40 text-white',
    iconBgInactive: 'bg-indigo-200/80 text-indigo-900',
    subLabelActive: 'text-indigo-100 font-medium',
    subLabelInactive: 'text-indigo-800/90',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'ra-bills',
    href: '/ledgers/ra-bills',
    labelEn: 'Client & RA Bills',
    labelHi: 'क्लाइंट बिल व क्लेम',
    subLabel: 'Form 43 & Retention',
    icon: '🏛️',
    activeClass: 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/50',
    inactiveClass: 'bg-blue-50/90 text-blue-950 border-blue-300 hover:bg-blue-100 hover:border-blue-400 shadow-2xs',
    iconBgActive: 'bg-blue-500/40 text-white',
    iconBgInactive: 'bg-blue-200/80 text-blue-900',
    subLabelActive: 'text-blue-100 font-medium',
    subLabelInactive: 'text-blue-800/90',
    roles: ['owner', 'partner', 'managing_partner', 'accountant', 'viewer'],
  },
  {
    id: 'expenses',
    href: '/ledgers/expenses',
    labelEn: 'Site Cash & Expenses',
    labelHi: 'छिटपुट खर्चा',
    subLabel: 'Petty Cash & Vouchers',
    icon: '🧾',
    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/50',
    inactiveClass: 'bg-rose-50/90 text-rose-950 border-rose-300 hover:bg-rose-100 hover:border-rose-400 shadow-2xs',
    iconBgActive: 'bg-rose-500/40 text-white',
    iconBgInactive: 'bg-rose-200/80 text-rose-900',
    subLabelActive: 'text-rose-100 font-medium',
    subLabelInactive: 'text-rose-800/90',
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
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
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
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
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

        {/* Horizontal Scrollable Tabs with High-Visibility Colors */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Unified Single-Themed Segmented Tabs (Matches PillarPro Blue/Slate Design System) */}
        <div className="p-1 bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
          {visibleTabs.map(tab => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0',
                  isActive ? tab.activeClass : tab.inactiveClass
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-medium'
                )}
              >
                <span
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-lg text-sm shrink-0 shadow-2xs transition-colors',
                    isActive ? tab.iconBgActive : tab.iconBgInactive
                    'h-6 w-6 flex items-center justify-center rounded-lg text-sm shrink-0 transition-colors',
                    isActive ? 'bg-blue-500/40 text-white' : 'bg-white text-slate-700 shadow-2xs border border-slate-200/60'
                  )}
                >
                  {tab.icon}
                </span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs tracking-tight">
                  <span className={cn('text-xs font-semibold tracking-tight', isActive ? 'text-white' : 'text-slate-800')}>
                  <span className={cn('text-xs tracking-tight', isActive ? 'text-white font-semibold' : 'text-slate-800')}>
                    {locale === 'hi' ? tab.labelHi : tab.labelEn}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] tracking-tight',
                      isActive ? tab.subLabelActive : tab.subLabelInactive
                      'text-[9px] font-normal tracking-tight',
                      isActive ? 'text-blue-100' : 'text-slate-400'
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
