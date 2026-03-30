'use client'

import type { EmotionState, EmotionDetectionResult, PersonalityType, GenderType } from '../types'
import {
  DEFAULT_GROQ_EMOTION_DETECTION_MODEL,
  DEFAULT_OPENAI_TOOL_DETECTION_MODEL,
  EMOTION_KEYWORDS,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
} from '../constants'
import { getDB } from '../db'
import { getAPIKey } from '../utils'

const GROQ_CHAT_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENAI_CHAT_API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Valid emotion states derived from EMOTION_KEYWORDS — single source of truth
 */
const VALID_EMOTIONS = Object.keys(EMOTION_KEYWORDS) as EmotionState[]

/**
 * Build a personality-aware emotion classification system prompt
 * Takes companion name and personality into account so the classifier
 * understands the emotional delivery style rather than just semantic content
 */
function buildEmotionSystemPrompt(companion: string, personality: PersonalityType): string {
  return `You are an emotion classifier for ${companion}, an AI companion with a ${personality} personality.

Analyze the emotional tone of ${companion}'s response, taking into account their ${personality} personality style.
For example, a Sarcastic companion may express happiness through wit and irony rather than explicit joy.
A Cheerful companion may express thoughtfulness with an upbeat tone rather than a neutral one.

Return a JSON object with a single "emotion" field containing one of these values:
- "happy" - joy, excitement, enthusiasm, satisfaction, wit, playfulness
- "sad" - sadness, disappointment, regret, sympathy, melancholy
- "angry" - frustration, annoyance, criticism, displeasure
- "surprised" - amazement, astonishment, unexpected reactions
- "thoughtful" - deep contemplation, curiosity, careful analysis
- null - neutral, casual, or no clear emotion

Respond ONLY with valid JSON. Example: {"emotion": "happy"}`
}

/**
 * Detect the dominant emotion in an AI response
 * Uses llama-3.1-8b-instant and gpt-5.4-nano with JSON mode for fast, structured classification
 * 
 * Only sends the AI response text - no conversation history needed
 * 
 * @param aiResponse - The AI response text to analyze
 * @param provider   - The selected LLM provider ('groq' | 'openai' | other). Defaults to 'groq'.
 * @returns EmotionDetectionResult with detected emotion or null
 */
export async function detectEmotion(aiResponse: string, provider = 'groq'): Promise<EmotionDetectionResult> {
  try {
    const isOpenAI = provider === 'openai'
    const apiKey = await getAPIKey(isOpenAI ? 'openai' : 'groq')
    const db = await getDB()
    const settings = await db.getSettings()

    const companion = settings?.selectedCompanion || DEFAULT_COMPANION_NAME
    const personality = (settings?.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const emotionSystemPrompt = buildEmotionSystemPrompt(companion, personality)

    console.log('[Athena] Emotion detection - provider:', provider, 'companion:', companion, 'personality:', personality)

    const reqBody = {
      model: isOpenAI ? DEFAULT_OPENAI_TOOL_DETECTION_MODEL : DEFAULT_GROQ_EMOTION_DETECTION_MODEL,
      messages: [
        {
          role: 'system' as const,
          content: emotionSystemPrompt,
        },
        {
          role: 'user' as const,
          content: aiResponse,
        },
      ],
      temperature: 0.3,
      // Groq uses max_tokens, OpenAI Chat Completions uses max_completion_tokens
      ...(isOpenAI
        ? { max_completion_tokens: 64 }
        : { max_tokens: 64 }
      ),
      response_format: { type: 'json_object' },
    }

    console.log('[Athena] Emotion detection - analyzing response:', aiResponse)
    console.log('[Athena] Emotion detection request:', JSON.stringify(reqBody, null, 2))

    const response = await fetch(isOpenAI ? OPENAI_CHAT_API_URL : GROQ_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Athena] Emotion detection API error:', error)
      return { emotion: null }
    }

    const data = await response.json()
    console.log('[Athena] Emotion detection - raw response:', JSON.stringify(data, null, 2))
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.log('[Athena] Emotion detection - no content in response')
      return { emotion: null }
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content)
      const emotion = parsed.emotion

      // Validate emotion is in allowed list
      if (emotion === null) {
        console.log('[Athena] Emotion detection - neutral/no emotion')
        return { emotion: null }
      }

      if (VALID_EMOTIONS.includes(emotion)) {
        console.log('[Athena] Emotion detection - detected:', emotion)
        return { emotion: emotion as EmotionState }
      }

      console.log('[Athena] Emotion detection - invalid emotion value:', emotion)
      return { emotion: null }

    } catch (parseError) {
      console.error('[Athena] Emotion detection - JSON parse error:', parseError)
      return { emotion: null }
    }

  } catch (error) {
    console.error('[Athena] Emotion detection error:', error)
    return { emotion: null }
  }
}
