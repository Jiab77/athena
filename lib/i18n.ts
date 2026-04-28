/**
 * i18n core — simple JSON-based translation system
 * 
 * - Locale files live in /i18n/{locale}.json
 * - User preference persisted in IndexedDB settings (key: `locale`)
 * - On first load, browser language is detected and mapped to nearest supported locale
 * - Falls back to English on any mismatch or load failure
 */

import en from '@/i18n/en.json'
import fr from '@/i18n/fr.json'
import de from '@/i18n/de.json'
import it from '@/i18n/it.json'

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'it'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

/**
 * Native language labels — always shown in the language's own script
 * so users always recognise their language regardless of the active UI locale.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

const TRANSLATIONS = { en, fr, de, it } as const

/**
 * Translation dictionary type — derived from the English file
 * which serves as the canonical schema. Other locales must match
 * this shape.
 */
export type TranslationDict = typeof en

/**
 * Detect browser language and map to the nearest supported locale
 * Examples: `fr-FR` → `fr`, `en-US` → `en`, `pt-BR` → `en` (fallback)
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  
  const browserLang = navigator.language.toLowerCase().split('-')[0]
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale
  }
  return DEFAULT_LOCALE
}

/**
 * Get the translation dictionary for a given locale
 * Falls back to English if the locale is invalid
 */
export function getTranslations(locale: Locale): TranslationDict {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE]
}

/**
 * Translation helper — supports nested keys via dot notation
 * Example: t(dict, 'fab.install') → "Install App"
 * 
 * Supports {placeholder} interpolation:
 * Example: t(dict, 'greeting', { name: 'Athena' })
 */
export function t(
  dict: TranslationDict,
  key: string,
  params?: Record<string, string | number>
): string {
  // Walk the dot-separated path
  const value = key.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, dict)
  
  // Missing key — return the key itself for visibility
  if (typeof value !== 'string') return key
  
  // No params — return as-is
  if (!params) return value
  
  // Interpolate {placeholder} patterns
  return value.replace(/\{(\w+)\}/g, (_, placeholder) => {
    const replacement = params[placeholder]
    return replacement !== undefined ? String(replacement) : `{${placeholder}}`
  })
}
