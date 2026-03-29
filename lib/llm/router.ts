'use client'

import type { Message, LLMResponse } from '@/lib/types'
import { DEFAULT_MODEL_PROVIDER } from '@/lib/constants'
import { getDB } from '@/lib/db'
import { callGroqAPI, transcribeAudio as transcribeGroq } from './groq'
import { callOpenAIAPI, transcribeAudio as transcribeOpenAI } from './openai'
import { callCustomAPI, transcribeAudio as transcribeCustom } from './custom'
import { detectTools } from './tools'

/**
 * LLM/STT Provider Router
 * Unified interface for routing API calls to the correct provider
 * Supports dynamic provider selection based on database settings
 */

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
  // wormgpt: {
  //   callAPI: callWormGPTAPI,
  //   // No transcribeAudio - doesn't support STT
  // },
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
  
  if (!provider) {
    throw new Error(`Provider '${providerID}' not found in registry`)
  }

  // Pre-flight tool detection for Groq and OpenAI
  if (providerID === 'groq' || providerID === 'openai') {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    if (lastUserMessage) {
      const detection = await detectTools(lastUserMessage, providerID)

      // Groq: tools already executed — response is ready
      if (providerID === 'groq' && detection.toolsUsed && detection.response) {
        console.log('[Router] Groq tools fired — returning pre-flight response')
        return { response: detection.response, usage: null }
      }

      // OpenAI: pass toolsNeeded flag through via the messages array metadata
      // We signal it by passing a special property on the last user message object
      if (providerID === 'openai' && detection.toolsNeeded !== undefined) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg) {
          (lastMsg as any)._toolsNeeded = detection.toolsNeeded
          console.log('[Router] OpenAI toolsNeeded:', detection.toolsNeeded)
        }
      }
    }
  }
  
  return provider.callAPI(messages)
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
