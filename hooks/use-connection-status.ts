'use client'

import { useEffect, useState } from 'react'
import { useDB } from '@/lib/db-context'
import { LLM_PROVIDERS } from '@/lib/constants'

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { db, dbReady } = useDB()

  useEffect(() => {
    if (!dbReady || !db) return

    const checkStatus = async () => {
      try {
        const settings = await db.getSettings()

        // Online if settings exist AND at least one configured provider has an
        // API key. Derive the list from `LLM_PROVIDERS` so future providers are
        // picked up automatically — see lib/constants.ts.
        const keyChecks = await Promise.all(
          LLM_PROVIDERS.map(provider => db.checkAPIKey(provider.id))
        )
        const hasAnyKey = keyChecks.some(Boolean)

        setIsOnline(!!settings && hasAnyKey)
      } catch {
        setIsOnline(false)
      }
    }

    checkStatus()
  }, [db, dbReady, refreshTrigger])

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  return { isOnline, refresh }
}
