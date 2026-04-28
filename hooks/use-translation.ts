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
import type { StoredSettings } from '@/lib/types'

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
   * Updates state synchronously for instant UI feedback, then persists
   * to IndexedDB and broadcasts the change to all other hook consumers.
   */
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      // Always update local state synchronously so the controlled <Select>
      // reflects the user's choice immediately, regardless of persistence.
      setLocaleState(newLocale)

      // Broadcast to all other hook consumers so the entire UI re-renders.
      window.dispatchEvent(
        new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: newLocale })
      )

      if (!db || !dbReady) return

      try {
        const current = await db.getSettings()
        // If no settings record exists yet (fresh user), create a minimal one
        // so the locale preference survives the next reload.
        const next: StoredSettings = current
          ? { ...current, locale: newLocale, updatedAt: new Date().toISOString() }
          : {
              key: 'userSettings',
              locale: newLocale,
              updatedAt: new Date().toISOString(),
            } as StoredSettings

        await db.storeSettings(next)
      } catch {
        // Persistence failed — state is already updated locally for this session.
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
