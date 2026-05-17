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

        // Online when at least one provider has a usable credential. Derived
        // from `LLM_PROVIDERS` so future providers are picked up automatically
        // — see lib/constants.ts.
        //
        // Free Tier is a special case: it has no IndexedDB key (its credentials
        // come from `NEXT_PUBLIC_ATHENA_FREE_KEY`), so `db.checkAPIKey('free')`
        // would always return false and a user with only Free Tier configured
        // would appear offline. Mirror the special-case from
        // `resolveEmotionFallback` in `lib/llm/router.ts` to keep one rule
        // across the codebase.
        //
        // Free Tier availability alone is sufficient to mark the system as
        // online — it's a fully working LLM provider baked into the build, so
        // a brand-new visitor with no settings record can still send a message
        // out of the box. Requiring `!!settings` here would falsely report
        // "system offline" on first paint and contradict the Free Tier
        // feature's "Athena works out of the box" promise. User-keyed
        // providers still need a settings record because their credentials
        // live in IndexedDB, which is only populated after onboarding.
        const keyChecks = await Promise.all(
          LLM_PROVIDERS.map(provider =>
            provider.id === 'free'
              ? Promise.resolve(isAthenaFreeAvailable())
              : Promise.resolve(!!settings).then(ok => ok && db.checkAPIKey(provider.id))
          )
        )
        const online = keyChecks.some(Boolean)

        console.log('[v0] useConnectionStatus.checkStatus:', {
          hasSettings: !!settings,
          providers: LLM_PROVIDERS.map((p, i) => ({ id: p.id, hasKey: keyChecks[i] })),
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
