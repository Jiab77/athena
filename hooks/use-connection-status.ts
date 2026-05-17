'use client'

import { useEffect, useState } from 'react'
import { useDB } from '@/lib/db-context'
import { LLM_PROVIDERS } from '@/lib/constants'
import { isAthenaFreeAvailable } from '@/lib/utils'

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
        //
        // Free Tier is a special case: it has no IndexedDB key (its credentials
        // come from `NEXT_PUBLIC_ATHENA_FREE_KEY`), so `db.checkAPIKey('free')`
        // would always return false and a user with only Free Tier configured
        // would appear offline. Mirror the special-case from
        // `resolveEmotionFallback` in `lib/llm/router.ts` to keep one rule
        // across the codebase.
        const keyChecks = await Promise.all(
          LLM_PROVIDERS.map(provider =>
            provider.id === 'free'
              ? Promise.resolve(isAthenaFreeAvailable())
              : db.checkAPIKey(provider.id)
          )
        )
        const hasAnyKey = keyChecks.some(Boolean)
        const online = !!settings && hasAnyKey

        console.log('[v0] useConnectionStatus.checkStatus:', {
          hasSettings: !!settings,
          providers: LLM_PROVIDERS.map((p, i) => ({ id: p.id, hasKey: keyChecks[i] })),
          hasAnyKey,
          isOnline: online,
        })

        setIsOnline(online)
      } catch (error) {
        console.log('[v0] useConnectionStatus.checkStatus: error, marking offline', error)
        setIsOnline(false)
      }
    }

    checkStatus()
  }, [db, dbReady, refreshTrigger])

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  return { isOnline, refresh }
}
