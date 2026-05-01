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

/**
 * Per-state animation parameters consumed by the R3F avatars
 * (`r3f-animated-character.tsx`, `avatar-2-5d.tsx`).
 *
 * - `tint` / `tintStrength` / `glowColor` drive the colour wash and rim glow.
 * - `breathe*` / `sway*` / `bob*` / `shake*` drive the four mesh-level
 *   motion channels: vertical breathing, side-to-side sway, secondary bob,
 *   and horizontal shake. Amplitude `0` disables the channel.
 *
 * Keyed on the full `ExpressionState` union so the type system enforces
 * coverage when a new state (conversation or emotion) is added.
 */
export interface EmotionConfig {
  tint: [number, number, number]
  tintStrength: number
  glowColor: string
  // Mesh-level animation params (no UV distortion)
  breatheAmp: number    // Y translation — breathing up/down
  breatheSpeed: number  // breathing frequency
  swayAmp: number       // X rotation — gentle side tilt
  swaySpeed: number     // sway frequency
  bobAmp: number        // Y translation secondary — bounce/sink
  bobSpeed: number      // bob frequency
  shakeAmp: number      // X translation — horizontal shake (angry)
  shakeSpeed: number    // shake frequency
}

export interface EmotionDetectionResult {
  emotion: EmotionState | null
}

/**
 * Boolean capability flags describing what an LLM model can natively handle.
 *
 * All fields are optional — `undefined` is interpreted as `false`. The
 * registry stays terse for simple text-only models (`capabilities: {}`)
 * while still being type-checked: typos in capability names fail at compile
 * time, unlike a string-array approach.
 *
 * Used by `resolveModelForCapabilities()` in `lib/llm/router.ts` to pick
 * the right model when a request requires capabilities the chosen model
 * lacks (e.g. a vision-required request on a text-only model auto-falls
 * back to the first model in the same provider that satisfies all required
 * capabilities). Also used by the model picker UI to surface capability
 * badges and by `lib/llm/tools.ts` to find a tool-capable model for tool
 * detection.
 *
 * Adding a new capability: extend this interface, then fill in the flag
 * for every model in `LLM_PROVIDERS` (TypeScript won't force this since
 * fields are optional, but reviewers should). No other code changes needed.
 */
export interface LLMModelCapabilities {
  /** Accepts image inputs via `image_url` / multimodal content blocks. */
  vision?: boolean
  /** Can fetch and parse URLs natively (e.g. Groq compound's built-in browser). */
  urls?: boolean
  /** Accepts file/document uploads (PDF, etc.) for in-context parsing. */
  documents?: boolean
  /** Supports OpenAI-style function calling / tool use. */
  tools?: boolean
  /** Accepts audio inputs via `input_audio` content blocks. */
  audio?: boolean
  /** Has built-in web search (no separate tool wiring required). */
  webSearch?: boolean
}

export interface LLMModel {
  id: string
  name: string
  description?: string
  url?: string
  model: string  // Full model identifier (e.g., 'groq/compound', 'mixtral-8x7b-32768')
  visible: boolean // Whether show the given model in the settings panel or not
  capabilities: LLMModelCapabilities  // What the model can natively handle. Empty `{}` for text-only.
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

export interface EmotionModel {
  id: string
  name: string
  description?: string
  url?: string
  model: string  // Full model identifier (e.g. 'gpt-5.4-nano', 'llama-3.1-8b-instant')
}

/**
 * Emotion-detection provider entry. Mirrors `STTProvider` and `TTSProvider`
 * so the three capability registries can be walked the same way.
 *
 * Emotion detection runs on every assistant response, so models here are
 * deliberately the smallest/fastest variant each provider offers — accuracy
 * on a single-token classification task is high enough across the board that
 * paying for a flagship is wasteful. Adapters in `lib/llm/{provider}.ts`
 * read their model from this registry via `getEmotionModel()` in
 * `lib/llm/router.ts`, never hardcoded.
 */
export interface EmotionProvider {
  id: string
  name: string
  models: EmotionModel[]
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
