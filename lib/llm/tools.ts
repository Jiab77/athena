'use client'

import type { ToolDetectionResult, PersonalityType, GenderType } from '../types'
import {
  DEFAULT_GROQ_TOOL_DETECTION_MODEL,
  DEFAULT_OPENAI_TOOL_DETECTION_MODEL,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
} from '../constants'
import { getDB } from '../db'
import { getAPIKey } from '../utils'

const GROQ_CHAT_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENAI_CHAT_API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Detect if user message requires tools and optionally get the response.
 *
 * - For Groq: uses a compound model with automatic tool execution (web_search, etc.).
 *   If tools fired, the response is already ready — no main call needed.
 * - For OpenAI: uses a cheap model with JSON mode to decide whether tools are needed.
 *   Returns { toolsNeeded: true/false } so the main call can gate JSON mode vs web_search.
 *
 * Only sends the latest user message to avoid 413 Entity Too Large errors.
 *
 * @param userMessage - The latest user message to analyze
 * @param provider    - The selected LLM provider ('groq' | 'openai' | other)
 * @returns ToolDetectionResult
 */
export async function detectTools(userMessage: string, provider = 'groq'): Promise<ToolDetectionResult> {
  if (provider === 'openai') {
    return detectToolsOpenAI(userMessage)
  }
  return detectToolsGroq(userMessage)
}

// ─── OpenAI pre-flight ────────────────────────────────────────────────────────

async function detectToolsOpenAI(userMessage: string): Promise<ToolDetectionResult> {
  try {
    const apiKey = await getAPIKey('openai')

    console.log('[Athena] OpenAI tool detection - pre-flight for message:', userMessage)

    const reqBody = {
      model: DEFAULT_OPENAI_TOOL_DETECTION_MODEL,
      messages: [
        {
          role: 'system' as const,
          content: 'You are a routing assistant. Decide whether answering the user message requires a real-time web search (news, live data, current events, prices, weather, recent facts). Reply only with valid JSON: { "toolsNeeded": true } or { "toolsNeeded": false }.',
        },
        {
          role: 'user' as const,
          content: userMessage,
        },
      ],
      temperature: 0,
      max_completion_tokens: 16,
      response_format: { type: 'json_object' },
    }

    const response = await fetch(OPENAI_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Athena] OpenAI tool detection API error:', error)
      return { toolsUsed: false, toolsNeeded: false }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    console.log('[Athena] OpenAI tool detection - raw response:', content)

    const parsed = JSON.parse(content)
    const toolsNeeded = parsed.toolsNeeded === true

    console.log('[Athena] OpenAI tool detection - toolsNeeded:', toolsNeeded)
    return { toolsUsed: false, toolsNeeded }

  } catch (error) {
    console.error('[Athena] OpenAI tool detection error:', error)
    return { toolsUsed: false, toolsNeeded: false }
  }
}

// ─── Groq pre-flight ──────────────────────────────────────────────────────────

async function detectToolsGroq(userMessage: string): Promise<ToolDetectionResult> {
  try {
    const apiKey = await getAPIKey('groq')
    const db = await getDB()
    const settings = await db.getSettings()

    // Use a compact personality-aware system prompt for tool detection.
    // The full personality prompt is too large and causes request_too_large errors.
    // We keep just enough context for the model to stay in character when using tools.
    const companion = settings?.selectedCompanion || DEFAULT_COMPANION_NAME
    const personality = (settings?.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const gender = (settings?.avatarGender as GenderType) || DEFAULT_GENDER
    const systemPrompt = `You are ${companion}, a ${gender === 'F' ? 'female' : 'male'} AI companion with a ${personality} personality. Use available tools to answer questions that require up-to-date or factual information, staying in character. Always respond with valid JSON: { "response": "your message" } or { "response": "your message", "reasoning": "your thinking process" } when the user asks why or to explain.`

    console.log('[Athena] Tool detection - compact personality prompt for companion:', companion, personality)

    const reqBody = {
      model: DEFAULT_GROQ_TOOL_DETECTION_MODEL,
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 2048,
      response_format: { type: 'json_object' },
      compound_custom: {
        tools: {
          enabled_tools: ['browser_automation', 'web_search', 'visit_website']
        }
      }
    }

    console.log('[Athena] Tool detection - calling', DEFAULT_GROQ_TOOL_DETECTION_MODEL, 'with message:', userMessage)
    console.log('[Athena] Tool detection request:', JSON.stringify(reqBody, null, 2))

    const response = await fetch(GROQ_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Groq-Model-Version': 'latest',
      },
      body: JSON.stringify(reqBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Athena] Tool detection API error:', error)
      // On error, return false to fallback to main model
      return { toolsUsed: false }
    }

    const data = await response.json()
    console.log('[Athena] Tool detection - raw response:', JSON.stringify(data, null, 2))

    const executedTools = data.choices?.[0]?.message?.executed_tools || null
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage || null

    if (usage) {
      console.log('[Athena] Tool detection - usage stats:', usage)
    }

    if (executedTools && executedTools.length > 0) {
      console.log('[Athena] Tool detection - tools executed:', executedTools)
      console.log('[Athena] Tool detection - raw content:', content)

      // Parse JSON response to extract the actual response text
      let parsedResponse = content
      try {
        const parsed = JSON.parse(content)
        parsedResponse = parsed.response || content
        console.log('[Athena] Tool detection - parsed response:', parsedResponse)
        if (parsed.reasoning) {
          console.log('[Athena] Tool detection - model reasoning:', parsed.reasoning)
        }
      } catch {
        console.warn('[Athena] Tool detection - content is not JSON, using raw content')
      }

      return {
        toolsUsed: true,
        response: parsedResponse,
        executedTools: executedTools,
      }
    }

    console.log('[Athena] Tool detection - no tools needed, falling back to main model')
    return { toolsUsed: false }

  } catch (error) {
    console.error('[Athena] Tool detection error:', error)
    // On error, return false to fallback to main model
    return { toolsUsed: false }
  }
}
