import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabOption<T extends string = string> {
  id: T
  label: string
  icon?: ReactNode
  badge?: ReactNode | number | string
  disabled?: boolean
}

interface StitchTabsProps<T extends string = string> {
  tabs: TabOption<T>[]
  activeTab: T
  onChange: (id: T) => void
  className?: string
  fullWidth?: boolean
}

export function StitchTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  fullWidth = false,
}: StitchTabsProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70',
        fullWidth && 'w-full flex justify-between',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'group relative flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              fullWidth && 'flex-1',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              isActive
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            {tab.icon && (
              <span
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="shrink-0">{tab.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
