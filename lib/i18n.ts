/**
 * i18n core — simple JSON-based translation system
 *
 * - Locale files live in /i18n/{locale}.json
 * - User preference persisted in IndexedDB settings (key: `locale`)
 * - On first load, browser language is detected and mapped to nearest supported locale
 * - Falls back to English on any mismatch or load failure
 *
 * The locale list, native labels and dictionaries themselves live in
 * `@/lib/constants`; the matching `Locale` and `TranslationDict` types live
 * in `@/lib/types`. This file only owns the runtime helpers (detection,
 * resolution, interpolation, gender variants).
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './constants'
import type { Locale, TranslationDict } from './types'

/**
 * Translation files
 */
import en from '@/i18n/en.json'
import fr from '@/i18n/fr.json'
import de from '@/i18n/de.json'
import it from '@/i18n/it.json'

/**
 * Translation definitions
 */
export const TRANSLATIONS = { en, fr, de, it } as const

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
 * Falls back to English if the locale is invalid.
 *
 * The cast is intentional: gendered locales (fr/de/it) use the object form
 * `{ default: "...", m: "..." }` for a handful of keys where English keeps
 * a plain string. Their inferred shapes diverge from `typeof en`, but `t()`
 * walks the tree generically and resolves both forms, so the runtime is safe.
 */
export function getTranslations(locale: Locale): TranslationDict {
  return (TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE]) as TranslationDict
}

/**
 * Translation helper — supports nested keys via dot notation
 * Example: t(dict, 'fab.install') → "Install App"
 *
 * Supports {placeholder} interpolation:
 * Example: t(dict, 'greeting', { name: 'Athena' })
 *
 * Supports gender-aware variants for languages where a noun changes form
 * with the referent's gender (e.g. fr "Compagne"/"Compagnon"). When the
 * resolved leaf is an object instead of a string, the function picks
 * `obj[gender]` if present (with `gender` lowercased to 'f' or 'm'), and
 * otherwise falls back to `obj.default`. Locale files that don't need
 * variants for a key keep using a plain string — both shapes coexist.
 *
 * Example JSON:
 *   "companion": { "default": "Compagne", "m": "Compagnon" }
 */
export function t(
  dict: TranslationDict,
  key: string,
  params?: Record<string, string | number>,
  gender?: 'F' | 'M'
): string {
  // Walk the dot-separated path
  const value = key.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, dict)

  // Resolve the leaf into a final string:
  // - Plain string: return as-is (existing behaviour, used by every
  //   gender-neutral key including the entirety of English).
  // - Object: treat as a gender-variant map. Pick the user's gender
  //   variant when present, otherwise fall back to `default`.
  let resolved: string | undefined
  if (typeof value === 'string') {
    resolved = value
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const genderKey = gender?.toLowerCase()
    if (genderKey && typeof obj[genderKey] === 'string') {
      resolved = obj[genderKey] as string
    } else if (typeof obj.default === 'string') {
      resolved = obj.default as string
    }
  }

  // Missing key — return the key itself for visibility
  if (resolved === undefined) return key

  // No params — return as-is
  if (!params) return resolved

  // Interpolate {placeholder} patterns
  return resolved.replace(/\{(\w+)\}/g, (_, placeholder) => {
    const replacement = params[placeholder]
    return replacement !== undefined ? String(replacement) : `{${placeholder}}`
  })
}
