'use client'

import {
  TTS_PROVIDERS,
  PERSONALITY_VOICES,
  TTS_VOICES,
  GENDER_MAPPING,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
  SECONDARY_AUDIO_TYPE
} from '../constants'
import { getDB } from '../db'
import { getCompanionSettings, formatInstructions, getAPIKey } from '../utils'

const SYNTHESIZE_API_URL = 'https://f.cluster.resemble.ai/synthesize'

/**
 * Get audio format from constants (e.g., 'mp3' from 'audio/mp3')
 */
function getAudioFormat(): string {
  return SECONDARY_AUDIO_TYPE.split('/')[1] || 'mp3'
}

/**
 * Build SSML with prompt for ResembleAI
 * Format: <speak prompt="personality voice">text</speak>
 */
function buildSSML(text: string, prompt: string): string {
  // Escape XML special characters in text
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `<speak prompt="${prompt}">${escapedText}</speak>`
}

/**
 * Convert base64 to blob
 */
function base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Generate speech from text using ResembleAI TTS API
 * Fetches voice settings from DB and uses them to generate audio
 * @param text - The text to convert to speech
 * @returns Promise<Blob> - The audio data as a blob
 */
export async function generateSpeech(text: string): Promise<Blob> {
  try {
    const db = await getDB()
    const settings = await db.getSettings()
    const selectedVoice = settings?.selectedVoice || '0b15fe25'

    const apiKey = await getAPIKey('resemble-ai')
    const audioFormat = getAudioFormat()
    const { personality, gender } = await getCompanionSettings()
    const instructions = formatInstructions(personality, gender)
    const ssmlData = buildSSML(text, instructions)

    console.log('[Athena] generateSpeech (ResembleAI): settings resolved', { selectedVoice, audioFormat, personality, gender })
    console.log('[Athena] generateSpeech (ResembleAI): SSML data', ssmlData)

    const reqBody = {
      voice_uuid: selectedVoice,
      data: ssmlData,
      output_format: audioFormat,
    }

    console.log('[Athena] generateSpeech (ResembleAI): request body', { ...reqBody })

    const response = await fetch(SYNTHESIZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    console.log('[Athena] generateSpeech (ResembleAI): HTTP response status', response.status, response.ok)

    if (!response.ok) {
      const errorData = await response.json()
      console.log('[Athena] generateSpeech (ResembleAI): API error response', errorData)
      throw new Error(`ResembleAI TTS API error: ${response.statusText}`)
    }

    const responseData = await response.json()
    console.log('[Athena] generateSpeech (ResembleAI): response data', { ...responseData, audio_content: '[base64]' })

    if (!responseData.audio_content) {
      throw new Error('No audio_content in ResembleAI response')
    }

    const blob = base64ToBlob(responseData.audio_content, SECONDARY_AUDIO_TYPE)
    console.log('[Athena] generateSpeech (ResembleAI): success', { blobSize: blob.size, audioFormat })
    return blob
  } catch (error) {
    console.log('[Athena] generateSpeech (ResembleAI): caught error', error)
    throw error
  }
}
