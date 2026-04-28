'use client'

import type { Message, PersonalityType, GenderType, LLMResponse } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
} from '../constants'
import { getDB } from '../db'
import { parseCompanionJSON, buildSystemPrompt, escapeDocumentContent, getAPIKey } from '../utils'

const CHAT_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Static site title sent in the optional X-OpenRouter-Title header for OpenRouter's attribution leaderboard. */
const ATTRIBUTION_TITLE = DEFAULT_COMPANION_NAME

/**
 * Build the optional attribution headers OpenRouter consumes for their public
 * leaderboard. Both headers are documented as optional — we send them only
 * when running in the browser so that the referer reflects the real origin.
 * https://openrouter.ai/docs/quick-start
 */
function buildAttributionHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  return {
    'HTTP-Referer': window.location.origin,
    'X-OpenRouter-Title': ATTRIBUTION_TITLE,
  }
}

/**
 * Call OpenRouter API with conversation history using fetch.
 *
 * OpenRouter is a thin OpenAI-compatible Chat Completions gateway in front of
 * many model providers (OpenAI, Anthropic, Google, Meta, etc.). The wire
 * format mirrors the Groq adapter — same JSON mode, same vision content
 * shape, same document injection — so we can reuse the existing companion
 * JSON contract without any transport-level surprises.
 *
 * Automatically retrieves API key, model, personality, and companion from database.
 */
export async function callOpenRouterAPI(
  messages: Message[]
): Promise<LLMResponse> {
  try {
    const apiKey = await getAPIKey('openrouter')
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

    console.log('[Athena] callOpenRouterAPI: settings resolved', { model, personality, companion, memoryWindowSize, avatarGender })

    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits, true)

    const windowedMessages = messages.slice(-memoryWindowSize)

    // Detect if any message contains an actual image (base64 encoded)
    const hasImage = windowedMessages.some(msg =>
      msg.imageBase64 !== undefined && msg.imageBase64 !== null && msg.imageBase64.length > 0
    )

    // Convert messages to OpenAI-compatible Chat Completions format,
    // supporting both text and image content (vision-capable models only)
    const openrouterMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...windowedMessages.map((msg) => {
        // Vision content: array with text + image_url
        if (msg.imageBase64 && msg.imageFormat) {
          return {
            role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: [
              {
                type: 'text' as const,
                text: msg.content,
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: `data:image/${msg.imageFormat};base64,${msg.imageBase64}`,
                },
              },
            ],
          }
        }

        // Document context: inline-injected so any model (vision or not) sees it
        if (msg.documentContent) {
          const safeContent = escapeDocumentContent(msg.documentContent)
          const docContext = `\n\n---\nAttached Document (${msg.documentName || 'file'}):\n\`\`\`\n${safeContent}\n\`\`\`\n---`
          return {
            role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: msg.content + docContext,
          }
        }

        // Plain text
        return {
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }
      }),
    ]

    const reqBody: any = {
      model,
      messages: openrouterMessages,
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      response_format: { type: 'json_object' },
    }

    console.log('[Athena] callOpenRouterAPI: request body', {
      ...reqBody,
      messages: reqBody.messages.map((msg: any) => ({
        ...msg,
        content: Array.isArray(msg.content)
          ? msg.content.map((c: any) => c.type === 'image_url' ? { ...c, image_url: { url: '[base64]' } } : c)
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

    console.log('[Athena] callOpenRouterAPI: HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const status = response.status
      const errorMessage = error.error?.message || error.message || 'Unknown error'
      console.log('[Athena] callOpenRouterAPI: API error response', error)
      throw {
        status,
        message: errorMessage,
        originalError: error,
      }
    }

    const data = await response.json()
    console.log('[Athena] callOpenRouterAPI: response data', data)

    const usage = data.usage || null

    let parsedResponse: { response: string; reasoning?: string }
    try {
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No response content from OpenRouter API')
      }
      console.log('[Athena] callOpenRouterAPI: raw content before parse --', content.slice(0, 200))
      parsedResponse = parseCompanionJSON(content)
      console.log('[Athena] callOpenRouterAPI: parsedResponse keys', Object.keys(parsedResponse))
    } catch {
      throw new Error('Invalid JSON response from OpenRouter API')
    }

    if (!parsedResponse.response) {
      throw new Error('No response field in parsed JSON')
    }

    console.log('[Athena] callOpenRouterAPI: success', { responseLength: parsedResponse.response.length, usage })

    return {
      response: parsedResponse.response,
      usage: usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
    }
  } catch (error) {
    console.log('[Athena] callOpenRouterAPI: caught error', error)
    throw error
  }
}
