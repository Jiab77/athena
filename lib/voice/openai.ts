'use client'

import {
  TTS_PROVIDERS,
  SECONDARY_AUDIO_TYPE,
  PERSONALITY_VOICES,
  TTS_VOICES,
  GENDER_MAPPING,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
  DEFAULT_VOICE_ID
} from '../constants'
import { getDB } from '../db'
import { getCompanionSettings, formatInstructions, getAPIKey } from '../utils'

const SPEECH_API_URL = 'https://api.openai.com/v1/audio/speech'

/**
 * Get audio format supported by OpenAI TTS
 * OpenAI supports: mp3, aac, opus, flac, pcm, and wav
 * Maps from MIME type to OpenAI format
 */
function getAudioFormat(): string {
  // Extract format from SECONDARY_AUDIO_TYPE (e.g., 'mp3' from 'audio/mp3')
  // OpenAI doesn't support webm, so we use mp3 as default
  return SECONDARY_AUDIO_TYPE.split('/')[1] || 'mp3'
}

/**
 * Generate speech from text using OpenAI TTS API
 * Fetches voice settings from DB and uses them to generate audio
 * @param text - The text to convert to speech
 * @returns Promise<Blob> - The audio data as a blob
 */
export async function generateSpeech(text: string): Promise<Blob> {
  try {
    if (!text) {
      throw new Error('Text is required for speech generation')
    }

    const db = await getDB()
    const settings = await db.getSettings()
    const selectedVoice = settings?.selectedVoice || DEFAULT_VOICE_ID

    const providers = TTS_PROVIDERS.find(p => p.id === 'openai')
    const model = providers?.models[0]?.model || 'gpt-4o-mini-tts'

    const apiKey = await getAPIKey('openai')
    const audioFormat = getAudioFormat()
    const { personality, gender } = await getCompanionSettings()
    const instructions = formatInstructions(personality, gender)

    const response = await fetch(SPEECH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: text,
        voice: selectedVoice,
        response_format: audioFormat,
        instructions: instructions,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI TTS API error: ${response.statusText}`)
    }

    return await response.blob()
  } catch (error) {
    throw error
  }
}
