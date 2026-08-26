'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Error Boundary:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-5">
        A temporary network or rendering issue occurred. Click below to refresh.
      </p>
      <Button onClick={reset} size="md">
        Try Again
      </Button>
    </div>
  )
}
