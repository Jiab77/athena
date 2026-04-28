/**
 * Domain type definitions for Athena
 * Single source of truth for all shared types across the application
 * Some types are derived from constants.ts to avoid duplication
 */

import type {
  PERSONALITIES,
  VISUAL_FORMATS,
  AVATAR_CATEGORIES,
  GENDERS,
  COLOR_SCHEMES,
  GENDER_MAPPING,
  SUPPORTED_LOCALES,
} from './constants'
// Imported for `typeof` derivation only — the English locale acts as the
// canonical translation schema. Other locales must structurally match it.
import type enDict from '@/i18n/en.json'

export type VisualFormat = (typeof VISUAL_FORMATS)[number]

export type PersonalityType = (typeof PERSONALITIES)[number]

export type GenderType = keyof typeof GENDER_MAPPING

/**
 * Supported UI locale code (e.g. 'en', 'fr'). Derived from `SUPPORTED_LOCALES`
 * so the union stays in lockstep with the runtime list of locale files.
 */
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Translation dictionary shape. Inferred from the English JSON file, which
 * serves as the canonical schema for every other locale.
 */
export type TranslationDict = typeof enDict

/**
 * Conversation states reflect what the companion is currently doing
 * Emotion states reflect the detected sentiment of the companion's response
 */
export type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking'
export type EmotionState = 'happy' | 'sad' | 'angry' | 'surprised' | 'thoughtful'
export type ExpressionState = ConversationState | EmotionState
export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'processing'

/**
 * Supported file types
 */
export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp'
export type DocumentFormat = 'txt' | 'md' | 'json' | 'csv' | 'pdf'

/**
 * Defined project interfaces
 */
export interface Avatar {
  id: string
  category: (typeof AVATAR_CATEGORIES)[number]
  gender: (typeof GENDERS)[number]
  colorScheme: (typeof COLOR_SCHEMES)[number]
  imageUrl: string
  name: string
}

export interface Message {
  id: string
  role: 'user' | 'companion'
  content: string
  imageBase64?: string  // Optional base64-encoded image
  imageFormat?: ImageFormat  // Image format for URL data:image
  documentContent?: string  // Extracted text from document
  documentName?: string  // Original filename for display
  documentFormat?: DocumentFormat  // Document format type
  timestamp: string
}

export interface ConversationData {
  id: string
  companionId: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface CompanionData {
  id: string
  name: string
  personality: string
  appearance: string
  imageUrl: string
  createdAt: string
}

export interface EmotionDetectionResult {
  emotion: EmotionState | null
}

export interface LLMModel {
  id: string
  name: string
  description?: string
  url?: string
  model: string  // Full model identifier (e.g., 'groq/compound', 'mixtral-8x7b-32768')
  visible: boolean // Whether show the given model in the settings panel or not
}

export interface LLMProvider {
  id: string
  name: string
  models: LLMModel[]
}

/**
 * Unified LLM API response with usage metrics
 * Works with all providers (Groq, OpenAI, Custom)
 */
export interface LLMResponse {
  response: string
  usage: TokenUsage | null
  imageBase64?: string
  imageFormat?: string
}

export interface STTModel {
  id: string
  name: string
  description?: string
  url?: string
  model: string  // Full model identifier (e.g., 'whisper-large-v3-turbo', 'whisper-1')
}

export interface STTProvider {
  id: string
  name: string
  models: STTModel[]
}

export interface ToolDetectionResult {
  toolsUsed: boolean
  response?: string
  executedTools?: string[]
}

/**
 * Unified token usage across all LLM providers
 * Supports both Groq (prompt_tokens/completion_tokens) and OpenAI (input_tokens/output_tokens) formats
 */
export interface TokenUsage {
  // Groq format
  prompt_tokens?: number
  completion_tokens?: number
  // OpenAI format
  input_tokens?: number
  output_tokens?: number
  // Common across all providers
  total_tokens: number
}

export interface TTSModel {
  id: string
  name: string
  description?: string
  url?: string
  model: string  // Full model identifier (e.g., 'gpt-4o-mini-tts', 'chatterbox')
}

export interface TTSProvider {
  id: string
  name: string
  models: TTSModel[]
}

/**
 * Settings stored in IndexedDB
 * Persists user preferences and customizations
 */
export interface StoredSettings {
  key: string // 'userSettings' as the singleton key
  selectedModel: string // Full model string (e.g., 'groq/compound')
  selectedProvider: string // Provider ID (e.g., 'groq', 'openai', 'custom')
  selectedPersonality: PersonalityType
  customPersonalityTraits?: string // Custom personality if personalityType is 'Custom'
  selectedCompanion: string // Companion ID (e.g., 'athena')
  selectedCompanionName: string // Display name
  avatarCategory: (typeof AVATAR_CATEGORIES)[number]
  avatarGender: GenderType
  avatarColorScheme: (typeof COLOR_SCHEMES)[number]
  visualFormat: VisualFormat
  memoryWindowSize: number // Conversation history window (1-10 messages)
  voiceProvider: string // TTS provider ID (e.g., 'openai', 'resemble-ai')
  selectedVoice: string // Selected voice ID for TTS
  voiceOutputEnabled: boolean // Whether to generate TTS for responses
  customProviderName?: string // For custom AI providers
  customProviderUrl?: string
  customModelName?: string
  privacyMode?: boolean // Whether to enable privacy mode (no data sent to external services)
  hasSTTSupport?: boolean // For custom providers, indicates if STT is supported
  customSTTModelName?: string // For custom providers, the STT model name
  customSTTUrl?: string // For custom providers, the STT API endpoint URL
  locale?: 'en' | 'fr' | 'de' | 'it' // UI language preference — falls back to browser detection if unset
  updatedAt: string
}

/**
 * Play audio blob with optional callbacks for play/end events
 * @param audioBlob - The audio blob to play
 * @param onPlay - Optional callback when audio starts playing
 * @param onEnd - Optional callback when audio finishes playing
 */
export interface AudioControls {
  stop: () => void
  pause: () => void
  resume: () => void
  getDuration: () => number
  getCurrentTime: () => number
  getAnalyser: () => AnalyserNode | null
}

/**
 * Responsive design tabs
 */
export type MobileTab = 'companion' | 'chat'
