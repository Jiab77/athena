'use client'

import {
  TTS_PROVIDERS,
  SECONDARY_AUDIO_TYPE,
  TTS_VOICES,
  GENDER_MAPPING,
  DEFAULT_COMPANION_NAME,
  DEFAULT_GENDER,
  DEFAULT_VOICE_MODEL,
  DEFAULT_VOICE_ID,
} from '../constants'
import { getDB } from '../db'
import { getCompanionSettings, formatInstructions, getAPIKey } from '../utils'

const SPEECH_API_URL = 'https://openrouter.ai/api/v1/audio/speech'

/**
 * Attribution title sent on `X-OpenRouter-Title` for OpenRouter's app
 * leaderboard. Kept in sync with the chat adapter (see lib/llm/openrouter.ts).
 */
const ATTRIBUTION_TITLE = DEFAULT_COMPANION_NAME

/**
 * Build the optional attribution headers OpenRouter consumes for analytics
 * and ranking. Browser-only, since `window.location.origin` is undefined on
 * the server. Duplicated from the chat adapter on purpose: the voice/ folder
 * deliberately doesn't depend on llm/ (mirrors how voice/openai.ts is
 * independent of llm/openai.ts).
 */
function buildAttributionHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  return {
    'HTTP-Referer': window.location.origin,
    'X-OpenRouter-Title': ATTRIBUTION_TITLE,
  }
}

/**
 * Resolve the response audio format for OpenRouter's `/audio/speech` endpoint.
 *
 * OpenRouter proxies OpenAI's TTS, so the supported formats are identical:
 * mp3, aac, opus, flac, pcm, and wav. We derive the format from the
 * project-wide `SECONDARY_AUDIO_TYPE` MIME (e.g. 'audio/mp3' → 'mp3').
 */
function getAudioFormat(): string {
  return SECONDARY_AUDIO_TYPE.split('/')[1] || 'mp3'
}

/**
 * Generate speech via OpenRouter's `/audio/speech` endpoint.
 *
 * Behaviour mirrors the OpenAI voice adapter (same request shape, same
 * response handling) because OpenRouter is a thin proxy in front of OpenAI's
 * TTS API. The only differences are the host, the auth header (OpenRouter
 * key) and the optional attribution headers used for OpenRouter's
 * leaderboard.
 *
 * Reads voice settings from IndexedDB and the personality/gender pair from
 * the same companion settings used everywhere else, so the user gets a
 * consistent voice regardless of which TTS provider they pick.
 */
export async function generateSpeech(text: string): Promise<Blob> {
  try {
    if (!text) {
      throw new Error('Text is required for speech generation')
    }

    const db = await getDB()
    const settings = await db.getSettings()
    const { personality, gender } = await getCompanionSettings()

    // Resolve voice from settings, falling back to the gender-appropriate
    // default in TTS_VOICES['openrouter'] (which mirrors OpenAI's voice list).
    const genderKey = (gender || DEFAULT_GENDER) as keyof typeof GENDER_MAPPING
    const voicesForGender = TTS_VOICES['openrouter'][genderKey] ?? []
    const fallbackVoiceId =
      voicesForGender.find(v => 'isDefault' in v && v.isDefault)?.id ||
      voicesForGender[0]?.id ||
      DEFAULT_VOICE_ID
    const selectedVoice = settings?.selectedVoice || fallbackVoiceId

    const provider = TTS_PROVIDERS.find(p => p.id === 'openrouter')
    const model = provider?.models[0]?.model

    const apiKey = await getAPIKey('openrouter')
    const audioFormat = getAudioFormat()
    const instructions = formatInstructions(personality, gender)

    const reqBody = {
      model,
      input: text,
      voice: selectedVoice,
      response_format: audioFormat,
      instructions,
    }

    console.log('[Athena] generateSpeech (OpenRouter): request body', { ...reqBody })

    const response = await fetch(SPEECH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...buildAttributionHeaders(),
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[Athena] generateSpeech (OpenRouter): HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.log('[Athena] generateSpeech (OpenRouter): API error response', errorData)
      throw new Error(`OpenRouter TTS API error: ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('[Athena] generateSpeech (OpenRouter): success', { blobSize: blob.size, audioFormat })
    return blob
  } catch (error) {
    console.log('[Athena] generateSpeech (OpenRouter): caught error', error)
    throw error
  }
}
