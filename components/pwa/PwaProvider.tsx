'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { InstallBanner } from './InstallBanner'

interface PwaContextType {
  isStandalone: boolean
  isIOS: boolean
  canInstall: boolean
  triggerInstall: () => void
}

const PwaContext = createContext<PwaContextType>({
  isStandalone: false,
  isIOS: false,
  canInstall: false,
  triggerInstall: () => {},
})

export const usePwa = () => useContext(PwaContext)

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)

  useEffect(() => {
    // 1. Detect Standalone PWA display mode
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isNavigatorStandalone = (window.navigator as any).standalone === true
      setIsStandalone(isDisplayStandalone || isNavigatorStandalone)
    }
    checkStandalone()

    // 2. Detect iOS / iPadOS
    const ua = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(ua)
    setIsIOS(isAppleDevice)

    // 3. Register Service Worker in production or supported browsers
    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for service worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('PillarPro updated in background. Ready for use.')
                }
              }
            }
          }
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })
    }

    if ('serviceWorker' in navigator) {
      if (document.readyState === 'complete') {
        registerServiceWorker()
      } else {
        window.addEventListener('load', registerServiceWorker)
      }
    }

    // 4. Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // 5. Detect when app is successfully installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      console.log('PillarPro PWA was successfully installed!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const triggerInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
    }
  }

  return (
    <PwaContext.Provider
      value={{
        isStandalone,
        isIOS,
        canInstall: !!deferredPrompt || isIOS,
        triggerInstall,
      }}
    >
      {children}
      <InstallBanner
        deferredPrompt={deferredPrompt}
        isIOS={isIOS}
        isStandalone={isStandalone}
      />
    </PwaContext.Provider>
  )
}
