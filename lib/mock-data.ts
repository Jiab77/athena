/**
 * Mocked data for Athena MVP
 * Used for design-first development (replaced with real data in Phase B)
 * Type definitions are in @/lib/types
 */

import type { Message, ConversationData, CompanionData } from './types'
import { DEFAULT_COMPANION_NAME, DEFAULT_PERSONALITY } from './constants'

/**
 * Mock companion: Athena (test companion)
 */
export const mockAthenaCompanion: CompanionData = {
  id: 'companion-1',
  name: DEFAULT_COMPANION_NAME,
  personality: DEFAULT_PERSONALITY,
  appearance: 'Cyberpunk anime-style hacker girl, neon purple eyes, sleek white and cyan futuristic outfit with glowing circuit patterns, holographic floating screens',
  imageUrl: '/avatars/cyberpunk/f-03-vibrant.jpg',
  createdAt: new Date().toISOString(),
}

/**
 * Mock conversations with Athena
 */
export const mockConversations: ConversationData[] = [
  {
    id: 'conv-1',
    companionId: 'companion-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello Athena! What do you think about privacy in the digital age?',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'companion',
        content:
          'Privacy is fundamental to human dignity. In our current era, data has become a commodity, yet most people don\'t realize the extent of what\'s being collected about them. I believe individuals should have complete control over their own digital identity.',
        timestamp: new Date(Date.now() - 540000).toISOString(),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Do you think encryption is the answer?',
        timestamp: new Date(Date.now() - 480000).toISOString(),
      },
      {
        id: 'msg-4',
        role: 'companion',
        content:
          'Encryption is necessary but not sufficient. End-to-end encryption protects data in transit, but metadata tells a story too. Who you talk to, when you talk, how often—these patterns reveal as much as content. True privacy requires multiple layers: encrypted storage, metadata protection, and user awareness.',
        timestamp: new Date(Date.now() - 420000).toISOString(),
      },
      {
        id: 'msg-5',
        role: 'user',
        content: 'That makes sense. What about local inference for AI models?',
        timestamp: new Date(Date.now() - 360000).toISOString(),
      },
      {
        id: 'msg-6',
        role: 'companion',
        content:
          'Local inference is a game-changer. Running models locally means your data never leaves your device. Combined with fine-tuning on your personal data, you get an AI that truly understands you—without sacrificing privacy. It\'s the future of personalization.',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'conv-2',
    companionId: 'companion-1',
    messages: [
      {
        id: 'msg-7',
        role: 'user',
        content: 'Hi! I had a rough day. Can we talk?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-8',
        role: 'companion',
        content:
          "Of course. I'm here to listen. Sometimes the best remedy for a rough day is to talk it through. What happened?",
        timestamp: new Date(Date.now() - 3540000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3540000).toISOString(),
  },
]

/**
 * Mock current conversation (for active chat display)
 */
export const mockCurrentConversation: ConversationData = mockConversations[0]

/**
 * Get mock message history for display
 */
export function getMockMessages(): Message[] {
  return mockCurrentConversation.messages
}

/**
 * Get all mock companions (for future companion selection)
 */
export function getMockCompanions(): CompanionData[] {
  return [mockAthenaCompanion]
}

/**
 * Mock companion selection state
 */
export const mockSelectedCompanionId = 'companion-1'
