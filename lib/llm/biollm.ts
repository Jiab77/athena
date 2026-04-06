'use client'

import type { Message, PersonalityType, GenderType, LLMResponse } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
  ENABLE_BIOLLM_PERSONALITY,
} from '../constants'
import { getDB } from '../db'
import { parseCompanionJSON, buildSystemPrompt, getAPIKey } from '../utils'

/**
 * Call BioLLM API with conversation history
 * BioLLM routes inference through a living 50M-neuron Izhikevich brain simulation
 * running on Cortical Labs CL1 hardware.
 *
 * Constraints:
 * - Text only (no vision, no image generation, no document attachments)
 * - No tool detection (no web search, no pre-flight)
 * - No emotion detection (unless OpenAI API key is configured — handled by router)
 * - thinking state is always available (pure UI state, no API dependency)
 *
 * API: OpenAI-compatible chat completions endpoint
 * Response includes a `brain` object with neural activity data (spikes, regions, modulators)
 */
export async function callBioLLMAPI(
  messages: Message[]
): Promise<LLMResponse> {
  try {
    const apiKey = await getAPIKey('biollm')
    const db = await getDB()
    const settings = await db.getSettings()
    const useProxy = false

    if (!settings) {
      throw new Error('No settings found in database')
    }

    if (!settings.customProviderUrl) {
      throw new Error('BioLLM API endpoint not configured. Please set it in Settings.')
    }

    // Extract settings with defaults
    const personality = (settings.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const companion = settings.selectedCompanion || DEFAULT_COMPANION_NAME
    const memoryWindowSize = settings.memoryWindowSize || DEFAULT_MEMORY_SIZE
    const avatarGender = (settings.avatarGender as GenderType) || DEFAULT_GENDER
    const customPersonalityTraits = settings.customPersonalityTraits
    const endpointUrl = settings.customProviderUrl

    const CHAT_API_URL = `${endpointUrl}/v1/chat/completions`

    console.log('[Athena] callBioLLMAPI: settings resolved', { personality, companion, memoryWindowSize, avatarGender, endpointUrl })

    const windowedMessages = messages.slice(-memoryWindowSize)

    // BioLLM is text-only — plain string content for all messages
    // System prompt is conditional — pending confirmation that BioLLM accepts it in the request body
    const bioMessages = [
      ...(ENABLE_BIOLLM_PERSONALITY ? [{
        role: 'system' as const,
        content: buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits),
      }] : []),
      ...windowedMessages.map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
    ]

    const reqBody = {
      messages: bioMessages,
    }

    console.log('[Athena] callBioLLMAPI: endpoint', CHAT_API_URL)
    console.log('[Athena] callBioLLMAPI: request body', { ...reqBody })
    console.log('[Athena] callBioLLMAPI: enabled proxy?', useProxy)

    // Route through server-side proxy to avoid CORS restrictions
    let response
    if (useProxy) {
      response = await fetch('/api/biollm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ CHAT_API_URL, apiKey, messages: bioMessages }),
      })
    } else {
      response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody),
      })
    }

    console.log('[Athena] callBioLLMAPI: HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const error = await response.json()
      const errorMessage = error.error?.message || 'Unknown error'
      console.log('[Athena] callBioLLMAPI: API error response', error)
      throw {
        status: response.status,
        message: errorMessage,
        originalError: error,
      }
    }

    const data = await response.json()

    // Log brain activity data — the unique BioLLM neural signature
    // console.log('[Athena] callBioLLMAPI: brain activity', data.brain)
    {/*
    console.log('[Athena] callBioLLMAPI: response data', {
      id: data.id,
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices?.[0]?.finish_reason,
    })
    */}
    console.log('[Athena] callBioLLMAPI: response data', JSON.stringify(data))

    const content = data.choices?.[0]?.message?.content
    const brain = data.brain || null
    const usage = data.usage || null

    if (!content) {
      throw new Error('No response content from BioLLM API')
    }

    console.log('[Athena] callBioLLMAPI: raw content before parse', JSON.stringify(content))

    // Always try parseCompanionJSON first — the model may return JSON even when tools are active.
    // Only fall back to wrapping as plain prose if parsing fails.
    let parsedResponse: { response: string }
    try {
      parsedResponse = parseCompanionJSON(content)
      console.log('[Athena] callBioLLMAPI: parsedResponse keys', Object.keys(parsedResponse))
    } catch {
      console.log('[Athena] callBioLLMAPI: JSON parse failed — wrapping plain prose as response')
      parsedResponse = { response: content }
    }

    if (!parsedResponse.response) {
      throw new Error('No response field in parsed content')
    }

    console.log('[Athena] callBioLLMAPI: success', { responseLength: parsedResponse.response.length, usage })

    return {
      response: parsedResponse.response,
      usage: usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
    }
  } catch (error) {
    console.log('[Athena] callBioLLMAPI: caught error', error)
    throw error
  }
}
