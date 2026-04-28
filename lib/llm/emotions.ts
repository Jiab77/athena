'use client'

import type { EmotionState, EmotionDetectionResult, PersonalityType, GenderType } from '../types'
import {
  DEFAULT_EMOTION_DETECTION_PROVIDER,
  DEFAULT_COMPANION_NAME,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
  EMOTION_KEYWORDS,
  GENDER_MAPPING,
} from '../constants'
import { getDB } from '../db'
import { resolveEmotionDetector } from './router'

/**
 * Valid emotion states derived from EMOTION_KEYWORDS — single source of truth
 */
const VALID_EMOTIONS = [...EMOTION_KEYWORDS] as EmotionState[]

/**
 * Build a personality-aware emotion classification system prompt
 * Takes companion name and personality into account so the classifier
 * understands the emotional delivery style rather than just semantic content
 */
function buildEmotionSystemPrompt(companion: string, personality: PersonalityType, avatarGender: GenderType): string {
  const gender = GENDER_MAPPING[avatarGender].gender
  return `You are an emotion classifier for ${companion}, an AI companion with a ${personality} personality and ${gender} gender expression.

Analyze the emotional tone of ${companion}'s response, taking into account their ${personality} personality style and ${gender} gender expression.
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
 * Detect the dominant emotion in an AI response.
 *
 * High-level coordinator: builds the personality-aware classification prompt,
 * resolves which provider should run the classification (active provider's
 * native detector first, otherwise the shared fallback chain in
 * `lib/llm/router.ts`), then parses and validates the response.
 *
 * The provider-specific HTTP plumbing lives in each adapter
 * (`lib/llm/openai.ts`, `lib/llm/groq.ts`, ...) — this file is intentionally
 * free of `fetch` calls and provider URLs.
 *
 * Only sends the AI response text — no conversation history is needed for
 * emotion classification.
 *
 * @param aiResponse - The AI response text to analyze
 * @param provider   - The active LLM provider; used to pick the native
 *                     detector when available, otherwise ignored.
 * @returns EmotionDetectionResult with detected emotion or null
 */
export async function detectEmotion(aiResponse: string, provider = DEFAULT_EMOTION_DETECTION_PROVIDER): Promise<EmotionDetectionResult> {
  try {
    const db = await getDB()
    const settings = await db.getSettings()

    const detector = await resolveEmotionDetector(provider)
    if (!detector) {
      console.warn('[Athena] Emotion detection disabled — no provider with native support and no fallback API key configured')
      return { emotion: null }
    }

    const companion = settings?.selectedCompanion || DEFAULT_COMPANION_NAME
    const personality = (settings?.selectedPersonality as PersonalityType) || DEFAULT_PERSONALITY
    const avatarGender = (settings?.avatarGender as GenderType) || DEFAULT_GENDER
    const systemPrompt = buildEmotionSystemPrompt(companion, personality, avatarGender)

    console.log('[Athena] Emotion detection — provider:', detector.providerID, 'companion:', companion, 'personality:', personality)

    const content = await detector.detect(systemPrompt, aiResponse)

    // Parse and validate the JSON response. Detection adapters return the raw
    // `content` string; we own parsing here so every provider gets the same
    // permissive validation.
    try {
      const parsed = JSON.parse(content)
      const emotion = parsed.emotion

      if (emotion === null) {
        console.log('[Athena] Emotion detection — neutral/no emotion')
        return { emotion: null }
      }

      if (VALID_EMOTIONS.includes(emotion)) {
        console.log('[Athena] Emotion detection — detected:', emotion)
        return { emotion: emotion as EmotionState }
      }

      console.log('[Athena] Emotion detection — invalid emotion value:', emotion)
      return { emotion: null }
    } catch (parseError) {
      console.error('[Athena] Emotion detection — JSON parse error:', parseError)
      return { emotion: null }
    }
  } catch (error) {
    console.error('[Athena] Emotion detection error:', error)
    return { emotion: null }
  }
}
