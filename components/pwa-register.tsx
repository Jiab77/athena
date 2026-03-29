'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { useDB } from '@/lib/db-context'

export function PWARegister() {
  const { db, dbReady } = useDB()
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] Service worker registered — scope:', reg.scope))
        .catch((err) => console.error('[PWA] Service worker registration failed:', err))
    } else {
      console.log('[PWA] Service workers not supported in this browser')
    }
  }, [])

  // Read privacyMode from DB — analytics only enabled when Privacy Mode is OFF
  useEffect(() => {
    if (!dbReady || !db) return
    db.getSettings().then((settings) => {
      const privacyMode = settings?.privacyMode ?? true
      console.log('[PWA] Privacy mode:', privacyMode, '— analytics:', !privacyMode ? 'enabled' : 'disabled')
      setAnalyticsEnabled(!privacyMode)
    }).catch((err) => console.error('[PWA] Failed to read privacy mode:', err))
  }, [db, dbReady])

  return analyticsEnabled ? <Analytics /> : null
}
