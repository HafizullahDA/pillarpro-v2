'use client'

import React, { useRef, useState, useEffect } from 'react'
import { formatDateDDMMYYYY } from '@/lib/format'

export interface DateInputProps {
  label?: string
  value?: string // Expects ISO date format: YYYY-MM-DD
  onChange?: (isoDate: string) => void
  required?: boolean
  disabled?: boolean
  min?: string
  max?: string
  error?: string
  className?: string
  id?: string
}

/**
 * Standard Indian Date Input Component (DD/MM/YYYY)
 *
 * Displays the date in Indian Standard DD/MM/YYYY format across all browsers/locales
 * (preventing US MM/DD/YYYY browser defaults), while reliably outputting standard
 * ISO `YYYY-MM-DD` strings for database storage compatibility.
 */
export function DateInput({
  label,
  value = '',
  onChange,
  required,
  disabled,
  min,
  max,
  error,
  className = '',
  id,
}: DateInputProps) {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null)

  // Track formatted display string
  const [typedText, setTypedText] = useState<string>(() => (value ? formatDateDDMMYYYY(value) : ''))

  useEffect(() => {
    setTypedText(value ? formatDateDDMMYYYY(value) : '')
  }, [value])

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value // 'YYYY-MM-DD'
    onChange?.(iso)
    setTypedText(iso ? formatDateDDMMYYYY(iso) : '')
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setTypedText(text)

    // Parse DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = text.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0')
      const month = dmyMatch[2].padStart(2, '0')
      const year = dmyMatch[3]
      const iso = `${year}-${month}-${day}`
      const testDate = new Date(`${iso}T00:00:00Z`)
      if (!isNaN(testDate.getTime())) {
        onChange?.(iso)
      }
    } else if (!text) {
      onChange?.('')
    }
  }

  const handleOpenPicker = () => {
    if (disabled) return
    if (hiddenDateInputRef.current) {
      if (
        'showPicker' in hiddenDateInputRef.current &&
        typeof (hiddenDateInputRef.current as any).showPicker === 'function'
      ) {
        try {
          ;(hiddenDateInputRef.current as any).showPicker()
          return
        } catch {
          // Fallback to click
        }
      }
      hiddenDateInputRef.current.focus()
      hiddenDateInputRef.current.click()
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal font-mono">DD/MM/YYYY</span>
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={typedText}
          onChange={handleTextChange}
          placeholder="DD/MM/YYYY"
          disabled={disabled}
          required={required}
          className={`w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 ${
            error ? 'border-rose-400 focus:ring-rose-400' : ''
          }`}
        />

        {/* Calendar Picker Trigger Button */}
        <button
          type="button"
          onClick={handleOpenPicker}
          disabled={disabled}
          className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none transition-colors"
          title="Open Calendar (Select Date)"
          aria-label="Open Calendar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>

        {/* Hidden Native Date Input for system picker popover */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={handleNativePickerChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 left-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}

