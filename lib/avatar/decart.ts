'use client'

import { createDecartClient, models, type DecartSDKError } from '@decartai/sdk'
import type { ExpressionState } from '@/lib/types'
import { getAPIKey } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const DECART_MODEL = models.realtime('live_avatar')

/**
 * Behavior prompts per expression state.
 * Conversation states drive physical behavior, emotion states drive expression.
 * These are sent to Decart via setPrompt() on every state transition.
 */
const EXPRESSION_PROMPTS: Record<ExpressionState, string> = {
  // Conversation states
  idle:        'Breathe naturally and look forward calmly with soft blinking.',
  listening:   'Tilt your head slightly and look attentive, blinking occasionally.',
  thinking:    'Look slightly upward and to the side with a thoughtful expression, blink slowly.',
  speaking:    'Speak naturally with relaxed facial expression and subtle head movement.',
  // Emotion states
  happy:       'Smile warmly and nod gently with bright eyes and an upbeat expression.',
  sad:         'Look downward with a somber expression, slow blinking, slight head tilt down.',
  angry:       'Narrow eyes slightly, firm jaw, subtle tension in the face and neck.',
  surprised:   'Widen eyes and raise brows briefly then settle into a composed expression.',
  thoughtful:  'Look slightly to the side with calm introspection, slow deliberate blinking.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DecartConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface DecartClientOptions {
  /** Avatar image — relative path like /avatars/cyberpunk/f-01-vibrant.jpg */
  imageUrl: string
  /** Initial expression state */
  expressionState: ExpressionState
  /** Called when the animated WebRTC video stream is ready */
  onStream: (stream: MediaStream) => void
  /** Called when connection state changes */
  onConnectionChange: (state: DecartConnectionState) => void
  /** Called on SDK errors */
  onError: (error: string) => void
}

// ─── Decart Avatar Client ─────────────────────────────────────────────────────

/**
 * Manages the full Decart live_avatar WebRTC session lifecycle.
 *
 * Usage:
 *   const decart = new DecartAvatarClient(options)
 *   await decart.connect()
 *   await decart.playAudio(audioBlob)       // called after each TTS generation
 *   await decart.setExpression('happy')     // called on emotion/state changes
 *   decart.disconnect()                     // called on component unmount
 */
export class DecartAvatarClient {
  private realtimeClient: Awaited<ReturnType<ReturnType<typeof createDecartClient>['realtime']['connect']>> | null = null
  private options: DecartClientOptions
  private currentState: DecartConnectionState = 'idle'
  private hasErrored = false

  constructor(options: DecartClientOptions) {
    this.options = options
  }

  // ─── Connect ───────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    try {
      this.setState('connecting')

      // Retrieve encrypted API key from IndexedDB (same pattern as all other providers)
      const apiKey = await getAPIKey('decart')
      if (!apiKey) {
        throw new Error('Decart API key not found. Please add it in Settings > Customize > Visual Format.')
      }

      // Fetch avatar image as Blob — works with local /public paths
      const imageResponse = await fetch(this.options.imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to load avatar image: ${this.options.imageUrl}`)
      }
      const avatarImage = await imageResponse.blob()

      const client = createDecartClient({ apiKey })

      const initialPrompt = EXPRESSION_PROMPTS[this.options.expressionState] ?? EXPRESSION_PROMPTS.idle

      console.log('[Athena] Connecting to Decart live_avatar...')

      this.realtimeClient = await client.realtime.connect(null, {
        model: DECART_MODEL,
        initialState: {
          image: avatarImage,
          prompt: { text: initialPrompt, enhance: true },
        },
        onRemoteStream: (stream: MediaStream) => {
          console.log('[Athena] Decart stream received')
          this.options.onStream(stream)
        },
      })

      // Monitor connection state changes
      this.realtimeClient.on('connectionChange', (state: string) => {
        console.log('[Athena] Decart connection state:', state)
        if (state === 'connected') this.setState('connected')
        else if (state === 'disconnected') this.setState('disconnected')
      })

      // Handle SDK errors — guard ensures onError fires exactly once per connection attempt
      this.realtimeClient.on('error', (error: DecartSDKError) => {
        if (this.hasErrored) return
        this.hasErrored = true
        console.error('[Athena] Decart SDK error:', error.code, error.message)
        this.options.onError(error.message)
        this.setState('error')
      })

      this.setState('connected')
      console.log('[Athena] Decart live_avatar connected successfully')
    } catch (error) {
      if (!this.hasErrored) {
        this.hasErrored = true
        const message = error instanceof Error ? error.message : 'Unknown Decart connection error'
        console.error('[Athena] Decart connection failed:', message)
        this.options.onError(message)
        this.setState('error')
      }
      throw error
    }
  }

  // ─── Play Audio ────────────────────────────────────────────────────────────

  /**
   * Send TTS audio blob to Decart to animate the avatar.
   * Must be called AFTER connect() resolves.
   * Replaces direct audio.play() — Decart handles lip sync and animation.
   */
  async playAudio(audio: Blob | ArrayBuffer): Promise<void> {
    if (!this.realtimeClient || !this.realtimeClient.isConnected()) {
      console.warn('[Athena] Decart playAudio called but client is not connected')
      return
    }

    try {
      console.log('[Athena] Decart sending audio for animation...')
      await this.realtimeClient.playAudio(audio)
      console.log('[Athena] Decart audio playback complete')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio playback failed'
      console.error('[Athena] Decart playAudio error:', message)
      this.options.onError(message)
    }
  }

  // ─── Set Expression ────────────────────────────────────────────────────────────

  /**
   * Update avatar behavior prompt on expression state changes.
   * Called when lastDetectedEmotion or conversationState changes.
   */
  async setExpression(state: ExpressionState): Promise<void> {
    if (!this.realtimeClient || !this.realtimeClient.isConnected()) return

    const prompt = EXPRESSION_PROMPTS[state] ?? EXPRESSION_PROMPTS.idle
    try {
      await this.realtimeClient.setPrompt(prompt, { enhance: true })
      console.log('[Athena] Decart expression set to:', state)
    } catch (error) {
      console.error('[Athena] Decart setPrompt error:', error)
    }
  }

  // ─── Disconnect ────────────────────────────────────────────────────────────

  disconnect(): void {
    if (this.realtimeClient) {
      try {
        this.realtimeClient.disconnect()
        console.log('[Athena] Decart client disconnected')
      } catch (error) {
        console.error('[Athena] Decart disconnect error:', error)
      } finally {
        this.realtimeClient = null
        this.hasErrored = false
        this.setState('disconnected')
      }
    }
  }

  // ─── State helpers ─────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.realtimeClient?.isConnected() ?? false
  }

  getState(): DecartConnectionState {
    return this.currentState
  }

  private setState(state: DecartConnectionState): void {
    this.currentState = state
    this.options.onConnectionChange(state)
  }
}
