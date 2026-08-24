'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Drawer({ open, onClose, title, children, footer, size = 'md' }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizeClasses = {
    sm: 'lg:max-w-sm',
    md: 'lg:max-w-md',
    lg: 'lg:max-w-lg',
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel: bottom sheet on mobile, right panel on desktop */}
      <div className={cn(
        'absolute bg-white shadow-2xl flex flex-col',
        // Mobile/tablet: full-width bottom sheet
        'bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]',
        // Desktop: right panel
        'lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:rounded-none lg:max-h-full lg:h-full lg:w-full',
        sizeClasses,
      )}>
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
