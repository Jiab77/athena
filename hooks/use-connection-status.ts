'use client'

import { useEffect, useState } from 'react'
import { useDB } from '@/lib/db-context'

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { db, dbReady } = useDB()

  useEffect(() => {
    if (!dbReady || !db) return

    const checkStatus = async () => {
      try {
        const settings = await db.getSettings()
        const apiKey = await db.getAPIKey('groq') || await db.getAPIKey('openai') || await db.getAPIKey('biollm')

        // Online only if settings exist AND API key is configured
        const result = !!settings && !!apiKey
        setIsOnline(result)
      } catch {
        setIsOnline(false)
      }
    }

    checkStatus()
  }, [db, dbReady, refreshTrigger])

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  return { isOnline, refresh }
}
