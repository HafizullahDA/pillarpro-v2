'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import en from './locales/en.json'
import hi from './locales/hi.json'

export type Locale = 'en' | 'hi'

type TranslationKey = keyof typeof en

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
}

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  hi,
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
})

const STORAGE_KEY = 'pillarpro_locale'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved && (saved === 'en' || saved === 'hi')) {
        setLocaleState(saved)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
  }

  const t = (key: string, fallback?: string): string => {
    const dict = dictionaries[locale] || dictionaries.en
    return dict[key] || fallback || key
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

