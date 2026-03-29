'use client'

/**
 * lib/brain.ts — Shared companion brain logic
 *
 * Centralizes all stateful logic that drives the companion experience:
 * - LLM call pipeline (text + voice input)
 * - TTS routing (local audio or Decart live avatar)
 * - Decart WebRTC lifecycle (connect, idle timeout, disconnect)
 * - Voice recording and transcription
 * - Emotion and expression state
 * - Conversation persistence (encrypted)
 *
 * Consumed by:
 * - merged-companion-chat.tsx  — web panel (chat + companion side by side)
 * - /companion/[id]            — popup window (companion only)
 * - /chat/[id]                 — popup window (chat only)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { transcribeAudio, callLLM } from '@/lib/llm/router'
import { generateAndPlayTTS, generateTTSBlob, playAudio } from '@/lib/utils'
import { useDB } from '@/lib/db-context'
import { encryptData, decryptData } from '@/lib/crypto'
import {
  DEFAULT_COMPANION_ID,
  DEFAULT_AUDIO_TYPE,
  LIVE_AVATAR_IDLE_TIMEOUT,
  LIVE_AVATAR_CONNECTION_TIMEOUT,
} from '@/lib/constants'
import { detectEmotion } from '@/lib/llm/emotions'
import { DecartAvatarClient } from '@/lib/avatar/decart'
import type { CompanionData, Message, ExpressionState, EmotionState, VisualFormat } from '@/lib/types'

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'processing'

export interface BrainOptions {
  companion: CompanionData
  visualFormat?: VisualFormat
  voiceOutputEnabled: boolean
  isOpen: boolean
}

export interface BrainState {
  // Expression / emotion
  expressionState: ExpressionState
  lastDetectedEmotion: EmotionState | null
  setLastDetectedEmotion: (emotion: EmotionState | null) => void
  // Voice input
  voiceState: VoiceState
  sttSupported: boolean
  // Decart live avatar
  decartStream: MediaStream | null
  decartReady: boolean
  decartError: string | null
  // Actions
  handleMicClick: () => Promise<void>
  handleSendMessage: (text: string) => Promise<void>
  playWithDecart: (audioBlob: Blob) => Promise<void>
  handleExpressionChange: (state: ExpressionState) => void
}

export function useBrain({
  companion,
  visualFormat,
  voiceOutputEnabled,
  isOpen,
}: BrainOptions): BrainState {
  const [expressionState, setExpressionState] = useState<ExpressionState>('idle')
  const [lastDetectedEmotion, setLastDetectedEmotion] = useState<EmotionState | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [sttSupported, setSttSupported] = useState(true)
  const [decartStream, setDecartStream] = useState<MediaStream | null>(null)
  const [decartReady, setDecartReady] = useState(false)
  const [decartError, setDecartError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const decartClientRef = useRef<DecartAvatarClient | null>(null)
  const decartIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { db, dbReady } = useDB()
  const isLiveAvatar = visualFormat === 'live-avatar'

  // ─── Decart idle timer ───────────────────────────────────────────────────────

  const clearIdleTimer = useCallback(() => {
    if (decartIdleTimerRef.current) {
      clearTimeout(decartIdleTimerRef.current)
      decartIdleTimerRef.current = null
    }
  }, [])

  const startIdleTimer = useCallback(() => {
    clearIdleTimer()
    console.log('[Brain] Decart idle timer started —', LIVE_AVATAR_IDLE_TIMEOUT, 'ms')
    decartIdleTimerRef.current = setTimeout(() => {
      console.log('[Brain] Decart idle timeout reached — disconnecting to save credits')
      if (decartClientRef.current) {
        decartClientRef.current.disconnect()
        decartClientRef.current = null
      }
      setDecartStream(null)
      setDecartReady(false)
    }, LIVE_AVATAR_IDLE_TIMEOUT)
  }, [clearIdleTimer])

  // ─── Decart mount / unmount lifecycle ───────────────────────────────────────

  useEffect(() => {
    if (!isLiveAvatar || !isOpen) return

    console.log('[Brain] Mounting Decart client for companion:', companion.name)

    const client = new DecartAvatarClient({
      imageUrl: companion.imageUrl || '',
      expressionState: expressionState,
      onStream: (stream) => {
        console.log('[Brain] Decart initial stream ready')
        setDecartStream(stream)
        setDecartReady(true)
        setDecartError(null)
      },
      onConnectionChange: (state) => {
        console.log('[Brain] Decart connection state:', state)
        if (state === 'disconnected') {
          setDecartStream(null)
          setDecartReady(false)
        }
      },
      onError: (error) => {
        setDecartError((prev) => {
          if (prev) return prev
          console.error('[Brain] Decart error:', error)
          return error
        })
        decartClientRef.current = null
        setDecartStream(null)
        setDecartReady(false)
      },
    })

    decartClientRef.current = client
    client.connect().catch((err) =>
      console.error('[Brain] Decart initial connect failed:', err)
    )

    startIdleTimer()

    return () => {
      console.log('[Brain] Unmounting Decart client')
      clearIdleTimer()
      client.disconnect()
      decartClientRef.current = null
      setDecartStream(null)
      setDecartReady(false)
      setDecartError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveAvatar, isOpen, companion.imageUrl])

  // ─── Sync expression state to Decart ────────────────────────────────────────

  useEffect(() => {
    if (!decartReady || !decartClientRef.current) return
    console.log('[Brain] Syncing expression to Decart:', expressionState)
    decartClientRef.current.setExpression(expressionState)
  }, [expressionState, decartReady])

  // ─── Check STT support ───────────────────────────────────────────────────────

  useEffect(() => {
    const checkSTTSupport = async () => {
      if (!dbReady || !db) return
      try {
        const settings = await db.getSettings()
        setSttSupported(settings?.hasSTTSupport !== false)
        console.log('[Brain] STT support:', settings?.hasSTTSupport !== false)
      } catch (error) {
        console.error('[Brain] Error checking STT support:', error)
      }
    }
    checkSTTSupport()
  }, [db, dbReady])

  // ─── Decart audio playback with fallback ────────────────────────────────────

  const playWithDecart = useCallback(async (audioBlob: Blob): Promise<void> => {
    clearIdleTimer()

    try {
      if (!decartClientRef.current) {
        console.log('[Brain] Decart not connected — attempting reconnect...')
        setDecartError(null)

        const connectionTimeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Decart connection timed out after ${LIVE_AVATAR_CONNECTION_TIMEOUT}ms`)),
            LIVE_AVATAR_CONNECTION_TIMEOUT
          )
        )

        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const client = new DecartAvatarClient({
              imageUrl: companion.imageUrl || '',
              expressionState: expressionState,
              onStream: (stream) => {
                console.log('[Brain] Decart reconnect stream ready')
                setDecartStream(stream)
                setDecartReady(true)
                setDecartError(null)
              },
              onConnectionChange: (state) => {
                console.log('[Brain] Decart reconnect connection state:', state)
                if (state === 'connected') resolve()
                if (state === 'disconnected') {
                  setDecartStream(null)
                  setDecartReady(false)
                }
              },
              onError: (error) => {
                setDecartError((prev) => {
                  if (prev) return prev
                  console.error('[Brain] Decart reconnect error:', error)
                  return error
                })
                decartClientRef.current = null
                setDecartStream(null)
                setDecartReady(false)
                reject(new Error(error))
              },
            })
            decartClientRef.current = client
            client.connect().catch(reject)
          }),
          connectionTimeout,
        ])
      }

      if (!decartClientRef.current) throw new Error('Decart client unavailable after connect')
      console.log('[Brain] Playing audio via Decart')
      await decartClientRef.current.playAudio(audioBlob)
      console.log('[Brain] Decart audio done — starting idle timer')
      startIdleTimer()
    } catch (err) {
      console.warn('[Brain] Decart unavailable — falling back to local audio:', err)
      await playAudio(audioBlob)
    }
  }, [clearIdleTimer, startIdleTimer, companion.imageUrl, expressionState])

  // ─── Conversation helpers ────────────────────────────────────────────────────

  const loadConversation = useCallback(async (): Promise<Message[]> => {
    if (!db) return []
    try {
      const settings = await db.getSettings()
      const companionId = settings?.selectedCompanion || DEFAULT_COMPANION_ID
      const stored = await db.getConversation(companionId)
      if (!stored) return []
      const messagesJson = await decryptData(stored.messagesEncrypted, 'athena-conversations')
      console.log('[Brain] Loaded conversation for companion:', companionId)
      return JSON.parse(messagesJson)
    } catch (error) {
      console.error('[Brain] Error loading conversation:', error)
      return []
    }
  }, [db])

  const saveConversation = useCallback(async (messages: Message[]): Promise<void> => {
    if (!db) return
    try {
      const settings = await db.getSettings()
      const companionId = settings?.selectedCompanion || DEFAULT_COMPANION_ID
      const messagesToSave = messages.map((msg) => ({
        ...msg,
        imageBase64: undefined,
        imageFormat: undefined,
        documentContent: undefined,
        documentFormat: undefined,
      }))
      const [companionIdEncrypted, messagesEncrypted, metadataEncrypted] = await Promise.all([
        encryptData(companionId, 'athena-conversations'),
        encryptData(JSON.stringify(messagesToSave), 'athena-conversations'),
        encryptData(JSON.stringify({ updatedAt: new Date().toISOString() }), 'athena-conversations'),
      ])
      await db.storeConversation({ id: companionId, companionIdEncrypted, messagesEncrypted, metadataEncrypted })
      console.log('[Brain] Conversation saved encrypted for companion:', companionId)
      window.dispatchEvent(new CustomEvent('conversation-updated'))
    } catch (error) {
      console.error('[Brain] Error saving conversation:', error)
    }
  }, [db])

  // ─── TTS routing ─────────────────────────────────────────────────────────────

  const handleTTS = useCallback(async (
    text: string,
    onDone: () => void
  ): Promise<void> => {
    if (!text || (!isLiveAvatar && !voiceOutputEnabled)) {
      onDone()
      return
    }

    setExpressionState('speaking')
    console.log('[Brain] TTS routing — isLiveAvatar:', isLiveAvatar)

    try {
      if (isLiveAvatar) {
        const audioBlob = await generateTTSBlob(text)
        await playWithDecart(audioBlob)
      } else {
        await generateAndPlayTTS(
          text,
          () => setExpressionState('speaking'),
          () => {
            setExpressionState('idle')
            setLastDetectedEmotion(null)
          }
        )
      }
    } catch (ttsError) {
      console.error('[Brain] TTS failed:', ttsError)
    }

    setExpressionState('idle')
    setLastDetectedEmotion(null)
    onDone()
  }, [isLiveAvatar, voiceOutputEnabled, playWithDecart])

  // ─── LLM + save + TTS pipeline ──────────────────────────────────────────────

  const handleSendMessage = useCallback(async (text: string): Promise<void> => {
    console.log('[Brain] handleSendMessage:', text)
    setExpressionState('thinking')

    try {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }

      const history = await loadConversation()
      const allMessages = [...history, userMessage]
      const settings = await db?.getSettings()
      const selectedProvider = settings?.selectedProvider || 'groq'
      const result = await callLLM(allMessages, selectedProvider)
      console.log('[Brain] LLM response received, provider:', selectedProvider, 'reasoning:', result.reasoning ?? 'none')

      // Fire-and-forget emotion detection — pass provider so correct API key is used
      detectEmotion(result.response, selectedProvider).then(({ emotion }) => {
        console.log('[Brain] Detected emotion:', emotion)
        if (emotion) setLastDetectedEmotion(emotion)
      })

      const companionMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'companion',
        content: result.response,
        timestamp: new Date().toISOString(),
      }

      await saveConversation([...allMessages, companionMessage])
      await handleTTS(result.response, () => {})
    } catch (error) {
      console.error('[Brain] Error in handleSendMessage:', error)
      setExpressionState('idle')
    }
  }, [loadConversation, saveConversation, handleTTS])

  // ─── Voice recording ─────────────────────────────────────────────────────────

  const processVoiceInput = useCallback(async (audioBlob: Blob): Promise<void> => {
    setVoiceState('transcribing')
    setExpressionState('thinking')
    console.log('[Brain] Transcribing voice input...')

    try {
      const transcribedText = await transcribeAudio(audioBlob)
      if (!transcribedText || transcribedText.trim() === '') {
        console.log('[Brain] Empty transcription — aborting')
        setVoiceState('idle')
        setExpressionState('idle')
        return
      }

      console.log('[Brain] Transcription result:', transcribedText)
      setVoiceState('processing')
      await handleSendMessage(transcribedText)
    } catch (error) {
      console.error('[Brain] Error processing voice input:', error)
    } finally {
      setVoiceState('idle')
      setExpressionState('idle')
    }
  }, [handleSendMessage])

  const handleMicClick = useCallback(async (): Promise<void> => {
    if (voiceState === 'recording') {
      console.log('[Brain] Stopping recording')
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      return
    }

    if (voiceState !== 'idle') return

    console.log('[Brain] Starting recording')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: DEFAULT_AUDIO_TYPE })
        await processVoiceInput(audioBlob)
      }

      mediaRecorder.start()
      setVoiceState('recording')
      setExpressionState('listening')
    } catch (error) {
      console.error('[Brain] Error starting recording:', error)
      setVoiceState('idle')
    }
  }, [voiceState, processVoiceInput])

  const handleExpressionChange = useCallback((state: ExpressionState) => {
    setExpressionState(state)
  }, [])

  return {
    expressionState,
    lastDetectedEmotion,
    setLastDetectedEmotion,
    voiceState,
    sttSupported,
    decartStream,
    decartReady,
    decartError,
    handleMicClick,
    handleSendMessage,
    playWithDecart,
    handleExpressionChange,
  }
}
