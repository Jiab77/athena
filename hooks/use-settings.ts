'use client'

import { useEffect, useState } from 'react'
import { useDB } from '@/lib/db-context'
import type { StoredSettings } from '@/lib/types'

export function useSettings() {
  const [settings, setSettings] = useState<StoredSettings | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { db, dbReady } = useDB()

  useEffect(() => {
    if (!dbReady || !db) return
    
    const loadSettings = async () => {
      try {
        const data = await db.getSettings()
        setSettings(data)
      } catch (error) {
        setSettings(null)
      }
    }
    
    loadSettings()
  }, [db, dbReady, refreshTrigger])

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  return { settings, refresh }
}
