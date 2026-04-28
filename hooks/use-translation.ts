'use client'

/**
 * React hook for i18n translations
 * 
 * - Loads user's locale from IndexedDB settings on mount
 * - Falls back to browser detection if no preference set
 * - Falls back to English if browser language is unsupported
 * - All consumers re-render when locale changes via the `athena:locale-changed` event
 */

import { useCallback, useEffect, useState } from 'react'
import { useDB } from '@/lib/db-context'
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  getTranslations,
  t as translate,
  type Locale,
} from '@/lib/i18n'

const LOCALE_CHANGE_EVENT = 'athena:locale-changed'

export function useTranslation() {
  const { db, dbReady } = useDB()
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Initial locale load: settings → browser detection → English fallback
  useEffect(() => {
    if (!dbReady || !db) return

    const loadLocale = async () => {
      try {
        const settings = await db.getSettings()
        if (settings?.locale) {
          setLocaleState(settings.locale)
        } else {
          setLocaleState(detectBrowserLocale())
        }
      } catch {
        setLocaleState(detectBrowserLocale())
      }
    }

    loadLocale()
  }, [db, dbReady])

  // Listen for locale changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Locale>).detail
      if (detail) setLocaleState(detail)
    }
    window.addEventListener(LOCALE_CHANGE_EVENT, handler)
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handler)
  }, [])

  /**
   * Update the user's locale preference
   * Persists to IndexedDB and broadcasts the change to all components
   */
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (!db || !dbReady) return

      try {
        const current = await db.getSettings()
        if (!current) return // No settings to update — should not happen in practice
        
        await db.storeSettings({
          ...current,
          locale: newLocale,
          updatedAt: new Date().toISOString(),
        })
        
        // Broadcast to all hook consumers
        window.dispatchEvent(
          new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: newLocale })
        )
      } catch {
        // Persistence failed — keep state local for this session
        setLocaleState(newLocale)
      }
    },
    [db, dbReady]
  )

  // Translation function bound to the current locale
  const dict = getTranslations(locale)
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(dict, key, params),
    [dict]
  )

  return { t, locale, setLocale }
}
