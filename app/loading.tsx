import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'oklch(0.08 0 0)', color: 'oklch(0.65 0.15 180)' }}
    >
      <Spinner className="h-8 w-8" style={{ color: 'oklch(0.65 0.22 280)' }} />
      <p className="text-sm">Loading Athena...</p>
    </div>
  )
}
