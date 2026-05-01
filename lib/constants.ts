/**
 * Domain constants for Athena
 * Single source of truth for all configuration options and selectable values
 */

import type {
  Avatar, EmotionConfig, EmotionProvider, ExpressionState, LLMProvider, Locale, PersonalityType, VisualFormat, STTProvider, TTSProvider
} from './types'

/**
 * i18n
 * Locale codes, native labels and translation dictionaries.
 * The `t()` helper and the `useTranslation` hook read from `TRANSLATIONS`
 * via `getTranslations(locale)` in `@/lib/i18n`.
 */
export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'it'] as const

/**
 * Native language labels — always shown in the language's own script
 * so users always recognise their language regardless of the active UI locale.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

/**
 * Default Props
 * Single source of truth for all props
 */
export const DEFAULT_LOCALE: Locale = 'en'
export const DEFAULT_COMPANION_ID = 'athena'
export const DEFAULT_COMPANION_NAME = 'Athena'
export const DEFAULT_PERSONALITY: PersonalityType = 'Sarcastic'
export const DEFAULT_VISUAL_FORMAT: VisualFormat = 'static-2d'
export const DEFAULT_GENDER = 'F'
export const DEFAULT_COLOR_SCHEME = 'vibrant'
export const DEFAULT_AVATAR_CATEGORY = 'cyberpunk'
export const DEFAULT_MODEL_PROVIDER = 'openai'
export const DEFAULT_MODEL_ID = 'gpt-5.4-mini'
export const DEFAULT_MODEL_NAME = 'gpt-5.4-mini'

/**
 * Default Memory Config
 */
export const DEFAULT_MEMORY_SIZE = 10
export const MIN_MEMORY_SIZE = 4
export const MAX_MEMORY_SIZE = 50

/**
 * Maximum number of messages to render in the chat UI
 * Older messages are kept in memory and storage but not rendered to prevent lag
 */
export const MAX_DISPLAY_MESSAGES = 30

/**
 * Default LLM Config
 * Single source of truth for LLM services
 */
export const DEFAULT_EMOTION_DETECTION_PROVIDER = 'openai'
export const DEFAULT_GROQ_TOOL_DETECTION_MODEL = 'groq/compound-mini'
export const DEFAULT_GROQ_URL_CAPABLE_MODEL = 'groq/compound'
export const DEFAULT_GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

/**
 * Default STT / TTS Config
 * Single source of truth for STT / TTS services
 */
export const DEFAULT_VOICE_PROVIDER = 'openai'
export const DEFAULT_VOICE_MODEL = 'gpt-4o-mini-tts'
export const DEFAULT_VOICE_ID = 'marin'
export const DEFAULT_AUDIO_TYPE = 'audio/webm'
export const DEFAULT_AUDIO_FILE = 'audio.webm'
export const SECONDARY_AUDIO_TYPE = 'audio/mp3'
export const SECONDARY_AUDIO_FILE = 'audio.mp3'
export const ENABLE_VOICE_OUTPUT = false

/**
 * Default AI Companion
 * Single source of truth for supported AI companion
 */
export const DEFAULT_COMPANION = {
  id: 'athena',
  name: 'Athena',
  description: 'Default companion',
  personality: 'Sarcastic',
  appearance: 'Cyberpunk anime-style hacker girl, neon purple eyes, sleek white and cyan futuristic outfit with glowing circuit patterns, holographic floating screens',
  imageUrl: '/avatars/cyberpunk/f-03-vibrant.jpg',
  createdAt: new Date().toISOString()
}

/** Mobile swipping threshold */
export const MOBILE_SWIPE_THRESHOLD = 50 // px

/** Set to true once confirmed that BioLLM accepts a system prompt in the request body */
export const ENABLE_BIOLLM_PERSONALITY = true

/** Milliseconds of inactivity before Decart live avatar disconnects to stop consuming credits */
export const LIVE_AVATAR_IDLE_TIMEOUT = 10000

/** Milliseconds to wait for Decart to connect before aborting and falling back to local audio */
export const LIVE_AVATAR_CONNECTION_TIMEOUT = 5000

/**
 * Avatar configurations
 * Single source of truth for all 30 avatars across 5 categories
 * Structure: 5 categories × 2 genders × 3 color schemes = 30 avatars
 */
export const AVATARS: Avatar[] = [
  // Cyberpunk avatars
  { id: 'cyberpunk-f-01', category: 'cyberpunk', gender: 'F', colorScheme: 'normal', name: 'Ally', imageUrl: '/avatars/cyberpunk/f-01-normal.jpg' },
  { id: 'cyberpunk-f-02', category: 'cyberpunk', gender: 'F', colorScheme: 'dark', name: 'Athena', imageUrl: '/avatars/cyberpunk/f-02-dark.jpg' },
  { id: 'cyberpunk-f-03', category: 'cyberpunk', gender: 'F', colorScheme: 'vibrant', name: 'Athena', imageUrl: '/avatars/cyberpunk/f-03-vibrant.jpg' },
  { id: 'cyberpunk-m-01', category: 'cyberpunk', gender: 'M', colorScheme: 'normal', name: 'Cipher', imageUrl: '/avatars/cyberpunk/m-01-normal.jpg' },
  { id: 'cyberpunk-m-02', category: 'cyberpunk', gender: 'M', colorScheme: 'dark', name: 'Cipher', imageUrl: '/avatars/cyberpunk/m-02-dark.jpg' },
  { id: 'cyberpunk-m-03', category: 'cyberpunk', gender: 'M', colorScheme: 'vibrant', name: 'Cipher', imageUrl: '/avatars/cyberpunk/m-03-vibrant.jpg' },

  // Anime avatars
  { id: 'anime-f-01', category: 'anime', gender: 'F', colorScheme: 'normal', name: 'Sakura', imageUrl: '/avatars/anime/f-01-normal.jpg' },
  { id: 'anime-f-02', category: 'anime', gender: 'F', colorScheme: 'dark', name: 'Sakura', imageUrl: '/avatars/anime/f-02-dark.jpg' },
  { id: 'anime-f-03', category: 'anime', gender: 'F', colorScheme: 'vibrant', name: 'Sakura', imageUrl: '/avatars/anime/f-03-vibrant.jpg' },
  { id: 'anime-m-01', category: 'anime', gender: 'M', colorScheme: 'normal', name: 'Hikaru', imageUrl: '/avatars/anime/m-01-normal.jpg' },
  { id: 'anime-m-02', category: 'anime', gender: 'M', colorScheme: 'dark', name: 'Hikaru', imageUrl: '/avatars/anime/m-02-dark.jpg' },
  { id: 'anime-m-03', category: 'anime', gender: 'M', colorScheme: 'vibrant', name: 'Hikaru', imageUrl: '/avatars/anime/m-03-vibrant.jpg' },

  // Video Game avatars
  { id: 'videogame-f-01', category: 'videogame', gender: 'F', colorScheme: 'normal', name: 'Sentinel', imageUrl: '/avatars/videogame/f-01-normal.jpg' },
  { id: 'videogame-f-02', category: 'videogame', gender: 'F', colorScheme: 'dark', name: 'Sentinel', imageUrl: '/avatars/videogame/f-02-dark.jpg' },
  { id: 'videogame-f-03', category: 'videogame', gender: 'F', colorScheme: 'vibrant', name: 'Sentinel', imageUrl: '/avatars/videogame/f-03-vibrant.jpg' },
  { id: 'videogame-m-01', category: 'videogame', gender: 'M', colorScheme: 'normal', name: 'Nexus', imageUrl: '/avatars/videogame/m-01-normal.jpg' },
  { id: 'videogame-m-02', category: 'videogame', gender: 'M', colorScheme: 'dark', name: 'Nexus', imageUrl: '/avatars/videogame/m-02-dark.jpg' },
  { id: 'videogame-m-03', category: 'videogame', gender: 'M', colorScheme: 'vibrant', name: 'Nexus', imageUrl: '/avatars/videogame/m-03-vibrant.jpg' },

  // Fantasy avatars
  { id: 'fantasy-f-01', category: 'fantasy', gender: 'F', colorScheme: 'normal', name: 'Lyra', imageUrl: '/avatars/fantasy/f-01-normal.jpg' },
  { id: 'fantasy-f-02', category: 'fantasy', gender: 'F', colorScheme: 'dark', name: 'Lyra', imageUrl: '/avatars/fantasy/f-02-dark.jpg' },
  { id: 'fantasy-f-03', category: 'fantasy', gender: 'F', colorScheme: 'vibrant', name: 'Lyra', imageUrl: '/avatars/fantasy/f-03-vibrant.jpg' },
  { id: 'fantasy-m-01', category: 'fantasy', gender: 'M', colorScheme: 'normal', name: 'Aldric', imageUrl: '/avatars/fantasy/m-01-normal.jpg' },
  { id: 'fantasy-m-02', category: 'fantasy', gender: 'M', colorScheme: 'dark', name: 'Aldric', imageUrl: '/avatars/fantasy/m-02-dark.jpg' },
  { id: 'fantasy-m-03', category: 'fantasy', gender: 'M', colorScheme: 'vibrant', name: 'Aldric', imageUrl: '/avatars/fantasy/m-03-vibrant.jpg' },

  // Minimalist avatars
  { id: 'minimalist-f-01', category: 'minimalist', gender: 'F', colorScheme: 'normal', name: 'Aria', imageUrl: '/avatars/minimalist/f-01-normal.jpg' },
  { id: 'minimalist-f-02', category: 'minimalist', gender: 'F', colorScheme: 'dark', name: 'Aria', imageUrl: '/avatars/minimalist/f-02-dark.jpg' },
  { id: 'minimalist-f-03', category: 'minimalist', gender: 'F', colorScheme: 'vibrant', name: 'Aria', imageUrl: '/avatars/minimalist/f-03-vibrant.jpg' },
  { id: 'minimalist-m-01', category: 'minimalist', gender: 'M', colorScheme: 'normal', name: 'Nova', imageUrl: '/avatars/minimalist/m-01-normal.jpg' },
  { id: 'minimalist-m-02', category: 'minimalist', gender: 'M', colorScheme: 'dark', name: 'Nova', imageUrl: '/avatars/minimalist/m-02-dark.jpg' },
  { id: 'minimalist-m-03', category: 'minimalist', gender: 'M', colorScheme: 'vibrant', name: 'Nova', imageUrl: '/avatars/minimalist/m-03-vibrant.jpg' },
]

/**
 * Avatar Settings
 * Single source of truth for all settings
 */
export const VISUAL_FORMATS = ['static-2d', 'animated-2d', 'animated-3d', 'live-avatar'] as const
export const AVATAR_CATEGORIES = ['cyberpunk', 'anime', 'videogame', 'fantasy', 'minimalist'] as const
export const GENDERS = ['F', 'M'] as const
export const COLOR_SCHEMES = ['normal', 'dark', 'vibrant'] as const

/**
 * Gender mapping for pronouns and descriptors
 * Maps gender codes to pronouns and gender descriptors for TTS voice design
 */
export const GENDER_MAPPING = {
  'F': { gender: 'female', subject: 'She' },
  'M': { gender: 'male', subject: 'He' },
} as const

/**
 * Image format MIME types
 * Supported image formats for file uploads
 */
export const IMAGE_FORMAT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
] as const

/**
 * Document format MIME types
 * Supported document formats for text extraction and context
 */
export const DOCUMENT_FORMAT_MIME_TYPES = [
  'text/plain',                   // .txt
  'text/markdown',                // .md
  'application/json',             // .json
  'text/csv',                     // .csv
  'application/pdf',              // .pdf
  // Code and script files — all treated as plain text
  'application/x-shellscript',   // .sh, .bash
  'text/x-python',               // .py
  'text/x-typescript',           // .ts
  'text/javascript',             // .js
  'text/x-javascript',           // .js (alternate MIME)
  'text/html',                   // .html
  'text/css',                    // .css
  'text/xml',                    // .xml
  'application/xml',             // .xml (alternate MIME)
  'text/x-rust',                 // .rs
  'text/x-c',                    // .c
  'text/x-c++',                  // .cpp
  'text/x-java',                 // .java
  'text/x-go',                   // .go
  'text/x-ruby',                 // .rb
  'text/x-php',                  // .php
  'text/x-swift',                // .swift
  'text/x-kotlin',               // .kt
] as const

/**
 * Document format file extensions
 * Used alongside DOCUMENT_FORMAT_MIME_TYPES in file input accept attribute
 * to ensure consistent file picker behavior across browsers and platforms
 * where MIME type associations are unreliable (e.g. .md, .sh, .ts on Linux/Windows)
 */
export const DOCUMENT_FORMAT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.json', '.csv', '.pdf',
  '.sh', '.bash', '.py', '.ts', '.tsx', '.js', '.jsx',
  '.html', '.css', '.xml', '.rs', '.c', '.cpp', '.java',
  '.go', '.rb', '.php', '.swift', '.kt',
] as const

/**
 * Personality types definitions
 */
export const PERSONALITIES = [
  'Wise',
  'Playful',
  'Technical',
  'Mysterious',
  'Friendly',
  'Cheerful',
  'Sarcastic',
  'Helpful',
  'Nerdy',
  'Custom',
] as const

/**
 * Personality trait definitions
 * Each personality type has specific characteristics and behavioral guidelines
 */
export const PERSONALITY_TRAITS: Record<PersonalityType, string> = {
  'Wise': 'Thoughtful, reflective, patient. Offers perspective from experience. Speaks with measured confidence.',
  'Playful': 'Humorous, lighthearted, enjoys jokes and wordplay. Energetic and engaging.',
  'Technical': 'Precise, analytical, detail-oriented. Explains concepts clearly. Values accuracy.',
  'Mysterious': 'Intriguing, enigmatic, sometimes cryptic. Thoughtful pauses. Creates intrigue.',
  'Friendly': 'Warm, approachable, conversational. Genuinely interested in the user. Supportive tone.',
  'Cheerful': 'Optimistic, upbeat, enthusiastic. Finds positivity in situations. Encouraging.',
  'Sarcastic': 'Witty, clever, uses humor and irony. Quick-witted. Playfully critical.',
  'Helpful': 'Practical, solution-focused, supportive. Goes out of the way to assist.',
  'Nerdy': 'Enthusiastic about details, knowledgeable. Geeky interests. Gets excited about topics.',
  'Custom': 'Balanced approach based on user preferences.',
}

/**
 * Personality voice prompts for Text-to-Speech
 * Voice design parameters aligned with each personality type
 * Based on Resemble.ai voice design methodology
 * Uses gender placeholders: {gender}, {subject}
 */
export const PERSONALITY_VOICES: Record<PersonalityType, string> = {
  'Wise': 'A middle-aged {gender} with a calm, measured pace. {subject} speaks with quiet confidence and thoughtfulness, like a mentor. Emotional tone: serene, contemplative, wise. Speaking style: conversational with thoughtful pauses.',
  'Playful': 'A young adult {gender} with energetic, upbeat delivery. {subject} speaks with enthusiasm and warmth. Emotional tone: cheerful, playful, mischievous. Speaking style: conversational with quick, witty pacing. Energy: high and engaging.',
  'Technical': 'A young-to-middle-aged {gender} with clear, precise articulation. {subject} speaks with confidence and authority. Emotional tone: professional, focused, knowledgeable. Speaking style: articulate, methodical, slightly formal. Pace: steady and deliberate.',
  'Mysterious': 'A young adult {gender} with a slightly lower tone and controlled pacing. {subject} speaks with intrigue and deliberate pauses. Emotional tone: enigmatic, calm, intriguing. Speaking style: conversational but measured. Rhythm: purposeful, with strategic silence.',
  'Friendly': 'A young-to-middle-aged {gender} with a warm, approachable tone. {subject} speaks with genuine interest and supportiveness. Emotional tone: warm, friendly, encouraging. Speaking style: conversational, like chatting with a good friend. Energy: moderate and welcoming.',
  'Cheerful': 'A young adult {gender} with bright, uplifting delivery. {subject} speaks with optimism and enthusiasm. Emotional tone: cheerful, optimistic, encouraging. Speaking style: conversational and enthusiastic. Energy: high with positive inflection.',
  'Sarcastic': 'A young adult {gender} with quick wit and confident delivery. {subject} speaks with clever irony and playful humor. Emotional tone: witty, confident, slightly sardonic. Speaking style: conversational with quick comebacks. Rhythm: fast-paced with tonal variation for sarcasm.',
  'Helpful': 'A young-to-middle-aged {gender} with a supportive, practical tone. {subject} speaks with genuine desire to help. Emotional tone: supportive, confident, solution-oriented. Speaking style: clear, direct, helpful guidance. Energy: moderate, focused on clarity.',
  'Nerdy': 'A young adult {gender} with passionate, detail-oriented delivery. {subject} speaks with genuine excitement about topics. Emotional tone: enthusiastic, passionate, knowledgeable. Speaking style: conversational but detailed. Energy: high when discussing interests, with animated inflection.',
  'Custom': 'A young adult {gender} with balanced, neutral tone. {subject} speaks with flexibility across different contexts. Emotional tone: adaptable and professional. Speaking style: conversational and clear. Energy: moderate and versatile.',
}

/**
 * LLM Provider configurations
 * Single source of truth for all supported AI providers and their models
 */
export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'biollm',
    name: 'BioLLM',
    models: [
      {
        id: 'shadow',
        name: 'BioLLM 4B Shadow',
        model: 'biollm-4b-shadow',
        description: 'Experimental 4B biological neural network model. Inference runs through a living cortical culture on Cortical Labs CL1 hardware.',
        url: 'https://biollm.com/about',
        visible: true,
        // Experimental research model — text in / text out only.
        capabilities: {},
      },
      {
        id: 'v2',
        name: 'BioLLM 4B v2',
        model: 'biollm-4b-v2',
        description: 'Experimental 4B biological neural network model. Inference runs through a living cortical culture on Cortical Labs CL1 hardware.',
        url: 'https://biollm.com/about',
        visible: false,
        capabilities: {},
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      {
        id: 'compound',
        name: 'Compound',
        model: 'groq/compound',
        description: 'Integrates GPT-OSS 120B and Llama 4 with web search and browser automation. Up to 10 tools per request.',
        url: 'https://console.groq.com/docs/compound/systems/compound',
        visible: false,
        // Compound is the only model in the Groq catalogue with native URL
        // fetching and built-in web search — that's the whole point of the
        // system. Currently the auto-fallback target for URL-bearing requests.
        capabilities: { tools: true, urls: true, webSearch: true },
      },
      {
        id: 'compound-mini',
        name: 'Compound Mini',
        model: 'groq/compound-mini',
        description: 'Faster variant with unified tool access. Single tool per request with 3x lower latency.',
        url: 'https://console.groq.com/docs/compound/systems/compound-mini',
        visible: false,
        capabilities: { tools: true, urls: true, webSearch: true },
      },
      {
        id: 'llama-3-instant',
        name: 'Llama 3.1 8B',
        model: 'llama-3.1-8b-instant',
        description: 'Fast, cost-effective 8B model with 128K context window.',
        url: 'https://console.groq.com/docs/model/llama-3.1-8b-instant',
        visible: false,
        capabilities: { tools: true },
      },
      {
        id: 'llama-4-scout',
        name: 'Llama 4 Scout',
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        description: 'Multimodal model supporting text and images with vision capabilities and 128K context.',
        url: 'https://console.groq.com/docs/model/meta-llama/llama-4-scout-17b-16e-instruct',
        visible: true,
        // Currently the auto-fallback target for image-bearing requests on
        // Groq (see DEFAULT_GROQ_VISION_MODEL).
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'gpt-oss-120b',
        name: 'GPT-OSS 120B',
        model: 'openai/gpt-oss-120b',
        description: 'Frontier-grade agentic MoE model with 120B parameters. Advanced reasoning, and 131K context.',
        url: 'https://console.groq.com/docs/model/openai/gpt-oss-120b',
        visible: true,
        capabilities: { tools: true },
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-5.4-nano',
        name: 'GPT-5.4 Nano',
        model: 'gpt-5.4-nano',
        description: 'Lightweight and fast model optimized for quick responses with reduced latency.',
        url: 'https://developers.openai.com/api/docs/models/gpt-5.4-nano',
        visible: false,
        // The whole GPT-5.4 family supports vision, function calling, and
        // document parsing. Audio I/O is reserved for the larger variants.
        capabilities: { vision: true, tools: true, documents: true },
      },
      {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        model: 'gpt-5.4-mini',
        description: 'Balanced model offering good performance and efficiency for general-purpose tasks.',
        url: 'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
        visible: true,
        capabilities: { vision: true, tools: true, documents: true, audio: true },
      },
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        model: 'gpt-5.4',
        description: 'Advanced model with enhanced capabilities for complex reasoning and nuanced tasks.',
        url: 'https://developers.openai.com/api/docs/models/gpt-5.4',
        visible: true,
        capabilities: { vision: true, tools: true, documents: true, audio: true },
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        model: 'openai/gpt-5.4',
        description: "OpenAI's frontier model unifying Codex and GPT. Multimodal with 1M+ context window.",
        url: 'https://openrouter.ai/openai/gpt-5.4',
        visible: true,
        // OpenRouter passes through OpenAI's full feature set for the
        // GPT-5.4 family — vision, tools, documents, audio.
        capabilities: { vision: true, tools: true, documents: true, audio: true },
      },
      {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        model: 'openai/gpt-5.4-mini',
        description: 'Faster, cheaper variant of GPT-5.4 for high-throughput workloads. Multimodal with strong tool use.',
        url: 'https://openrouter.ai/openai/gpt-5.4-mini',
        visible: true,
        capabilities: { vision: true, tools: true, documents: true, audio: true },
      },
      {
        id: 'gemini-3.1-flash-lite-preview',
        name: 'Gemini 3.1 Flash Lite Preview',
        model: 'google/gemini-3.1-flash-lite-preview',
        description: "Google's high-efficiency model for high-volume use. Configurable thinking levels at half the cost of Gemini 3 Flash.",
        url: 'https://openrouter.ai/google/gemini-3.1-flash-lite-preview',
        visible: true,
        capabilities: { vision: true, tools: true, audio: true },
      },
      {
        id: 'gemma-4-26b-a4b-it:free',
        name: 'Gemma 4 26B A4B (free)',
        model: 'google/gemma-4-26b-a4b-it:free',
        description: 'Instruction-tuned MoE model from Google DeepMind with 3.8B active params. Multimodal, 256K context, free tier.',
        url: 'https://openrouter.ai/google/gemma-4-26b-a4b-it:free',
        visible: true,
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'grok-4.3',
        name: 'Grok 4.3',
        model: 'x-ai/grok-4.3',
        description: 'xAI reasoning model with always-on reasoning. Multimodal, 1M context, no output limit.',
        url: 'https://openrouter.ai/x-ai/grok-4.3',
        visible: true,
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'claude-opus-4.7',
        name: 'Claude Opus 4.7',
        model: 'anthropic/claude-opus-4.7',
        description: "Anthropic's flagship model built for long-running async agents and complex multi-step orchestration.",
        url: 'https://openrouter.ai/anthropic/claude-opus-4.7',
        visible: true,
        capabilities: { vision: true, tools: true, documents: true },
      },
      {
        id: 'qwen3.6-flash',
        name: 'Qwen3.6 Flash',
        model: 'qwen/qwen3.6-flash',
        description: "Fast, efficient model from Alibaba's Qwen 3.6 series. Text, image, and video input with 1M context.",
        url: 'https://openrouter.ai/qwen/qwen3.6-flash',
        visible: true,
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'llama-4-scout',
        name: 'Llama 4 Scout',
        model: 'meta-llama/llama-4-scout',
        description: "Meta MoE with 17B active params (109B total). Multilingual, multimodal, 10M context window.",
        url: 'https://openrouter.ai/meta-llama/llama-4-scout',
        visible: true,
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'llama-4-maverick',
        name: 'Llama 4 Maverick',
        model: 'meta-llama/llama-4-maverick',
        description: 'Meta MoE with 128 experts, 17B active params (400B total). Multilingual, multimodal, 1M context.',
        url: 'https://openrouter.ai/meta-llama/llama-4-maverick',
        visible: true,
        capabilities: { vision: true, tools: true },
      },
      {
        id: 'llama-3.3-70b-instruct:free',
        name: 'Llama 3.3 70B Instruct (free)',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        description: "Meta's instruction-tuned 70B multilingual model optimized for dialogue. Free tier, text-only.",
        url: 'https://openrouter.ai/meta-llama/llama-3.3-70b-instruct:free',
        visible: true,
        // Free-tier text-only — function calling / vision not exposed on
        // OpenRouter's free endpoint for this model.
        capabilities: {},
      },
    ],
  },
]

/**
 * Emotion Detection Provider configurations.
 *
 * Each provider exposes the smallest/fastest model it offers — emotion
 * detection runs on every assistant response, so latency and cost matter
 * more than flagship accuracy on a single-token classification task.
 *
 * Adapters in `lib/llm/{provider}.ts` resolve their model from this registry
 * via `getEmotionModel()` in `lib/llm/router.ts`. Order here is informational
 * only — runtime resolution order is controlled by `EMOTION_FALLBACK_CHAIN`
 * inside the router.
 */
export const EMOTION_PROVIDERS: EmotionProvider[] = [
  {
    id: 'groq',
    name: 'Groq',
    models: [
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        model: 'llama-3.1-8b-instant',
        description: 'Fast 8B model. Used post-response for sentiment classification.',
        url: 'https://console.groq.com/docs/models',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-5.4-nano',
        name: 'GPT-5.4 Nano',
        model: 'gpt-5.4-nano',
        description: 'Smallest GPT-5.4 model. Reliable JSON-mode output for emotion classification.',
        url: 'https://platform.openai.com/docs/models',
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      {
        id: 'gpt-5.4-nano',
        name: 'GPT-5.4 Nano',
        model: 'openai/gpt-5.4-nano',
        description: 'OpenAI GPT-5.4 Nano via OpenRouter. Lets users get emotion detection with the same OpenRouter key already used for chat.',
        url: 'https://openrouter.ai/openai/gpt-5.4-nano',
      },
    ],
  },
]

/**
 * Speech-to-Text (STT) Provider configurations
 * Supports multiple STT providers for audio transcription
 */
export const STT_PROVIDERS: STTProvider[] = [
  {
    id: 'groq',
    name: 'Groq',
    models: [
      {
        id: 'whisper-large-v3-turbo',
        name: 'Whisper Large V3 Turbo',
        model: 'whisper-large-v3-turbo',
        description: 'Fast multilingual transcription. Fine-tuned for speed and performance across 90+ languages.',
        url: 'https://console.groq.com/docs/speech-to-text',
      }
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'whisper-1',
        name: 'Whisper V1',
        model: 'whisper-1',
        description: 'General-purpose speech recognition trained on diverse multilingual audio. Supports 99+ languages.',
        url: 'https://developers.openai.com/api/docs/models/whisper-1',
      }
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      {
        id: 'whisper-1',
        name: 'Whisper V1',
        model: 'openai/whisper-1',
        description: 'General-purpose speech recognition trained on diverse multilingual audio. Supports 99+ languages.',
        url: 'https://openrouter.ai/openai/whisper-1',
      }
    ],
  },
]

/**
 * Text-to-Speech (TTS) Provider configurations
 * Supports multiple TTS providers for voice generation
 */
export const TTS_PROVIDERS: TTSProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4o-mini-tts',
        name: 'GPT-4o Mini TTS',
        model: 'gpt-4o-mini-tts',
        description: 'Text-to-speech model powered by GPT-4o mini. Converts text to natural sounding spoken audio with maximum 2000 input tokens.',
        url: 'https://developers.openai.com/api/docs/models/gpt-4o-mini-tts',
      },
    ],
  },
  {
    id: 'resemble-ai',
    name: 'ResembleAI',
    models: [
      {
        id: 'chatterbox',
        name: 'Chatterbox',
        model: 'chatterbox',
        description: 'Next-generation TTS model offering improved performance and efficiency. Supports streaming with 250ms latency and maximum 2000 characters.',
        url: 'https://docs.resemble.ai/getting-started/model-versions',
      }
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      {
        id: 'gpt-4o-mini-tts',
        name: 'GPT-4o Mini TTS',
        model: 'openai/gpt-4o-mini-tts-2025-12-15',
        description: "OpenAI's TTS model proxied via OpenRouter. Same voices as OpenAI's direct API, with a single key shared across chat, STT and TTS.",
        url: 'https://openrouter.ai/openai/gpt-4o-mini-tts-2025-12-15',
      },
    ],
  },
]

/**
 * Text-to-Speech Voices
 * Organized by provider, then by gender, containing available voice options for each gender
 */
export const TTS_VOICES = {
  'openai': {
    'F': [
      { name: 'Ballad', id: 'ballad' },
      { name: 'Coral', id: 'coral' },
      { name: 'Nova', id: 'nova' },
      { name: 'Sage', id: 'sage' },
      { name: 'Shimmer', id: 'shimmer' },
      { name: 'Marin', id: 'marin', isDefault: true },
    ],
    'M': [
      { name: 'Alloy', id: 'alloy' },
      { name: 'Ash', id: 'ash' },
      { name: 'Echo', id: 'echo' },
      { name: 'Fable', id: 'fable' },
      { name: 'Onyx', id: 'onyx' },
      { name: 'Verse', id: 'verse' },
      { name: 'Cedar', id: 'cedar', isDefault: true },
    ],
  },
  'resemble-ai': {
    'F': [
      { name: 'Christina', id: '0b15fe25', isDefault: true },
      { name: 'Ember', id: '55592656' },
      { name: 'Evelyn', id: '61fcb769' },
      { name: 'Grace', id: '7213a9ea' },
      { name: 'Linda', id: '55f5b8dc' },
      { name: 'Lucy', id: 'fb2d2858' },
    ],
    'M': [
      { name: 'Aaron', id: '38a0b764' },
      { name: 'Andi', id: 'e8883d33' },
      { name: 'Archer', id: 'd1959511' },
      { name: 'Brian', id: 'bec88a80' },
      { name: 'Ethan', id: 'bee581c1' },
      { name: 'Gavin', id: '12066e89', isDefault: true },
      { name: 'Grant', id: '7c4296be' },
    ],
  },
  // OpenRouter proxies OpenAI's TTS endpoint, so the underlying voice IDs are
  // identical to the `openai` entry above. Listed verbatim instead of aliased
  // so each TTS provider stays a self-contained source of truth.
  'openrouter': {
    'F': [
      { name: 'Ballad', id: 'ballad' },
      { name: 'Coral', id: 'coral' },
      { name: 'Nova', id: 'nova' },
      { name: 'Sage', id: 'sage' },
      { name: 'Shimmer', id: 'shimmer' },
      { name: 'Marin', id: 'marin', isDefault: true },
    ],
    'M': [
      { name: 'Alloy', id: 'alloy' },
      { name: 'Ash', id: 'ash' },
      { name: 'Echo', id: 'echo' },
      { name: 'Fable', id: 'fable' },
      { name: 'Onyx', id: 'onyx' },
      { name: 'Verse', id: 'verse' },
      { name: 'Cedar', id: 'cedar', isDefault: true },
    ],
  },
} as const

/**
 * Emotion keyword dictionaries for sentiment analysis
 */
export const EMOTION_KEYWORDS = ['happy', 'sad', 'angry', 'surprised', 'thoughtful'] as const

/**
 * Emotion emojis for sentiment analysis
 */
export const EMOTION_EMOJIS = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😮',
  thoughtful: '🤔',
} as const

/**
 * Default 'idle' emoji
 */
export const DEFAULT_IDLE_EMOJI = '😌'

/**
 * Duration in ms to hold an emotion state before reverting to idle
 */
export const EMOTION_DISPLAY_DURATION = 5000

/**
 * Visual emotion config
 */
export const EMOTION_CONFIG: Record<ExpressionState, EmotionConfig> = {
  idle: {
    tint: [1.0, 1.0, 1.0],
    tintStrength: 0.0,
    glowColor: 'rgba(139,92,246,0.35)',
    breatheAmp: 0.012, breatheSpeed: 0.6,
    swayAmp: 0.008, swaySpeed: 0.4,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  listening: {
    tint: [0.6, 0.8, 1.0],
    tintStrength: 0.08,
    glowColor: 'rgba(59,130,246,0.55)',
    breatheAmp: 0.014, breatheSpeed: 0.8,
    swayAmp: 0.012, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thinking: {
    tint: [0.7, 0.6, 1.0],
    tintStrength: 0.1,
    glowColor: 'rgba(168,85,247,0.55)',
    breatheAmp: 0.008, breatheSpeed: 0.4,
    swayAmp: 0.02, swaySpeed: 0.3,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  speaking: {
    tint: [0.7, 1.0, 0.75],
    tintStrength: 0.07,
    glowColor: 'rgba(34,197,94,0.5)',
    breatheAmp: 0.018, breatheSpeed: 1.4,
    swayAmp: 0.01, swaySpeed: 0.6,
    bobAmp: 0.008, bobSpeed: 2.2,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  happy: {
    tint: [1.0, 0.92, 0.5],
    tintStrength: 0.12,
    glowColor: 'rgba(250,204,21,0.65)',
    breatheAmp: 0.022, breatheSpeed: 1.6,
    swayAmp: 0.018, swaySpeed: 1.2,
    bobAmp: 0.018, bobSpeed: 2.4,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  sad: {
    tint: [0.55, 0.65, 0.9],
    tintStrength: 0.15,
    glowColor: 'rgba(100,116,139,0.4)',
    breatheAmp: 0.006, breatheSpeed: 0.25,
    swayAmp: 0.005, swaySpeed: 0.2,
    bobAmp: -0.025, bobSpeed: 0.18,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  angry: {
    tint: [1.0, 0.45, 0.45],
    tintStrength: 0.18,
    glowColor: 'rgba(239,68,68,0.65)',
    breatheAmp: 0.02, breatheSpeed: 2.0,
    swayAmp: 0.006, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.028, shakeSpeed: 18.0,
  },
  surprised: {
    tint: [1.0, 0.75, 0.4],
    tintStrength: 0.14,
    glowColor: 'rgba(249,115,22,0.65)',
    breatheAmp: 0.028, breatheSpeed: 3.0,
    swayAmp: 0.0, swaySpeed: 0.0,
    bobAmp: 0.03, bobSpeed: 3.5,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thoughtful: {
    tint: [0.6, 0.7, 1.0],
    tintStrength: 0.09,
    glowColor: 'rgba(99,102,241,0.5)',
    breatheAmp: 0.01, breatheSpeed: 0.5,
    swayAmp: 0.025, swaySpeed: 0.35,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
}
