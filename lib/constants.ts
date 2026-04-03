/**
 * Domain constants for Athena
 * Single source of truth for all configuration options and selectable values
 */

import type { Avatar, LLMProvider, PersonalityType, VisualFormat, STTProvider, TTSProvider } from './types'

/**
 * Default Props
 * Single source of truth for all props
 */
export const DEFAULT_COMPANION_ID = 'athena'
export const DEFAULT_COMPANION_NAME = 'Athena'
export const DEFAULT_PERSONALITY: PersonalityType = 'Sarcastic'
export const DEFAULT_VISUAL_FORMAT: VisualFormat = 'static-2d'
export const DEFAULT_GENDER = 'F'
export const DEFAULT_COLOR_SCHEME = 'vibrant'
export const DEFAULT_AVATAR_CATEGORY = 'cyberpunk'
export const DEFAULT_MODEL_PROVIDER = 'groq'
export const DEFAULT_MODEL_ID = 'gpt-oss-120b'
export const DEFAULT_MODEL_NAME = 'openai/gpt-oss-120b'
export const DEFAULT_MEMORY_SIZE = 10

/**
 * Default LLM Config
 * Single source of truth for LLM services
 */
export const DEFAULT_GROQ_EMOTION_DETECTION_MODEL = 'llama-3.1-8b-instant'
export const DEFAULT_GROQ_STT_MODEL = 'whisper-large-v3-turbo'
export const DEFAULT_OPENAI_TOOL_DETECTION_MODEL = 'gpt-5.4-nano'
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
/** Milliseconds of inactivity before Decart live avatar disconnects to stop consuming credits */
export const LIVE_AVATAR_IDLE_TIMEOUT = 10000
/** Milliseconds to wait for Decart to connect before aborting and falling back to local audio */
export const LIVE_AVATAR_CONNECTION_TIMEOUT = 5000

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
      },
      {
        id: 'compound-mini',
        name: 'Compound Mini',
        model: 'groq/compound-mini',
        description: 'Faster variant with unified tool access. Single tool per request with 3x lower latency.',
        url: 'https://console.groq.com/docs/compound/systems/compound-mini',
        visible: false,
      },
      {
        id: 'llama-3-instant',
        name: 'Llama 3.1 8B',
        model: 'llama-3.1-8b-instant',
        description: 'Fast, cost-effective 8B model with 128K context window.',
        url: 'https://console.groq.com/docs/model/llama-3.1-8b-instant',
        visible: false,
      },
      {
        id: 'llama-4-scout',
        name: 'Llama 4 Scout',
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        description: 'Multimodal model supporting text and images with vision capabilities and 128K context.',
        url: 'https://console.groq.com/docs/model/meta-llama/llama-4-scout-17b-16e-instruct',
        visible: true,
      },
      {
        id: 'gpt-oss-120b',
        name: 'GPT-OSS 120B',
        model: 'openai/gpt-oss-120b',
        description: 'Frontier-grade agentic MoE model with 120B parameters. Advanced reasoning, and 131K context.',
        url: 'https://console.groq.com/docs/model/openai/gpt-oss-120b',
        visible: true,
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
      },
      {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        model: 'gpt-5.4-mini',
        description: 'Balanced model offering good performance and efficiency for general-purpose tasks.',
        url: 'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
        visible: true,
      },
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        model: 'gpt-5.4',
        description: 'Advanced model with enhanced capabilities for complex reasoning and nuanced tasks.',
        url: 'https://developers.openai.com/api/docs/models/gpt-5.4',
        visible: true,
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
} as const

/**
 * Emotion keyword dictionaries for sentiment analysis
 * Supports English and French
 * Each emotion has weighted keyword lists - more specific/strong words score higher
 */
export const EMOTION_KEYWORDS = {
  happy: {
    en: ['happy', 'joy', 'joyful', 'great', 'wonderful', 'amazing', 'fantastic', 'excellent', 'love', 'perfect', 'awesome', 'glad', 'delighted', 'excited', 'cheerful', 'celebrate', 'thrilled', 'laugh', 'fun', 'brilliant', 'congratulations', 'hooray', 'smile', 'pleased', 'enjoy'],
    fr: ['heureux', 'heureuse', 'joie', 'super', 'merveilleux', 'merveilleuse', 'fantastique', 'excellent', 'excellente', 'parfait', 'parfaite', 'incroyable', 'génial', 'géniale', 'ravie', 'ravi', 'enchanté', 'enchantée', 'content', 'contente', 'célébrer', 'bravo', 'félicitations', 'sourire', 'adore', 'aimer'],
  },
  sad: {
    en: ['sad', 'sorry', 'unfortunately', 'regret', 'disappoint', 'disappointed', 'miss', 'loss', 'lost', 'grief', 'grieve', 'mourn', 'unfortunate', 'difficult', 'struggle', 'pain', 'hurt', 'cry', 'tears', 'lonely', 'alone', 'heartbreak', 'broken', 'failed', 'failure'],
    fr: ['triste', 'tristesse', 'désolé', 'désolée', 'malheureusement', 'regret', 'regrette', 'dommage', 'perdu', 'perdue', 'perte', 'deuil', 'difficile', 'souffrance', 'douleur', 'pleurer', 'larmes', 'seul', 'seule', 'solitaire', 'brisé', 'brisée', 'échoué', 'échec'],
  },
  angry: {
    en: ['angry', 'anger', 'frustrated', 'frustrating', 'annoying', 'annoyed', 'ridiculous', 'outrageous', 'unacceptable', 'terrible', 'awful', 'wrong', 'stupid', 'absurd', 'disgusting', 'furious', 'rage', 'hate', 'unfair', 'offensive'],
    fr: ['en colère', 'fâché', 'fâchée', 'frustré', 'frustrée', 'frustrant', 'énervant', 'énervé', 'énervée', 'ridicule', 'inacceptable', 'terrible', 'affreux', 'affreuse', 'mauvais', 'stupide', 'absurde', 'dégoûtant', 'furieux', 'furieuse', 'haine', 'injuste'],
  },
  surprised: {
    en: ['surprised', 'surprising', 'unexpected', 'unbelievable', 'incredible', 'astonishing', 'wow', 'really', 'seriously', 'shocking', 'shocked', 'remarkable', 'extraordinary', 'whoa', 'never expected', 'suddenly', 'actually', 'turns out'],
    fr: ['surpris', 'surprise', 'surprenant', 'inattendu', 'inattendue', 'incroyable', 'extraordinaire', 'choquant', 'choquante', 'remarquable', 'vraiment', 'sérieusement', 'soudainement', 'en fait', 'finalement', 'étonnant', 'étonnante'],
  },
  thoughtful: {
    en: ['interesting', 'consider', 'perhaps', 'however', 'although', 'complex', 'nuanced', 'perspective', 'reflect', 'wonder', 'ponder', 'think', 'analyze', 'question', 'deeper', 'examine', 'explore', 'philosophical', 'meaningful', 'significant'],
    fr: ['intéressant', 'intéressante', 'considérer', 'peut-être', 'cependant', 'bien que', 'complexe', 'nuancé', 'nuancée', 'perspective', 'réfléchir', 'penser', 'analyser', 'question', 'explorer', 'philosophique', 'significatif', 'significative', 'profond', 'profonde'],
  },
} as const

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
export const EMOTION_DISPLAY_DURATION = 4000

/**
 * Maximum number of messages to render in the chat UI
 * Older messages are kept in memory and storage but not rendered to prevent lag
 */
export const MAX_DISPLAY_MESSAGES = 30

/**
 * Memory window slider bounds — min/max number of messages kept in context for the LLM
 */
export const MIN_MEMORY_SIZE = 4
export const MAX_MEMORY_SIZE = 50

/**
 * Mobile swipping threshold
 */
export const MOBILE_SWIPE_THRESHOLD = 50 // px