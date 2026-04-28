'use client'

import type { Message, LLMResponse } from '../types'
import { DEFAULT_MODEL_PROVIDER } from '../constants'
import { getDB } from '../db'
import { callGroqAPI, transcribeAudio as transcribeGroq } from './groq'
import { callOpenAIAPI, transcribeAudio as transcribeOpenAI } from './openai'
import { callCustomAPI, transcribeAudio as transcribeCustom } from './custom'
import { callBioLLMAPI } from './biollm'
import { callOpenRouterAPI, transcribeAudio as transcribeOpenRouter } from './openrouter'
import { detectTools } from './tools'

/**
 * LLM/STT Provider Router
 * Unified interface for routing API calls to the correct provider
 * Supports dynamic provider selection based on database settings
 */
// TODO: Make sure we don't have any other duplicated interfaces / types
// FIXME: Rename this interface to avoid conflicts with the one defined in '/lib/types.ts'
export interface LLMProvider {
  callAPI: (messages: Message[]) => Promise<LLMResponse>
  transcribeAudio?: (audioBlob: Blob) => Promise<string>
}

/**
 * Provider registry
 * Maps provider IDs to their API functions
 * STT is optional - providers without transcribeAudio won't support voice input
 */
const providers: Record<string, LLMProvider> = {
  groq: {
    callAPI: callGroqAPI,
    transcribeAudio: transcribeGroq,
  },
  openai: {
    callAPI: callOpenAIAPI,
    transcribeAudio: transcribeOpenAI,
  },
  custom: {
    callAPI: callCustomAPI,
    transcribeAudio: transcribeCustom,
  },
  biollm: {
    callAPI: callBioLLMAPI,
    // No native STT/TTS — falls back to OpenAI Whisper/TTS if OpenAI API key is configured
  },
  openrouter: {
    callAPI: callOpenRouterAPI,
    // STT performed via chat completions with an `input_audio` content block
    // (OpenRouter has no dedicated Whisper endpoint). Lets users get STT with
    // the same OpenRouter key already used for chat — see lib/llm/openrouter.ts.
    transcribeAudio: transcribeOpenRouter,
  },
}

/**
 * Get the current provider configuration
 * Reads selectedProvider from database, defaults to DEFAULT_MODEL_PROVIDER
 */
async function getCurrentProvider(): Promise<string> {
  try {
    const db = await getDB()
    const settings = await db.getSettings()
    return settings?.selectedProvider || DEFAULT_MODEL_PROVIDER
  } catch (error) {
    console.error('Failed to get provider from settings, using default')
    return DEFAULT_MODEL_PROVIDER
  }
}

/**
 * Call LLM API for chat completions
 * Automatically routes to correct provider based on settings.
 * Runs a pre-flight tool detection step for Groq and OpenAI providers:
 * - Groq: if tools fire in the pre-flight, returns early with that response.
 * - OpenAI: if toolsNeeded is true, the main call uses web_search without JSON mode.
 *
 * @param messages         - Conversation history
 * @param selectedProvider - Optional provider override (avoids redundant DB read)
 * @returns API response with content and token usage
 */
export async function callLLM(messages: Message[], selectedProvider?: string): Promise<LLMResponse> {
  const providerID = selectedProvider || await getCurrentProvider()
  const provider = providers[providerID]

  console.log('[Router] callLLM - provider:', providerID, 'messageCount:', messages.length)

  if (!provider) {
    throw new Error(`Provider '${providerID}' not found in registry`)
  }

  // Pre-flight tool detection for Groq only
  // OpenAI handles tools natively via Responses API (tool_choice: 'auto')
  if (providerID === 'groq') {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    if (lastUserMessage) {
      const detection = await detectTools(lastUserMessage)

      // Groq: tools already executed — response is ready, skip main callLLM
      if (detection.toolsUsed && detection.response) {
        console.log('[Router] Groq tools fired — returning pre-flight response', { responseLength: detection.response.length })
        return { response: detection.response, usage: null }
      }
    }
  }

  const result = await provider.callAPI(messages)
  console.log('[Router] callLLM - response received', { responseLength: result.response.length, usage: result.usage, hasImage: !!result.imageBase64 })
  return result
}

/**
 * Transcribe audio using STT
 * Automatically routes to correct provider based on settings
 * @param audioBlob - Audio data to transcribe
 * @returns Transcribed text
 * @throws Error if provider doesn't support STT
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const providerID = await getCurrentProvider()
  const provider = providers[providerID]

  if (!provider) {
    throw new Error(`Provider '${providerID}' not found in registry`)
  }

  // Custom provider - check hasSTTSupport setting before attempting
  if (providerID === 'custom') {
    const db = await getDB()
    const settings = await db.getSettings()
    if (!settings?.hasSTTSupport) {
      throw new Error('Custom provider STT not enabled in settings')
    }
  }

  // BioLLM — no native STT, fall back to OpenAI Whisper (priority) or Groq Whisper
  if (providerID === 'biollm') {
    const db = await getDB()
    const openaiKey = await db.checkAPIKey('openai')
    const groqKey = await db.checkAPIKey('groq')

    if (openaiKey) {
      console.log('[Router] BioLLM STT — falling back to OpenAI Whisper')
      return transcribeOpenAI(audioBlob)
    }
    if (groqKey) {
      console.log('[Router] BioLLM STT — falling back to Groq Whisper')
      return transcribeGroq(audioBlob)
    }

    console.warn('[Router] BioLLM STT not available — no OpenAI or Groq API key configured')
    return Promise.reject(new Error('STT not available'))
  }

  if (!provider.transcribeAudio) {
    throw new Error(`Provider '${providerID}' does not support Speech-to-Text`)
  }

  return provider.transcribeAudio(audioBlob)
}

/**
 * Check if current provider supports STT
 * Accounts for custom providers with explicit hasSTTSupport setting
 * @returns true if STT is supported, false otherwise
 */
export async function supportsSTT(): Promise<boolean> {
  try {
    const providerID = await getCurrentProvider()

    // Custom provider check - look at database setting
    if (providerID === 'custom') {
      const db = await getDB()
      const settings = await db.getSettings()
      return settings?.hasSTTSupport ?? false
    }

    // BioLLM — STT supported if OpenAI (priority) or Groq API key is configured
    if (providerID === 'biollm') {
      const db = await getDB()
      const openaiKey = await db.checkAPIKey('openai')
      const groqKey = await db.checkAPIKey('groq')
      return !!(openaiKey || groqKey)
    }

    // Built-in provider check
    const provider = providers[providerID]
    if (provider && provider.transcribeAudio) {
      return true
    }

    return false
  } catch (error) {
    return false
  }
}

/**
 * Register a new provider — internal use only, not exported.
 * Keeping this unexported prevents console-based rogue provider injection.
 */
function registerProvider(providerID: string, provider: LLMProvider): void {
  providers[providerID] = provider
}

// Explicitly void the reference so tree-shaking keeps it but it is unreachable externally
void registerProvider
