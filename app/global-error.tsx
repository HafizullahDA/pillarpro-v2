'use client'

import { useEffect } from 'react'
import { captureFormError } from '@/lib/monitoring'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureFormError('RootGlobalCrash', error, { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">
            System Error
          </h1>

          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            A critical application error occurred while loading the workspace. The technical team has been notified.
          </p>

          <div className="flex flex-col sm:flex-row w-full gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xs"
            >
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className="flex-1 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xs"
            >
              Go to Dashboard
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 w-full">
            <span className="text-xs text-slate-400">PillarPro ERP</span>
          </div>
        </div>
      </body>
    </html>
  )
}
