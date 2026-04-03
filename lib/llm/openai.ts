'use client'

import type { Message, PersonalityType, GenderType, LLMResponse } from '../types'
import {
  DEFAULT_GENDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_MODEL_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_MEMORY_SIZE,
  DEFAULT_AUDIO_FILE,
  STT_PROVIDERS
} from '../constants'
import { getDB } from '../db'
import { parseCompanionJSON, buildSystemPrompt, getAPIKey } from '../utils'

const CHAT_API_URL = 'https://api.openai.com/v1/responses'
const STT_API_URL = 'https://api.openai.com/v1/audio/transcriptions'

/**
 * Call OpenAI API with conversation history using fetch
 * Automatically retrieves API key, model, personality, and companion from database
 */
export async function callOpenAIAPI(
  messages: Message[]
): Promise<LLMResponse> {
  try {
    // Fetch all required data from database
    const apiKey = await getAPIKey('openai')
    const db = await getDB()
    const settings = await db.getSettings()

    console.log('[Athena] callOpenAIAPI: settings loaded', { hasSettings: !!settings })

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

    console.log('[Athena] callOpenAIAPI: resolved settings', { model, personality, companion, memoryWindowSize, avatarGender })

    // Build system prompt with companion name, personality, gender from database
    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits)

    console.log('[Athena] callOpenAIAPI: system prompt --', systemPrompt)

    // Apply sliding window based on user's memory preference
    const windowSize = memoryWindowSize
    const windowedMessages = messages.slice(-windowSize)

    console.log('[Athena] callOpenAIAPI: message window', { total: messages.length, windowed: windowedMessages.length })

    // Detect if any message contains an actual image (base64 encoded)
    // Note: documentContent is for text files, not images
    const hasImage = windowedMessages.some(msg =>
      msg.imageBase64 !== undefined && msg.imageBase64 !== null && msg.imageBase64.length > 0
    )

    console.log('[Athena] callOpenAIAPI: hasImage', hasImage)

    // Convert messages to OpenAI Responses API format
    // Note: system prompt goes in instructions parameter, messages only contain user/assistant
    const userMessages = windowedMessages.map((msg) => {
      const content: any[] = [
        {
          type: 'input_text' as const,
          text: msg.content,
        },
      ]

      // If message has document data, add as input_file
      if (msg.documentContent && msg.documentName) {
        console.log('[Athena] callOpenAIAPI: attaching document', { name: msg.documentName, contentLength: msg.documentContent.length })

        // Convert text content to base64
        const bytes = new TextEncoder().encode(msg.documentContent)
        const base64Content = btoa(String.fromCharCode(...bytes))

        // Determine MIME type from filename extension
        const ext = msg.documentName.split('.').pop()?.toLowerCase()
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'txt': 'text/plain',
          'md': 'text/markdown',
          'json': 'application/json',
          'csv': 'text/csv',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'xls': 'application/vnd.ms-excel',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'ppt': 'application/vnd.ms-powerpoint',
        }
        const mimeType = mimeTypes[ext || ''] || 'application/octet-stream'

        console.log('[Athena] callOpenAIAPI: document mime type resolved', { ext, mimeType })

        content.push({
          type: 'input_file' as const,
          filename: msg.documentName,
          file_data: `data:${mimeType};base64,${base64Content}`,
        })

      }

      // If message has an image, add as input_image (Responses API format)
      if (msg.imageBase64 && msg.imageFormat) {
        console.log('[Athena] callOpenAIAPI: attaching image', { format: msg.imageFormat, base64Length: msg.imageBase64.length })
        content.push({
          type: 'input_image' as const,
          image_url: `data:image/${msg.imageFormat};base64,${msg.imageBase64}`,
        })
      }

      return {
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: content.length === 1 ? content[0].text : content,
      }
    })

    // Read the toolsNeeded flag set by the router's pre-flight detection
    const lastMsg = messages[messages.length - 1] as any
    // const toolsNeeded = lastMsg?._toolsNeeded === true
    const toolsNeeded = false

    // Clean up the flag so it doesn't leak into the payload
    // if (lastMsg) delete lastMsg._toolsNeeded

    // console.log('[Athena] callOpenAIAPI: toolsNeeded from pre-flight', toolsNeeded)

    // Build request body for OpenAI Responses API
    // - toolsNeeded: enable web_search, disable JSON mode (mutually exclusive on Responses API)
    // - no tools needed: enable JSON mode, no tools
    {/*
    const inputBase = toolsNeeded
      ? userMessages  // plain prose expected — no JSON wrapper needed
      : [
        { role: 'system' as const, content: 'Always respond with valid JSON format.' },
        ...userMessages,
      ]
    */}
    const inputBase = [
      { role: 'system' as const, content: 'Always respond with valid JSON format.' },
      ...userMessages,
    ]

    {/*
    const reqBody: any = {
      model: model,
      instructions: systemPrompt,
      input: inputBase,
      temperature: 1,
      max_output_tokens: 2048,
      reasoning: { effort: 'low' },
      ...(toolsNeeded
        ? {
          tools: [
            { type: 'web_search' },
            { type: 'computer' },
            { type: 'image_generation' }
          ],
          tool_choice: 'auto'
        }
        : { text: { format: { type: 'json_object' } } }
      ),
    }
    */}
    const reqBody: any = {
      model: model,
      instructions: systemPrompt,
      input: inputBase,
      temperature: 1,
      max_output_tokens: 2048,
      reasoning: { effort: 'low' },
      tools: [
        { type: 'web_search' },
        { type: 'computer' },
        { type: 'image_generation' }
      ],
      tool_choice: 'auto',
    }

    console.log('[Athena] callOpenAIAPI: request body (no content)', {
      model: reqBody.model,
      instructions: reqBody.instructions,
      inputMessageCount: reqBody.input.length,
      maxOutputTokens: reqBody.max_output_tokens,
      reasoning: reqBody.reasoning,
      // textFormat: reqBody.text?.format,
      tools: reqBody.tools,
    })

    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[Athena] callOpenAIAPI: HTTP response', { status: response.status, ok: response.ok })

    if (!response.ok) {
      const error = await response.json()
      console.log('[Athena] callOpenAIAPI: API error response', error)
      throw new Error(error.error?.message || 'Failed to get OpenAI response')
    }

    const data = await response.json()

    console.log('[Athena] callOpenAIAPI: response data shape', JSON.stringify(data))

    const usage = data.usage || null

    // Parse JSON response from Responses API
    let parsedResponse: { response: string; reasoning?: string, image_generation_call?: string }
    try {
      // Check response status first
      if (data.status !== 'completed') {
        if (data.status === 'incomplete') {
          const reason = data.incomplete_details?.reason
          console.log('[Athena] callOpenAIAPI: response incomplete', { reason })
          if (reason === 'max_output_tokens') {
            throw new Error('Response cut off due to max_output_tokens limit')
          } else if (reason === 'content_filter') {
            throw new Error('Response blocked by content filter')
          }
          throw new Error(`Response incomplete: ${reason}`)
        }
        console.log('[Athena] callOpenAIAPI: unexpected status', data.status)
        throw new Error(`Unexpected response status: ${data.status}`)
      }

      // Extract text from Responses API output structure
      // The output array can have multiple items (reasoning, message, web_search_call)
      // We need to find the item with type: "message" and get its content[0].text
      const messageOutput = data.output?.find((item: any) => item.type === 'message')
      console.log('[Athena] callOpenAIAPI: messageOutput', {
        found: !!messageOutput,
        contentType: messageOutput?.content?.[0]?.type,
        textLength: messageOutput?.content?.[0]?.text?.length,
      })

      const imageOutput = data.output?.find((item: any) => item.type === 'image_generation_call')
      console.log('[Athena] callOpenAIAPI: imageOutput', imageOutput)

      // Check for model refusal
      if (messageOutput?.content?.[0]?.type === 'refusal') {
        const refusalReason = messageOutput.content[0].refusal
        console.log('[Athena] callOpenAIAPI: model refusal', refusalReason)
        throw new Error(`Model refused: ${refusalReason}`)
      }

      const content = messageOutput?.content?.[0]?.text

      if (!content) {
        console.log('[Athena] callOpenAIAPI: no text content found in output', JSON.stringify(data.output))
        throw new Error('No text found in OpenAI response output')
      }

      console.log('[Athena] callOpenAIAPI: raw content before parse', content.slice(0, 200))
      // Always try parseCompanionJSON first — the model may return JSON even when tools are active.
      // Only fall back to wrapping as plain prose if parsing fails.
      try {
        parsedResponse = parseCompanionJSON(content)
        console.log('[Athena] callOpenAIAPI: parsedResponse keys', Object.keys(parsedResponse))
      } catch {
        console.log('[Athena] callOpenAIAPI: JSON parse failed — wrapping plain prose as response (toolsNeeded:', toolsNeeded, ')')
        parsedResponse = { response: content }
      }
    } catch (parseError) {
      console.log('[Athena] callOpenAIAPI: parse error', parseError)
      throw new Error('Invalid response from OpenAI Responses API')
    }

    if (!parsedResponse.response) {
      console.log('[Athena] callOpenAIAPI: missing response field in parsed JSON', parsedResponse)
      throw new Error('No response field in parsed JSON')
    }

    console.log('[Athena] callOpenAIAPI: success', { responseLength: parsedResponse.response.length, usage })

    return {
      response: parsedResponse.response,
      usage: usage as { input_tokens: number; output_tokens: number; total_tokens: number } | null
    }
  } catch (error) {
    console.log('[Athena] callOpenAIAPI: caught error', error)
    throw error
  }
}

/**
 * Transcribe audio to text using OpenAI's Whisper API
 * Supports multilingual audio in various formats (WebM, MP3, M4A, etc.)
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const apiKey = await getAPIKey('openai')

    console.log('[Athena] transcribeAudio: starting', { blobSize: audioBlob.size, blobType: audioBlob.type })

    // Create FormData for multipart file upload
    const formData = new FormData()
    formData.append('file', audioBlob, DEFAULT_AUDIO_FILE)

    // Get STT model from constants (OpenAI provider's first model)
    const providers = STT_PROVIDERS.find(p => p.id === 'openai')
    const sttModel = providers?.models[0]?.model || 'whisper-1'
    formData.append('model', sttModel)
    // formData.append('language', 'fr')

    console.log('[Athena] transcribeAudio: using model', sttModel)

    const response = await fetch(STT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    console.log('[Athena] transcribeAudio: HTTP response', { status: response.status, ok: response.ok })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.log('[Athena] transcribeAudio: error response', errorBody)
      throw new Error(`Transcription failed: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('[Athena] transcribeAudio: result', { textLength: data.text?.length, hasText: !!data.text })

    if (!data.text) {
      throw new Error('No transcription text in response')
    }

    return data.text
  } catch (error) {
    console.log('[Athena] transcribeAudio: caught error', error)
    throw error
  }
}
