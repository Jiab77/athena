import { FileQuestion, Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0.08 0 0)', color: 'oklch(0.9 0 0)' }}
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full p-4" style={{ backgroundColor: 'oklch(0.15 0 0)' }}>
            <FileQuestion className="h-12 w-12" style={{ color: 'oklch(0.5 0 0)' }} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p style={{ color: 'oklch(0.6 0 0)' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: 'oklch(0.65 0.22 280)', color: 'white' }}
        >
          <Home className="h-4 w-4" />
          Return to Athena
        </Link>
      </div>
    </div>
  )
}
