'use client'

import { ReactNode } from 'react'
import { DBProvider } from '@/lib/db-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DBProvider>
      {children}
    </DBProvider>
  )
}
