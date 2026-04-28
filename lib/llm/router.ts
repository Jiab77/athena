'use client'

import type { Message, LLMResponse } from '../types'
import { DEFAULT_MODEL_PROVIDER } from '../constants'
import { getDB } from '../db'
import { callGroqAPI, transcribeAudio as transcribeGroq } from './groq'
import { callOpenAIAPI, transcribeAudio as transcribeOpenAI } from './openai'
import { callCustomAPI, transcribeAudio as transcribeCustom } from './custom'
import { callBioLLMAPI } from './biollm'
import { callOpenRouterAPI, transcribeAudio as transcribeOpenRouter } from './openrouter'
// `transcribeOpenAI` / `transcribeGroq` are still imported for their
// registration in the `providers` map below — the fallback chain now reads
// them from that registry rather than referencing the imports directly.
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
    // No native STT — handled generically via `STT_FALLBACK_CHAIN` below.
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
 * Priority-ordered STT fallback chain.
 *
 * Used when the active chat provider can't transcribe natively (BioLLM today,
 * Custom without `hasSTTSupport`, or any future no-STT provider). Listed in
 * preference order: dedicated Whisper-class endpoints first, since they're
 * faster and flat-rate compared to chat-completions-with-audio.
 *
 * OpenRouter is deliberately excluded: its STT path goes through chat
 * completions, which is slower and token-billed. OpenRouter users still get
 * OpenRouter STT when it's their *active* chat provider via the registry.
 */
const STT_FALLBACK_CHAIN = ['openai', 'groq'] as const

/**
 * Resolve the active provider's *own* STT transcriber, taking per-provider
 * gates into account. Returns `null` when the provider has no native STT or
 * has it disabled (e.g. Custom provider with `hasSTTSupport: false`).
 *
 * Centralising this means `transcribeAudio()` and `supportsSTT()` agree by
 * construction — they can't drift on per-provider gating logic.
 */
async function getNativeSTT(providerID: string): Promise<((blob: Blob) => Promise<string>) | null> {
  const provider = providers[providerID]
  if (!provider?.transcribeAudio) return null

  // Custom provider — STT is opt-in via user setting
  if (providerID === 'custom') {
    const db = await getDB()
    const settings = await db.getSettings()
    if (!settings?.hasSTTSupport) return null
  }

  return provider.transcribeAudio
}

/**
 * Walk `STT_FALLBACK_CHAIN` and return the first provider whose API key is
 * configured, or `null` when none are. The provider's transcriber is read
 * from the registry so we never hardcode which functions to call.
 */
async function resolveSTTFallback(): Promise<{ providerID: string; transcribe: (blob: Blob) => Promise<string> } | null> {
  const db = await getDB()
  for (const providerID of STT_FALLBACK_CHAIN) {
    const provider = providers[providerID]
    if (!provider?.transcribeAudio) continue
    const hasKey = await db.checkAPIKey(providerID)
    if (hasKey) {
      return { providerID, transcribe: provider.transcribeAudio }
    }
  }
  return null
}

/**
 * Transcribe audio using STT
 * Routes to the active provider's native STT when available, otherwise walks
 * the shared fallback chain. Throws when no native STT and no fallback is
 * configured.
 * @param audioBlob - Audio data to transcribe
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const providerID = await getCurrentProvider()

  if (!providers[providerID]) {
    throw new Error(`Provider '${providerID}' not found in registry`)
  }

  const native = await getNativeSTT(providerID)
  if (native) {
    return native(audioBlob)
  }

  const fallback = await resolveSTTFallback()
  if (fallback) {
    console.log(`[Router] '${providerID}' has no usable native STT — falling back to ${fallback.providerID}`)
    return fallback.transcribe(audioBlob)
  }

  throw new Error(`No STT available for provider '${providerID}' and no fallback is configured`)
}

/**
 * Check if STT is currently usable.
 * True when the active provider has native STT enabled, or when at least one
 * fallback provider has a configured API key.
 * @returns true if STT is supported, false otherwise
 */
export async function supportsSTT(): Promise<boolean> {
  try {
    const providerID = await getCurrentProvider()

    if (await getNativeSTT(providerID)) return true

    return (await resolveSTTFallback()) !== null
  } catch {
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
