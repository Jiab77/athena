'use client'

import type { Message, PersonalityType, GenderType } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
  DEFAULT_AUDIO_FILE,
} from '../constants'
import { getDB } from '../db'
import { buildSystemPrompt, getAPIKey } from '../utils'

/**
 * Validate a custom provider URL.
 * - https:// is allowed for any host
 * - http:// is only allowed for loopback addresses (localhost, 127.0.0.1, ::1)
 *   to support local providers like Ollama without opening SSRF-adjacent risk
 *   to external HTTP endpoints.
 */
function validateProviderUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Custom provider URL is not a valid URL')
  }

  if (parsed.protocol === 'https:') return

  if (parsed.protocol === 'http:') {
    const host = parsed.hostname.toLowerCase()
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    if (isLoopback) return
    throw new Error('Custom provider URL must use https:// for non-local hosts')
  }

  throw new Error(`Custom provider URL uses unsupported protocol: ${parsed.protocol}`)
}

/**
 * Escape triple-backtick sequences in document content to prevent
 * prompt injection via crafted documents breaking out of the fenced block.
 */
function escapeDocumentContent(content: string): string {
  return content.replace(/`{3,}/g, (match) => match.replace(/`/g, '` ').trimEnd())
}

/**
 * Call Custom Provider API with conversation history
 * Uses user-configured URL, model name, and API key from database
 */
export async function callCustomAPI(
  messages: Message[]
): Promise<{ response: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null }> {
  try {
    // Fetch all required data from database
    const apiKey = await getAPIKey('custom')
    const db = await getDB()
    const settings = await db.getSettings()
    
    if (!settings) {
      throw new Error('No settings found in database')
    }
    
    // Extract custom provider settings
    const customProviderUrl = settings.customProviderUrl
    const customModelName = settings.customModelName

    if (!customProviderUrl) {
      throw new Error('Custom provider URL not configured')
    }

    validateProviderUrl(customProviderUrl)

    if (!customModelName) {
      throw new Error('Custom model name not configured')
    }

    // Extract settings with defaults
    const personality = (settings.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const companion = settings.selectedCompanion || DEFAULT_COMPANION_NAME
    const memoryWindowSize = settings.memoryWindowSize || DEFAULT_MEMORY_SIZE
    const avatarGender = (settings.avatarGender as GenderType) || DEFAULT_GENDER
    const customPersonalityTraits = settings.customPersonalityTraits

    console.log('[Athena] callCustomAPI: settings resolved', { customProviderUrl, customModelName, personality, companion, memoryWindowSize, avatarGender })

    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits)

    const windowedMessages = messages.slice(-memoryWindowSize)

    const apiMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...windowedMessages.map((msg) => {
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
      model: customModelName,
      messages: apiMessages,
      temperature: 1,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    }

    console.log('[Athena] callCustomAPI: request body', reqBody)

    const response = await fetch(customProviderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[Athena] callCustomAPI: HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      const status = response.status
      const errorMessage = error.error?.message || 'Unknown error'
      console.log('[Athena] callCustomAPI: API error response', error)
      throw {
        status,
        message: errorMessage,
        originalError: error
      }
    }

    const data = await response.json()
    console.log('[Athena] callCustomAPI: response data', data)

    const usage = data.usage || null

    // Parse response - try JSON first, then plain text
    let responseText: string
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No response content from Custom API')
    }

    console.log('[Athena] callCustomAPI: raw content before parse', content.slice(0, 200))

    try {
      // Try to parse as JSON (for providers that support structured output)
      const parsed = JSON.parse(content)
      responseText = parsed.response || content
    } catch {
      // Fall back to plain text
      responseText = content
    }

    console.log('[Athena] callCustomAPI: success', { responseLength: responseText.length, usage })

    return {
      response: responseText,
      usage: usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null
    }
  } catch (error) {
    console.log('[Athena] callCustomAPI: caught error', error)
    throw error
  }
}

/**
 * Transcribe audio to text using Custom Provider's STT API
 * Uses user-configured STT URL from database
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const apiKey = await getAPIKey('custom')
    const db = await getDB()
    const settings = await db.getSettings()
    
    if (!settings) {
      throw new Error('No settings found in database')
    }
    
    const customSTTUrl = settings.customSTTUrl
    const customSTTModelName = settings.customSTTModelName
    
    if (!customSTTUrl) {
      throw new Error('Custom STT URL not configured')
    }

    validateProviderUrl(customSTTUrl)

    if (!customSTTModelName) {
      throw new Error('Custom STT model name not configured')
    }

    const formData = new FormData()
    formData.append('file', audioBlob, DEFAULT_AUDIO_FILE)
    formData.append('model', customSTTModelName)

    console.log('[Athena] transcribeAudio (Custom): sending request', { customSTTUrl, customSTTModelName, blobSize: audioBlob.size })

    const response = await fetch(customSTTUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    console.log('[Athena] transcribeAudio (Custom): HTTP response status', response.status, response.ok)

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[Athena] transcribeAudio (Custom): response data', data)

    if (!data.text) {
      throw new Error('No transcription text in response')
    }

    console.log('[Athena] transcribeAudio (Custom): success', { textLength: data.text.length })
    return data.text
  } catch (error) {
    console.log('[Athena] transcribeAudio (Custom): caught error', error)
    throw error
  }
}
