'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Athena] Application error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0.08 0 0)', color: 'oklch(0.9 0 0)' }}
    >
      <div className="max-w-md w-full space-y-6">
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: 'oklch(0.5 0.2 25)', backgroundColor: 'oklch(0.15 0.05 25)' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: 'oklch(0.65 0.25 25)' }} />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="text-sm" style={{ color: 'oklch(0.7 0 0)' }}>
                Athena encountered an unexpected error. Your data is safe and encrypted locally.
              </p>
              {error.digest && (
                <p className="text-xs font-mono" style={{ color: 'oklch(0.5 0 0)' }}>
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'oklch(0.65 0.22 280)', color: 'white' }}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            style={{ borderColor: 'oklch(0.3 0 0)', backgroundColor: 'transparent', color: 'oklch(0.9 0 0)' }}
          >
            <Home className="h-4 w-4" />
            Return home
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'oklch(0.5 0 0)' }}>
          If this problem persists, try clearing your browser cache or contact support.
        </p>
      </div>
    </div>
  )
}
