'use client'

import { useState, useEffect } from 'react'

interface InstallBannerProps {
  deferredPrompt: any
  isIOS: boolean
  isStandalone: boolean
}

const STORAGE_KEY_DISMISSED = 'pillarpro_pwa_install_dismissed'

export function InstallBanner({ deferredPrompt, isIOS, isStandalone }: InstallBannerProps) {
  const [dismissed, setDismissed] = useState(true)
  const [showIosModal, setShowIosModal] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // If running inside standalone PWA already, never show install banner
    if (isStandalone) {
      return
    }

    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true'
      if (!isDismissed) {
        // Show after a gentle 3-second delay so it doesn't collide with initial page load
        const timer = setTimeout(() => {
          setDismissed(false)
        }, 3000)
        return () => clearTimeout(timer)
      }
    } catch {
      // Ignore localStorage errors
    }

    const handleManualShow = () => {
      if (isIOS) {
        setShowIosModal(true)
      } else {
        setDismissed(false)
        if (deferredPrompt) {
          deferredPrompt.prompt()
        }
      }
    }

    window.addEventListener('pillarpro-show-install', handleManualShow)
    return () => {
      window.removeEventListener('pillarpro-show-install', handleManualShow)
    }
  }, [isStandalone, isIOS, deferredPrompt])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    } catch {
      // Ignore
    }
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true)
      try {
        deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === 'accepted') {
          setDismissed(true)
        }
      } catch (err) {
        console.error('Install prompt error:', err)
      } finally {
        setInstalling(false)
      }
    } else if (isIOS) {
      setShowIosModal(true)
    }
  }

  // If already installed, dismissed, or neither Android prompt nor iOS is active, hide
  if (isStandalone || dismissed || (!deferredPrompt && !isIOS)) {
    return (
      <>
        {/* iOS Step-by-Step Instructions Modal (Can be triggered manually) */}
        {showIosModal && (
          <IosInstallModal onClose={() => setShowIosModal(false)} />
        )}
      </>
    )
  }

  return (
    <>
      {/* Non-intrusive Floating App Install Banner */}
      <div className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-50 sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-2xl border border-blue-500/30 bg-slate-950/95 text-white p-3.5 sm:p-4 shadow-2xl shadow-blue-950/50 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 64 64" fill="currentColor">
                <path d="M12 10h11v42H12z M27 10h15c9.39 0 17 7.61 17 17s-7.61 17-17 17H27V10zm0 10v14h13c3.87 0 7-3.13 7-7s-3.13-7-7-7H27z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-white truncate">Install PillarPro App</p>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {isIOS ? 'Add to Home Screen for standalone mode' : 'Fast site access & standalone mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Modal */}
      {showIosModal && (
        <IosInstallModal onClose={() => setShowIosModal(false)} />
      )}
    </>
  )
}

function IosInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 text-white p-5 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              P
            </div>
            <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="py-4 space-y-3.5 text-xs text-slate-300">
          <p className="text-slate-400 leading-relaxed">
            Install PillarPro directly to your iPhone Home Screen without the App Store:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="h-6 w-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <p className="leading-snug">
                Tap the <strong className="text-white">Share</strong> icon{' '}
                <span className="inline-block px-1 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-[11px]">
                  Share [↑]
                </span>{' '}
                at the bottom of your Safari browser bar.
              </p>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="h-6 w-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <p className="leading-snug">
                Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong>{' '}
                <span className="text-slate-400 font-semibold">[+]</span>.
              </p>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="h-6 w-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <p className="leading-snug">
                Tap <strong className="text-white">&quot;Add&quot;</strong> in the top right corner. PillarPro will now appear as an app on your Home Screen!
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-xs font-bold text-white transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
