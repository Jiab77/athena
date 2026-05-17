'use client'

/**
 * Athena Free Tier adapter.
 *
 * Wraps OpenRouter's chat-completions endpoint with a bundled API key
 * (`NEXT_PUBLIC_ATHENA_FREE_KEY`) instead of the per-user key stored in
 * IndexedDB. This is the only adapter that does NOT call `getAPIKey()` — the
 * key is read from `process.env` at runtime, baked into the public bundle by
 * Next.js at build time.
 *
 * Public-key tradeoff (intentional):
 * - The key ships in the JS bundle and is extractable by anyone who opens
 *   devtools. Treat it as public — it's bound to a dedicated OpenRouter
 *   account that holds nothing else.
 * - If abuse exhausts free-tier quota or someone scripts against it, rotate
 *   the key on the dedicated account. No other Athena features or user
 *   accounts are affected.
 *
 * Architecture: structured to mirror `lib/llm/openrouter.ts` line-for-line so
 * the diff is obvious in review. Differences are limited to:
 *   1. `getAthenaFreeKey()` instead of `getAPIKey('openrouter')`
 *   2. Provider id `'free'` when looking up STT / emotion models in the
 *      shared registries
 *   3. Attribution title is bumped to `Athena Free Tier` so OpenRouter's
 *      leaderboard can distinguish bundled-tier traffic from user-keyed
 *      OpenRouter traffic
 */

import type { Message, PersonalityType, GenderType, LLMResponse } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
  EMOTION_PROVIDERS,
} from '../constants'
import { getDB } from '../db'
import { buildSystemPrompt, escapeDocumentContent } from '../utils'

const CHAT_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Attribution title — distinct from OpenRouter's so leaderboards can split traffic. */
const ATTRIBUTION_TITLE = `${DEFAULT_COMPANION_NAME} Free Tier`

/**
 * Resolve the bundled OpenRouter key from the public env var.
 *
 * `NEXT_PUBLIC_ATHENA_FREE_KEY` is inlined at build time, so this is a
 * synchronous lookup — but kept async-shaped for symmetry with `getAPIKey`.
 * Returns the trimmed key. Throws when unset so the router's
 * fallback logic can decide whether to surface "Free Tier unavailable" or
 * silently downgrade.
 */
export function getAthenaFreeKey(): string {
  const key = (process.env.NEXT_PUBLIC_ATHENA_FREE_KEY ?? '').trim()
  if (!key) {
    throw new Error('Athena Free Tier is not configured (NEXT_PUBLIC_ATHENA_FREE_KEY missing)')
  }
  return key
}

/**
 * Whether the Free Tier provider is currently usable. Safe to call from
 * client components — `process.env.NEXT_PUBLIC_*` is available in browser
 * code because Next.js inlines it at build time. Used by the settings panel
 * to hide the Free Tier entry from the picker when the env var is unset.
 */
export function isAthenaFreeAvailable(): boolean {
  return (process.env.NEXT_PUBLIC_ATHENA_FREE_KEY ?? '').trim().length > 0
}

/**
 * Build the optional attribution headers OpenRouter consumes for their public
 * leaderboard. Same shape as the OpenRouter adapter — only the title differs.
 */
function buildAttributionHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  return {
    'HTTP-Referer': window.location.origin,
    'X-OpenRouter-Title': ATTRIBUTION_TITLE,
  }
}

/**
 * Call OpenRouter's chat endpoint via the bundled Free Tier account.
 *
 * Wire shape, message conversion, and response handling are intentionally
 * identical to `callOpenRouterAPI` — only the auth header source changes.
 * Server-tools (`openrouter:web_search`, `openrouter:web_fetch`,
 * `openrouter:image_generation`) are kept enabled; OpenRouter ignores
 * unsupported tools per-model so the same payload works for both Free Tier
 * models even though `Light` is text-only.
 */
export async function callAthenaFreeAPI(messages: Message[]): Promise<LLMResponse> {
  try {
    const apiKey = getAthenaFreeKey()
    const db = await getDB()
    const settings = await db.getSettings()

    if (!settings) {
      throw new Error('No settings found in database')
    }

    const model = settings.selectedModel
    const personality = (settings.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const companion = settings.selectedCompanion || DEFAULT_COMPANION_NAME
    const memoryWindowSize = settings.memoryWindowSize || DEFAULT_MEMORY_SIZE
    const avatarGender = (settings.avatarGender as GenderType) || DEFAULT_GENDER
    const customPersonalityTraits = settings.customPersonalityTraits

    console.log('[v0] callAthenaFreeAPI: settings resolved', { model, personality, companion, memoryWindowSize, avatarGender })

    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits)
    const windowedMessages = messages.slice(-memoryWindowSize)

    const freeMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...windowedMessages.map((msg) => {
        if (msg.imageBase64 && msg.imageFormat) {
          return {
            role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: [
              { type: 'text' as const, text: msg.content },
              {
                type: 'image_url' as const,
                image_url: { url: `data:image/${msg.imageFormat};base64,${msg.imageBase64}` },
              },
            ],
          }
        }
        if (msg.documentContent) {
          const safeContent = escapeDocumentContent(msg.documentContent)
          const docContext = `\n\n---\nAttached Document (${msg.documentName || 'file'}):\n\`\`\`\n${safeContent}\n\`\`\`\n---`
          return {
            role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: msg.content + docContext,
          }
        }
        return {
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }
      }),
    ]

    const reqBody = {
      model,
      messages: freeMessages,
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      tools: [
        { type: 'openrouter:web_search' },
        { type: 'openrouter:web_fetch' },
        { type: 'openrouter:image_generation' },
      ],
    }

    console.log('[v0] callAthenaFreeAPI: request body', {
      ...reqBody,
      messages: reqBody.messages.map((msg) => ({
        ...msg,
        content: Array.isArray(msg.content)
          ? msg.content.map((c) => (c.type === 'image_url' ? { ...c, image_url: { url: '[base64]' } } : c))
          : msg.content,
      })),
    })

    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...buildAttributionHeaders(),
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[v0] callAthenaFreeAPI: HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const status = response.status
      const errorMessage = error.error?.message || error.message || 'Unknown error'
      console.log('[v0] callAthenaFreeAPI: API error response', error)
      throw {
        status,
        message: errorMessage,
        originalError: error,
      }
    }

    const data = await response.json()
    console.log('[v0] callAthenaFreeAPI: response data', data)

    const usage = data.usage || null
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.log('[v0] callAthenaFreeAPI: no content in response')
      throw new Error('No response content from Athena Free Tier')
    }

    console.log('[v0] callAthenaFreeAPI: success', { responseLength: content.length, usage })

    return {
      response: content,
      usage: usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
    }
  } catch (error) {
    console.log('[v0] callAthenaFreeAPI: caught error', error)
    throw error
  }
}

/**
 * Run emotion classification through the bundled Free Tier account.
 *
 * Same wire format as `detectEmotion` in `lib/llm/openrouter.ts`. Model is
 * resolved from `EMOTION_PROVIDERS` keyed on `'free'`, so swapping the model
 * later is a registry edit only — no code change here.
 *
 * Throws on HTTP failures so the router can fall back to another provider's
 * emotion detector via `EMOTION_FALLBACK_CHAIN`.
 */
export async function detectEmotion(systemPrompt: string, userText: string): Promise<string> {
  const apiKey = getAthenaFreeKey()

  const emotionModel = EMOTION_PROVIDERS.find(p => p.id === 'free')?.models[0]?.model
  if (!emotionModel) {
    throw new Error("No emotion-detection model registered for provider 'free'")
  }

  const reqBody = {
    model: emotionModel,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userText },
    ],
    temperature: 0.3,
    max_tokens: 64,
    response_format: { type: 'json_object' as const },
  }

  console.log('[v0] detectEmotion (Free): request', reqBody)

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...buildAttributionHeaders(),
    },
    body: JSON.stringify(reqBody),
  })

  console.log('[v0] detectEmotion (Free): HTTP response', { status: response.status, ok: response.ok })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('[v0] detectEmotion (Free): API error', error)
    throw new Error(error?.error?.message || `Athena Free Tier emotion detection failed: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('[v0] detectEmotion (Free): raw response', data)

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No content in Athena Free Tier emotion detection response')
  }

  return content
}
