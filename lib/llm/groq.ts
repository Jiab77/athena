'use client'

import type { Message, PersonalityType, GenderType, LLMResponse } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_MODEL_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
  DEFAULT_AUDIO_FILE,
  DEFAULT_GROQ_STT_MODEL,
  DEFAULT_GROQ_URL_CAPABLE_MODEL,
  DEFAULT_GROQ_VISION_MODEL,
  STT_PROVIDERS
} from '../constants'
import { getDB } from '../db'
import { parseCompanionJSON, buildSystemPrompt, getAPIKey } from '../utils'

const CHAT_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const STT_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

/**
 * Escape triple-backtick sequences in document content to prevent
 * prompt injection via crafted documents breaking out of the fenced block.
 */
function escapeDocumentContent(content: string): string {
  return content.replace(/`{3,}/g, (match) => match.replace(/`/g, '` ').trimEnd())
}

/**
 * Call Groq API with conversation history using fetch
 * Automatically retrieves API key, model, personality, and companion from database
 */
export async function callGroqAPI(
  messages: Message[]
): Promise<LLMResponse> {
  try {
    // Fetch all required data from database
    const apiKey = await getAPIKey('groq')
    const db = await getDB()
    const settings = await db.getSettings()

    if (!settings) {
      throw new Error('No settings found in database')
    }

    // Extract settings with defaults
    const model = settings.selectedModel || DEFAULT_MODEL_NAME
    const personality = (settings.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const companion = settings.selectedCompanion || DEFAULT_COMPANION_NAME
    const memoryWindowSize = settings.memoryWindowSize || DEFAULT_MEMORY_SIZE
    const avatarGender = (settings.avatarGender as GenderType) || DEFAULT_GENDER
    const customPersonalityTraits = settings.customPersonalityTraits

    console.log('[Athena] callGroqAPI: settings resolved', { model, personality, companion, memoryWindowSize, avatarGender })

    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits)

    const windowedMessages = messages.slice(-memoryWindowSize)

    // Detect URLs in the latest user message only
    const urlRegex = /https?:\/\/[^\s]+/g
    const lastUserMessage = windowedMessages.filter(msg => msg.role === 'user').pop()
    const hasUrls = lastUserMessage?.content ? urlRegex.test(lastUserMessage.content) : false

    // Detect if any message contains an actual image (base64 encoded)
    const hasImage = windowedMessages.some(msg =>
      msg.imageBase64 !== undefined && msg.imageBase64 !== null && msg.imageBase64.length > 0
    )

    // Check model types for tool configuration, image and urls handling
    const isGptOssModel = model.includes('gpt-oss')
    const isCompoundModel = model.includes('compound')
    const isOllamaModel = model.includes('ollama')

    // Model selection: priority order - image > URL > default
    const modelToUse = hasImage
      ? DEFAULT_GROQ_VISION_MODEL
      : (hasUrls)
        ? DEFAULT_GROQ_URL_CAPABLE_MODEL
        : model

    console.log('[Athena] callGroqAPI: model selection', { hasImage, hasUrls, isGptOssModel, isCompoundModel, isOllamaModel, modelToUse })

    // Convert messages to Groq API format, supporting both text and image content
    const groqMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...windowedMessages.map((msg) => {
        // If message has an image, create content array with text and image (for vision models)
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

        // If message has document content, inject it into the message text
        if (msg.documentContent) {
          const safeContent = escapeDocumentContent(msg.documentContent)
          const docContext = `\n\n---\nAttached Document (${msg.documentName || 'file'}):\n\`\`\`\n${safeContent}\n\`\`\`\n---`
          return {
            role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: msg.content + docContext,
          }
        }

        // Regular text-only message
        return {
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }
      }),
    ]

    // Build request body for reuse
    const reqBody: any = {
      model: modelToUse,
      messages: groqMessages,
      temperature: 1,
      max_completion_tokens: 2048,
      top_p: 1,
      response_format: { type: 'json_object' },
    }

    // Check model types for tool configuration
    const isGptOssFinalModel = modelToUse.includes('gpt-oss')
    const isCompoundFinalModel = modelToUse.includes('compound')
    const isOllamaFinalModel = modelToUse.includes('ollama')

    // Add reasoning params for GPT-OSS models
    if (isGptOssFinalModel) {
      reqBody.reasoning_effort = 'low'
      reqBody.reasoning_format = 'parsed'
    }

    // Tool configuration based on model type (only when no image attached)
    if (!hasImage) {
      if (isCompoundFinalModel) {
        // Compound models use compound_custom with enabled_tools array
        reqBody.compound_custom = {
          tools: {
            enabled_tools: ['browser_automation', 'web_search', 'visit_website']
          }
        }
      }
    }

    console.log('[Athena] callGroqAPI: request body', {
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
        'Groq-Model-Version': 'latest',
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[Athena] callGroqAPI: HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const error = await response.json()
      const status = response.status
      const errorMessage = error.error?.message || 'Unknown error'
      console.log('[Athena] callGroqAPI: API error response', error)
      throw {
        status,
        message: errorMessage,
        originalError: error
      }
    }

    const data = await response.json()
    console.log('[Athena] callGroqAPI: response data', data)

    const tools = data.choices?.[0]?.message?.executed_tools || null
    const usage = data.usage || null

    // Parse JSON response from structured output
    let parsedResponse: { response: string; reasoning?: string }
    try {
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No response content from Groq API')
      }
      console.log('[Athena] callGroqAPI: raw content before parse --', content.slice(0, 200))
      parsedResponse = parseCompanionJSON(content)
      console.log('[Athena] callGroqAPI: parsedResponse keys', Object.keys(parsedResponse))
    } catch {
      throw new Error('Invalid JSON response from Groq API')
    }

    if (!parsedResponse.response) {
      throw new Error('No response field in parsed JSON')
    }

    console.log('[Athena] callGroqAPI: success', { responseLength: parsedResponse.response.length, usage, executedTools: tools })

    return {
      response: parsedResponse.response,
      usage: usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null
    }
  } catch (error) {
    console.log('[Athena] callGroqAPI: caught error', error)
    throw error
  }
}

/**
 * Transcribe audio to text using Groq's Whisper API
 * Supports multilingual audio in various formats (WebM, MP3, M4A, etc.)
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const apiKey = await getAPIKey('groq')

    // Create FormData for multipart file upload
    const formData = new FormData()
    formData.append('file', audioBlob, DEFAULT_AUDIO_FILE)

    // Get STT model from constants (Groq provider's first model)
    const providers = STT_PROVIDERS.find(p => p.id === 'groq')
    const sttModel = providers?.models[0]?.model || DEFAULT_GROQ_STT_MODEL
    formData.append('model', sttModel)
    // formData.append('language', 'fr')

    console.log('[Athena] transcribeAudio (Groq): sending request', { model: sttModel, blobSize: audioBlob.size })

    const response = await fetch(STT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    console.log('[Athena] transcribeAudio (Groq): HTTP response status', response.status, response.ok)

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[Athena] transcribeAudio (Groq): response data', data)

    if (!data.text) {
      throw new Error('No transcription text in response')
    }

    console.log('[Athena] transcribeAudio (Groq): success', { textLength: data.text.length })
    return data.text
  } catch (error) {
    console.log('[Athena] transcribeAudio (Groq): caught error', error)
    throw error
  }
}
