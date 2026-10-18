'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import en from './locales/en.json'
import hi from './locales/hi.json'

export type Locale = 'en' | 'hi'

export type TranslationKey = keyof typeof en

export interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey | (string & {}), fallback?: string) => string
}

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  hi,
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: TranslationKey | (string & {}), fallback?: string) => fallback || key,
})

const STORAGE_KEY = 'pillarpro_locale'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved && (saved === 'en' || saved === 'hi')) {
        setLocaleState(saved)
      } else {
        const match = document.cookie.match(/(?:^|; )pillarpro_locale=([^;]+)/)
        if (match && (match[1] === 'en' || match[1] === 'hi')) {
          setLocaleState(match[1] as Locale)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale)
      } catch {
        // Graceful handling if localStorage is disabled or restricted
      }
      document.cookie = `pillarpro_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey | (string & {}), fallback?: string): string => {
      const dict = dictionaries[locale] || dictionaries.en
      return dict[key] || fallback || key
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
