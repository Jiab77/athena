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
    
    // Build system prompt with companion name, personality, gender from database
    const systemPrompt = buildSystemPrompt(companion, personality, avatarGender, customPersonalityTraits)

    // Apply sliding window based on user's memory preference
    const windowSize = memoryWindowSize
    const windowedMessages = messages.slice(-windowSize)
    // Detect if any message contains an actual image (base64 encoded)
    // Note: documentContent is for text files, not images
    const hasImage = windowedMessages.some(msg => 
      msg.imageBase64 !== undefined && msg.imageBase64 !== null && msg.imageBase64.length > 0
    )

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
        // Convert text content to base64
        const base64Content = Buffer.from(msg.documentContent).toString('base64')
        
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
        
        content.push({
          type: 'input_file' as const,
          filename: msg.documentName,
          file_data: `data:${mimeType};base64,${base64Content}`,
        })
        
      }
      
      // If message has an image, add as input_image (Responses API format)
      if (msg.imageBase64 && msg.imageFormat) {
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

    // Build request body for OpenAI Responses API
    // New format: instructions (system prompt) + input (messages) instead of messages array
    // JSON mode enabled via text.format to ensure valid JSON output
    // Note: JSON mode requires the word "json" in the input messages, so we prepend a system message
    const inputWithJsonContext = [
      {
        role: 'system' as const,
        content: 'Always respond with valid JSON format.',
      },
      ...userMessages,
    ]
    
    const reqBody: any = {
      model: model,
      instructions: systemPrompt,
      input: inputWithJsonContext,
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      reasoning: { effort: 'low' },
      text: {
        format: { type: 'json_object' }
      },
      tools: [
        { type: 'web_search' }
      ],
      tool_choice: 'auto'
    }

    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to get OpenAI response')
    }

    const data = await response.json()
    const usage = data.usage || null
    
    // Parse JSON response from Responses API
    let parsedResponse: { response: string; reasoning?: string }
    try {
      // Check response status first
      if (data.status !== 'completed') {
        if (data.status === 'incomplete') {
          const reason = data.incomplete_details?.reason
          if (reason === 'max_output_tokens') {
            throw new Error('Response cut off due to max_output_tokens limit')
          } else if (reason === 'content_filter') {
            throw new Error('Response blocked by content filter')
          }
          throw new Error(`Response incomplete: ${reason}`)
        }
        throw new Error(`Unexpected response status: ${data.status}`)
      }

      // Extract text from Responses API output structure
      // The output array can have multiple items (reasoning, message, web_search_call)
      // We need to find the item with type: "message" and get its content[0].text
      const messageOutput = data.output?.find((item: any) => item.type === 'message')
      
      // Check for model refusal
      if (messageOutput?.content?.[0]?.type === 'refusal') {
        const refusalReason = messageOutput.content[0].refusal
        throw new Error(`Model refused: ${refusalReason}`)
      }

      const content = messageOutput?.content?.[0]?.text

      if (!content) {
        throw new Error('No text found in OpenAI response output')
      }

      parsedResponse = parseCompanionJSON(content)
    } catch (parseError) {
      throw new Error('Invalid response from OpenAI Responses API')
    }

    if (!parsedResponse.response) {
      throw new Error('No response field in parsed JSON')
    }

    return {
      response: parsedResponse.response,
      usage: usage as { input_tokens: number; output_tokens: number; total_tokens: number } | null
    }
  } catch (error) {
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

    // Create FormData for multipart file upload
    const formData = new FormData()
    formData.append('file', audioBlob, DEFAULT_AUDIO_FILE)
    
    // Get STT model from constants (OpenAI provider's first model)
    const providers = STT_PROVIDERS.find(p => p.id === 'openai')
    const sttModel = providers?.models[0]?.model || 'whisper-1'
    formData.append('model', sttModel)
    // formData.append('language', 'fr')

    const response = await fetch(STT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.text) {
      throw new Error('No transcription text in response')
    }

    return data.text
  } catch (error) {
    throw error
  }
}
