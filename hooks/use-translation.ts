'use client'

/**
 * React hook for i18n translations
 * 
 * - Loads user's locale from IndexedDB settings on mount
 * - Falls back to browser detection if no preference set
 * - Falls back to English if browser language is unsupported
 * - All consumers re-render when locale changes via the `athena:locale-changed` event
 * - Gender-aware translations follow the same pattern via `athena:gender-changed`,
 *   so gendered nouns ("Compagne"/"Compagnon", "Begleiterin"/"Begleiter", etc.)
 *   reflect the active companion's gender from settings.
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
import { DEFAULT_GENDER } from '@/lib/constants'
import type { GenderType, StoredSettings } from '@/lib/types'

const LOCALE_CHANGE_EVENT = 'athena:locale-changed'
const GENDER_CHANGE_EVENT = 'athena:gender-changed'

export function useTranslation() {
  const { db, dbReady } = useDB()
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [gender, setGenderState] = useState<GenderType>(DEFAULT_GENDER)

  // Initial locale & gender load: settings → defaults
  useEffect(() => {
    if (!dbReady || !db) return

    const loadSettings = async () => {
      try {
        const settings = await db.getSettings()
        if (settings?.locale) {
          setLocaleState(settings.locale)
        } else {
          setLocaleState(detectBrowserLocale())
        }
        if (settings?.avatarGender) {
          setGenderState(settings.avatarGender)
        }
      } catch {
        setLocaleState(detectBrowserLocale())
      }
    }

    loadSettings()
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

  // Listen for gender changes from the settings panel save flow
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GenderType>).detail
      if (detail) setGenderState(detail)
    }
    window.addEventListener(GENDER_CHANGE_EVENT, handler)
    return () => window.removeEventListener(GENDER_CHANGE_EVENT, handler)
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

  // Translation function bound to the current locale & gender
  const dict = getTranslations(locale)
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(dict, key, params, gender),
    [dict, gender]
  )

  return { t, locale, setLocale, gender }
}
