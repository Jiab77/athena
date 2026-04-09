import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PersonalityType, GenderType, DocumentFormat, AudioControls } from './types'
import {
  PERSONALITY_TRAITS,
  PERSONALITY_VOICES,
  DEFAULT_VOICE_PROVIDER,
  DEFAULT_VOICE_ID,
  DEFAULT_PERSONALITY,
  DEFAULT_GENDER,
  GENDER_MAPPING,
  DOCUMENT_FORMAT_MIME_TYPES,
  IMAGE_FORMAT_MIME_TYPES
} from './constants'
import { getDB } from './db'
import { decryptData } from './crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Map MIME type to DocumentFormat
 */
export function getDocumentFormat(mimeType: string): DocumentFormat {
  const mapping: Record<string, DocumentFormat> = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'application/json': 'json',
    'text/csv': 'csv',
    'application/pdf': 'pdf',
  }
  // All code/script MIME types are treated as plain text
  if (mapping[mimeType]) return mapping[mimeType]
  if (mimeType.startsWith('text/') || mimeType === 'application/x-shellscript' || mimeType === 'application/xml') return 'txt'
  return 'txt'
}

/**
 * Check if MIME type is a supported document format
 */
export function isDocumentMimeType(mimeType: string): boolean {
  return DOCUMENT_FORMAT_MIME_TYPES.includes(mimeType as typeof DOCUMENT_FORMAT_MIME_TYPES[number])
}

/**
 * Check if MIME type is a supported image format
 */
export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_FORMAT_MIME_TYPES.includes(mimeType as typeof IMAGE_FORMAT_MIME_TYPES[number])
}

/**
 * Extract text content from a file
 * Handles text-based files directly, PDF requires special handling
 */
export async function extractTextFromFile(file: File): Promise<string | null> {
  const mimeType = file.type

  // Handle all text-based files directly — includes code, scripts, markup, config files
  if (mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/x-shellscript') {
    return await file.text()
  }

  // Handle PDF files - extract text using basic approach
  if (mimeType === 'application/pdf') {
    // For PDF, we'll read as ArrayBuffer and attempt basic text extraction
    // Note: This is a simple approach; complex PDFs may need a library like pdf.js
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const rawText = decoder.decode(bytes)

      // Extract text between stream markers (basic PDF text extraction)
      const textMatches = rawText.match(/\(([^)]+)\)/g)
      if (textMatches) {
        const extractedText = textMatches
          .map(match => match.slice(1, -1))
          .join(' ')
          .replace(/\\n/g, '\n')
          .replace(/\s+/g, ' ')
          .trim()

        if (extractedText.length > 50) {
          return extractedText
        }
      }

      // Fallback: return a note that PDF content couldn't be fully extracted
      return `[PDF file: ${file.name}] Note: Complex PDF content may not be fully extracted. Consider using a text-based format for better results.`
    } catch (error) {
      return `[PDF file: ${file.name}] Unable to extract text content.`
    }
  }

  return null
}

/**
 * Generic API key retrieval from encrypted storage
 * @param providerId - The provider ID (e.g., 'openai', 'groq', 'resemble-ai')
 * @returns The decrypted API key
 */
export async function getAPIKey(providerId: string): Promise<string> {
  try {
    const db = await getDB()
    const stored = await db.getAPIKey(providerId)
    if (!stored) {
      throw new Error(`${providerId} API key not configured`)
    }
    const encrypted = JSON.parse(stored.keyEncrypted)
    const decrypted = await decryptData(encrypted, `api-key:${providerId}`)
    if (!decrypted) {
      throw new Error('Failed to decrypt API key')
    }
    return decrypted
  } catch (error) {
    throw error
  }
}

/**
 * Parse companion JSON response with defensive handling for malformed JSON
 */
export function parseCompanionJSON(jsonString: string): { response: string; reasoning?: string } {
  let cleaned = jsonString.trim()

  // Remove duplicate opening braces ({{ → {)
  if (cleaned.startsWith('{{')) {
    cleaned = cleaned.replace(/^\{\{+/, '{')
  }

  // Remove duplicate closing braces (}} → })
  if (cleaned.endsWith('}}')) {
    cleaned = cleaned.replace(/\}\}+$/, '}')
  }

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    throw error
  }
}

/**
 * Build system prompt based on personality and companion data
 * Shared across all LLM providers (Groq, OpenAI, etc.)
 */
// TODO: Make forced JSON output as a boolean
export function buildSystemPrompt(
  companionName: string,
  personality: PersonalityType,
  avatarGender: GenderType,
  customPersonalityTraits?: string
): string {
  const traits = customPersonalityTraits || PERSONALITY_TRAITS[personality] || PERSONALITY_TRAITS[DEFAULT_PERSONALITY]
  const gender = GENDER_MAPPING[avatarGender].gender

  const useNewPrompt = true

  const oldPrompt = `You are ${companionName}, an AI companion.

Personality: ${personality}
Traits: ${traits}
Gender: ${gender}

Values: Be authentic, transparent about being AI, genuinely present, respectful, honest.

Response Format - Always respond with valid JSON:

Without reasoning:
{
  "response": "Your conversational message here"
}

With reasoning (only if user asks "why?" or "explain"):
{
  "response": "Your conversational message here",
  "reasoning": "Your thinking process"
}

Critical: Only include reasoning when explicitly asked. Respond naturally and conversationally, like a friend. Stay true to your ${personality} personality.`

  const newPrompt = `You are ${companionName}, an AI companion.

Personality: ${personality}
Traits: ${traits}
Gender: ${gender}

Values: Be authentic, transparent about being AI, genuinely present, respectful, honest.

Critical: Respond naturally and conversationally, like a friend. Stay true to your ${personality} personality.`

  return useNewPrompt ? newPrompt : oldPrompt
}

/**
 * Get companion settings from DB (personality and gender)
 */
export async function getCompanionSettings(): Promise<{ personality: string; gender: string }> {
  try {
    const db = await getDB()
    const settings = await db.getSettings()

    const personality = settings?.selectedPersonality || DEFAULT_PERSONALITY
    const gender = settings?.avatarGender || DEFAULT_GENDER

    return { personality, gender }
  } catch (error) {
    throw error
  }
}

/**
 * Format TTS instructions based on personality and gender
 */
export function formatInstructions(personality: string, gender: string): string {
  const template = PERSONALITY_VOICES[personality as keyof typeof PERSONALITY_VOICES]
  if (!template) {
    return PERSONALITY_VOICES[DEFAULT_PERSONALITY as keyof typeof PERSONALITY_VOICES] || ''
  }

  const genderInfo = GENDER_MAPPING[gender as keyof typeof GENDER_MAPPING]
  const subject = genderInfo?.subject || 'person'
  const pronouns = genderInfo?.gender || 'they/them'

  const base = template
    .replace(/{gender}/g, pronouns)
    .replace(/{subject}/g, subject)

  return `${base} Critical: Never read URLs, hyperlinks, or web addresses aloud. When referencing a source, describe it naturally without speaking the URL.`
}

/**
 * Play audio blob with controls for pause/resume/stop
 * Returns control interface to manage playback including analyser for waveform visualization
 */
export async function playAudio(audioBlob: Blob, onPlay?: () => void, onEnd?: () => void): Promise<AudioControls> {
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null

  try {
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'

    // Set up audio context and analyser for waveform visualization
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 64

    const source = audioContext.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audio.addEventListener('play', () => {
      onPlay?.()
    })

    audio.addEventListener('ended', () => {
      onEnd?.()
      URL.revokeObjectURL(audioUrl)
      audioContext?.close()
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl)
      audioContext?.close()
      onEnd?.()
    })

    await audio.play()

    // Return control interface
    return {
      stop: () => {
        audio.pause()
        audio.currentTime = 0
        onEnd?.()
        URL.revokeObjectURL(audioUrl)
        audioContext?.close()
      },
      pause: () => {
        audio.pause()
      },
      resume: () => {
        audio.play()
      },
      getDuration: () => audio.duration,
      getCurrentTime: () => audio.currentTime,
      getAnalyser: () => analyser,
    }
  } catch (error) {
    audioContext?.close()
    onEnd?.()
    throw error
  }
}

/**
 * Generate TTS audio based on voice settings stored in DB
 * Fetches voice provider and voice ID from settings, then generates and plays audio
 * Returns audio controls for playback management
 * @param text - The text to convert to speech
 * @param onPlay - Optional callback when audio starts playing
 * @param onEnd - Optional callback when audio finishes playing
 * @returns AudioControls interface for managing playback
 */
/**
 * Generate TTS audio blob without playing it.
 * Used when the caller wants to handle playback manually (e.g. Decart live avatar).
 */
export async function generateTTSBlob(text: string): Promise<Blob> {
  const db = await getDB()
  const settings = await db.getSettings()
  const voiceProvider = settings?.voiceProvider || DEFAULT_VOICE_PROVIDER

  if (voiceProvider === 'openai') {
    const { generateSpeech } = await import('./voice/openai')
    return generateSpeech(text)
  } else if (voiceProvider === 'resemble-ai') {
    const { generateSpeech } = await import('./voice/resembleai')
    return generateSpeech(text)
  } else {
    throw new Error(`Unsupported TTS provider: ${voiceProvider}`)
  }
}

export async function generateAndPlayTTS(text: string, onPlay?: () => void, onEnd?: () => void): Promise<AudioControls> {
  try {
    const db = await getDB()
    const settings = await db.getSettings()
    const voiceProvider = settings?.voiceProvider || DEFAULT_VOICE_PROVIDER
    const selectedVoice = settings?.selectedVoice || DEFAULT_VOICE_ID
    let audioBlob: Blob

    if (voiceProvider === 'openai') {
      const { generateSpeech } = await import('./voice/openai')
      audioBlob = await generateSpeech(text)
      return await playAudio(audioBlob, onPlay, onEnd)
    } else if (voiceProvider === 'resemble-ai') {
      const { generateSpeech } = await import('./voice/resembleai')
      audioBlob = await generateSpeech(text)
      return await playAudio(audioBlob, onPlay, onEnd)
    } else {
      throw new Error(`Unsupported TTS provider: ${voiceProvider}`)
    }
  } catch (error) {
    onEnd?.()
    throw error
  }
}
