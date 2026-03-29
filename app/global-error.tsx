'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Athena] Global error:', error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-500/10 p-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Critical Error</h1>
            <p className="text-zinc-400">
              Athena encountered a critical error and needs to restart.
              Your encrypted data remains safe.
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-500 font-mono mt-4">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 w-full rounded-md bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Restart Athena
          </button>

          <p className="text-xs text-zinc-500">
            If this keeps happening, try clearing your browser data.
          </p>
        </div>
      </body>
    </html>
  )
}
