'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, X, Volume2, VolumeX, FileText, Paperclip, ArrowUp, Brain, Play, Square, ExternalLink, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Message, ImageFormat, DocumentFormat, ConversationData, ExpressionState, EmotionState, AudioControls } from '@/lib/types'
import { callLLM, transcribeAudio, supportsSTT } from '@/lib/llm/router'
import { detectTools } from '@/lib/llm/tools'
import type { LLMResponse } from '@/lib/types'
import { detectEmotion } from '@/lib/llm/emotions'
import {
  generateAndPlayTTS,
  extractTextFromFile,
  getDocumentFormat,
  isDocumentMimeType,
  isImageMimeType
} from '@/lib/utils'
import { useDB } from '@/lib/db-context'
import { encryptData, decryptData } from '@/lib/crypto'
import {
  DEFAULT_COMPANION_ID,
  DEFAULT_AUDIO_TYPE,
  DEFAULT_MEMORY_SIZE,
  DEFAULT_MODEL_PROVIDER,
  DOCUMENT_FORMAT_MIME_TYPES,
  EMOTION_DISPLAY_DURATION,
  MAX_DISPLAY_MESSAGES,
} from '@/lib/constants'
import { MarkdownMessage } from './markdown-message'
import { WaveformRecorder } from './waveform-recorder'
import { TypingIndicator } from './typing-indicator'
import { ConversationHistory } from './conversation-history'
import { EmojiPicker } from './emoji-picker'
import { TokenUsagePopover, type TokenUsage } from './token-usage-popover'
import { TTSPlayback } from './tts-playback'

// Inline SVGs — avoids adding new lucide-react icon modules which can cause cache issues
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

interface ChatInterfaceProps {
  isChatVisible: boolean
  setIsChatVisible: (visible: boolean) => void
  /** When true, STT transcriptions are auto-submitted without requiring Enter/send */
  isVoiceMode?: boolean
  isOnline: boolean
  voiceOutputEnabled: boolean
  selectedVoice: string
  voiceProvider: string
  onVoiceOutputToggle: () => Promise<void>
  onExpressionChange?: (state: ExpressionState) => void
  onEmotionDetected?: (emotion: EmotionState | null) => void
  /** When set, TTS blob is passed here instead of played locally — used by Decart live avatar */
  onTTSReady?: (blob: Blob) => Promise<void>
  /** When true, renders in full-screen popup mode — hides pop-out button, closes window on X */
  isPopup?: boolean
}

export function ChatInterface({
  setIsChatVisible,
  isVoiceMode = false,
  isOnline,
  voiceOutputEnabled,
  selectedVoice,
  onVoiceOutputToggle,
  onExpressionChange,
  onEmotionDetected,
  onTTSReady,
  isPopup = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [displayMessages, setDisplayMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ base64: string; format: ImageFormat } | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<{ content: string; name: string; format: DocumentFormat } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)
  const [ttsAudioControls, setTTSAudioControls] = useState<AudioControls | null>(null)
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const [memorySize, setMemorySize] = useState(0)
  const [memoryWindowSize, setMemoryWindowSize] = useState(DEFAULT_MEMORY_SIZE)
  const [sttSupported, setSTTSupported] = useState(true)
  const [companionName, setCompanionName] = useState<string>('')
  const [companionImageUrl, setCompanionImageUrl] = useState<string>('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { db, dbReady } = useDB()

  // Load conversation history on mount and when updated externally (voice chat)
  useEffect(() => {
    if (!dbReady || !db) return

    const loadConversation = async () => {
      try {
        // Get companion ID from settings to use as conversation ID
        const settings = await db.getSettings()
        const companionId = settings?.selectedCompanion || DEFAULT_COMPANION_ID
        setConversationId(companionId)

        // Load companion details (used in popup header and companion window URL)
        // Name lives in settings (selectedCompanionName), image in StoredCompanion.imageUrl
        if (settings?.selectedCompanionName) setCompanionName(settings.selectedCompanionName)
        const comp = await db.getCompanion(companionId)
        if (comp?.imageUrl) setCompanionImageUrl(comp.imageUrl)

        // Load memory window size from settings
        if (settings?.memoryWindowSize) {
          setMemoryWindowSize(settings.memoryWindowSize)
        }

        // Load and decrypt conversation for this companion
        const stored = await db.getConversation(companionId)
        if (stored) {
          try {
            const messagesJson = await decryptData(stored.messagesEncrypted, 'athena-conversations')
            if (!messagesJson) {
              console.warn('[Athena] Could not decrypt conversation for companion:', companionId, '— stored data may be from an older format')
            } else {
              const messages = JSON.parse(messagesJson)
              if (Array.isArray(messages) && messages.length > 0) {
                setDisplayMessages(messages)
                console.log('[Athena] Loaded conversation for companion:', companionId, '- Messages:', messages.length)
              }
            }
          } catch (decryptError) {
            console.error('[Athena] Failed to decrypt conversation:', decryptError)
          }
        } else {
          console.log('[Athena] No previous conversation for companion:', companionId)
        }
      } catch (error) {
        setConversationId(DEFAULT_COMPANION_ID)
      }
    }
    loadConversation()

    // Listen for conversation updates from voice chat
    const handleConversationUpdate = () => {
      loadConversation()
    }
    window.addEventListener('conversation-updated', handleConversationUpdate)
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate)
  }, [db, dbReady])

  // Check STT support when component mounts or settings change
  useEffect(() => {
    const checkSTT = async () => {
      try {
        const supported = await supportsSTT()
        setSTTSupported(supported)
      } catch (error) {
        setSTTSupported(false)
      }
    }
    checkSTT()

    // Listen for settings changes (dispatched from settings-panel)
    const handleSettingsChange = () => {
      checkSTT()
    }
    window.addEventListener('settings-changed', handleSettingsChange)
    return () => window.removeEventListener('settings-changed', handleSettingsChange)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayMessages])

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      return
    }

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  // Derive and notify expression state changes
  useEffect(() => {
    let newState: ExpressionState = 'idle'

    if (isRecording) {
      newState = 'listening'
    } else if (isTranscribing) {
      newState = 'listening'
    } else if (isSpeaking) {
      newState = 'speaking'
    } else if (isLoading) {
      newState = 'thinking'
    }

    onExpressionChange?.(newState)
  }, [isLoading, isRecording, isTranscribing, isSpeaking, onExpressionChange])

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      alert('Microphone access denied or unavailable')
    }
  }

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    setIsTranscribing(true)

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: DEFAULT_AUDIO_TYPE })
        const transcribed = await transcribeAudio(audioBlob)

        if (isVoiceMode && transcribed.trim()) {
          // Voice mode: auto-submit without waiting for Enter
          // Set input synchronously via a ref-safe approach then send
          setInput(transcribed)
          // Use setTimeout(0) to let React flush the state before sending
          setTimeout(() => {
            handleSendMessage(transcribed)
          }, 0)
        } else {
          setInput((prev) => (prev ? prev + ' ' + transcribed : transcribed))
        }
      } catch (error) {
        alert('Failed to transcribe audio. Please try again.')
      } finally {
        setIsTranscribing(false)
        audioChunksRef.current = []
        mediaRecorderRef.current = null
        mediaRecorderRef.current?.getTracks?.()?.forEach((track) => track.stop())
      }
    }
  }

  const handleToggleVoiceOutput = async () => {
    await onVoiceOutputToggle()
  }

  const handleReplayTTS = async (messageId: string, content: string) => {
    // Stop if already replaying this message
    if (replayingMessageId === messageId) {
      ttsAudioControls?.stop()
      setReplayingMessageId(null)
      setTTSAudioControls(null)
      return
    }

    // Stop any currently playing TTS first
    ttsAudioControls?.stop()

    setReplayingMessageId(messageId)
    try {
      console.log('[Athena] Replaying TTS for message:', messageId)
      if (onTTSReady) {
        // Live avatar path — generate blob and route through Decart
        const { generateTTSBlob } = await import('@/lib/utils')
        const audioBlob = await generateTTSBlob(content)
        await onTTSReady(audioBlob)
      } else {
        const controls = await generateAndPlayTTS(
          content,
          undefined,
          () => {
            setReplayingMessageId(null)
            setTTSAudioControls(null)
          }
        )
        setTTSAudioControls(controls)
      }
    } catch (err) {
      console.error('[Athena] TTS replay failed:', err)
    } finally {
      setReplayingMessageId(null)
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }

  const handleSendMessage = async (overrideText?: string) => {
    const messageText = typeof overrideText === 'string' ? overrideText : input
    if ((!messageText.trim() && !selectedImage && !selectedDocument) || isLoading || !conversationId) return

    // Add user message with optional image or document (for current session only)
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageText,
      imageBase64: selectedImage?.base64,
      imageFormat: selectedImage?.format,
      documentContent: selectedDocument?.content,
      documentName: selectedDocument?.name,
      documentFormat: selectedDocument?.format,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...displayMessages, userMessage]
    setDisplayMessages(updatedMessages)
    setInput('')
    setSelectedImage(null)
    setSelectedDocument(null)

    // Save user message to DB (without image/document data to keep DB lean)
    if (db) {
      try {
        const settings = await db.getSettings()
        const messagesToSave = updatedMessages.map(msg => ({
          ...msg,
          imageBase64: undefined,
          imageFormat: undefined,
          documentContent: undefined,
          documentFormat: undefined,
          // Keep documentName for display in history
        }))
        await db.storeConversation({
          id: conversationId,
          companionId: settings?.selectedCompanion || DEFAULT_COMPANION_ID,
          messages: messagesToSave,
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        // ignore
      }
    }

    setIsLoading(true)
    try {
      const allMessages = updatedMessages

      // Tool detection — Groq and OpenAI providers, plain text only (skip if image or document present)
      const llmSettings = db ? await db.getSettings() : null
      const selectedProvider = llmSettings?.selectedProvider || DEFAULT_MODEL_PROVIDER
      const isGroqProvider = selectedProvider === 'groq'
      const isPlainText = !userMessage.imageBase64
        && !userMessage.documentContent
        && !/https?:\/\/\S+/.test(userMessage.content)

      console.log('[Athena] Tool detection check — provider:', selectedProvider, 'isPlainText:', isPlainText)

      let result: LLMResponse

      if (isGroqProvider && isPlainText) {
        console.log('[Athena] Running Groq tool detection for message:', userMessage.content)
        const toolResult = await detectTools(userMessage.content)

        if (toolResult.toolsUsed && toolResult.response) {
          // Groq: tools already executed — response is ready, skip main callLLM
          console.log('[Athena] Groq tools were used — skipping callLLM, using tool response directly')
          result = { response: toolResult.response, usage: null }
        } else {
          console.log('[Athena] Groq tool detection complete — no tools fired, proceeding to callLLM')
          result = await callLLM(allMessages, selectedProvider)
        }
      } else {
        console.log('[Athena] Skipping tool detection — proceeding to callLLM')
        result = await callLLM(allMessages, selectedProvider)
      }

      // Update token usage for display
      if (result.usage) {
        setTokenUsage(result.usage)
      }
      // Update memory size (number of messages in context)
      setMemorySize(allMessages.length)

      // Detect emotion from response async (fire-and-forget) — does not block message render or TTS
      console.log('[Athena] About to call detectEmotion with response:', result.response)
      console.log('[Athena] onExpressionChange available:', !!onExpressionChange)
      detectEmotion(result.response, selectedProvider).then(({ emotion }) => {
        console.log('[Athena] Detected emotion:', emotion)
        if (emotion) {
          if (onExpressionChange) {
            console.log('[Athena] Triggering expression change to:', emotion)
            onExpressionChange(emotion)
            setTimeout(() => onExpressionChange('idle'), EMOTION_DISPLAY_DURATION)
          }
          if (onEmotionDetected) {
            onEmotionDetected(emotion)
            // Reset happens when TTS finishes speaking, not on a fixed timer
          }
        }
      })

      const companionMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'companion',
        content: result.response,
        timestamp: new Date().toISOString(),
        ...(result.imageBase64 ? { imageBase64: result.imageBase64, imageFormat: result.imageFormat || 'png' } : {}),
      }

      // Strip document content from history after AI has processed it
      // The AI's response already contains any relevant summary/info from the document
      const messagesWithoutBulkyData = updatedMessages.map(msg => ({
        ...msg,
        documentContent: undefined,
        // Keep documentName for display purposes
      }))

      const finalMessages = [...messagesWithoutBulkyData, companionMessage]
      setDisplayMessages(finalMessages)

      // Generate TTS — route to Decart live avatar if onTTSReady is provided, otherwise play locally
      if (onTTSReady || (voiceOutputEnabled && selectedVoice)) {
        setIsSpeaking(true)
        setIsPlayingTTS(true)
        try {
          if (onTTSReady) {
            // Decart path: generate blob, hand off to live avatar for lip-sync
            const { generateTTSBlob } = await import('@/lib/utils')
            const audioBlob = await generateTTSBlob(result.response)
            await onTTSReady(audioBlob)
            setIsSpeaking(false)
            setIsPlayingTTS(false)
            onEmotionDetected?.(null)
          } else {
            // Standard path: generate and play locally
            const audioControls = await generateAndPlayTTS(
              result.response,
              () => {
                setIsSpeaking(true)
                setIsPlayingTTS(true)
              },
              () => {
                setIsSpeaking(false)
                setIsPlayingTTS(false)
                setTTSAudioControls(null)
                onEmotionDetected?.(null)
              }
            )
            setTTSAudioControls(audioControls)
          }
        } catch (ttsError) {
          console.error('[Athena] TTS generation failed:', ttsError)
          setIsSpeaking(false)
          setIsPlayingTTS(false)
          onEmotionDetected?.(null)
        }
      } else {
        // No TTS — reset emotion badge after a brief display duration
        setTimeout(() => onEmotionDetected?.(null), EMOTION_DISPLAY_DURATION)
      }

      // Encrypt and save conversation to DB (images not included in companion messages anyway)
      if (db) {
        const settings = await db.getSettings()
        const companionId = settings?.selectedCompanion || DEFAULT_COMPANION_ID
        const messagesToSave = finalMessages.map(msg => ({
          ...msg,
          imageBase64: undefined,
          imageFormat: undefined,
        }))
        try {
          const [companionIdEncrypted, messagesEncrypted, metadataEncrypted] = await Promise.all([
            encryptData(companionId, 'athena-conversations'),
            encryptData(JSON.stringify(messagesToSave), 'athena-conversations'),
            encryptData(JSON.stringify({ updatedAt: new Date().toISOString() }), 'athena-conversations'),
          ])
          await db.storeConversation({
            id: conversationId ?? companionId,
            companionIdEncrypted,
            messagesEncrypted,
            metadataEncrypted,
          })
          console.log('[Athena] Conversation saved encrypted for companion:', companionId)
        } catch (encryptError) {
          console.error('[Athena] Failed to encrypt conversation:', encryptError)
        }
      }
    } catch (error) {

      // Generate specific error message based on status code
      let userFriendlyMessage = 'Sorry, I encountered an error. Please try again.'

      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message: string }
        if (apiError.status === 413) {
          // Check if it's payload size or rate limit
          if (apiError.message.toLowerCase().includes('rate')) {
            userFriendlyMessage = 'Rate limit reached. Please wait a moment before trying again.'
          } else {
            userFriendlyMessage = 'Message too large. Try shortening your input or uploading a smaller file.'
          }
        } else if (apiError.status === 500) {
          userFriendlyMessage = 'Server error. Please try again in a moment.'
        } else if (apiError.status === 429) {
          userFriendlyMessage = 'Too many requests. Please wait before trying again.'
        } else if (apiError.status === 401 || apiError.status === 403) {
          userFriendlyMessage = 'Authentication error. Please check your API key.'
        }
      }

      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'companion',
        content: userFriendlyMessage,
        timestamp: new Date().toISOString(),
      }
      setDisplayMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (isImageMimeType(file.type)) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = (event.target?.result as string)?.split(',')[1]
        const format = file.type.split('/')[1] as ImageFormat
        if (base64String) {
          setSelectedImage({ base64: base64String, format })
          setSelectedDocument(null) // Clear any selected document
        }
      }
      reader.readAsDataURL(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Check if it's a document
    if (isDocumentMimeType(file.type)) {
      const text = await extractTextFromFile(file)
      if (text) {
        const format = getDocumentFormat(file.type)
        setSelectedDocument({ content: text, name: file.name, format })
        setSelectedImage(null) // Clear any selected image
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Handle image paste
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file && isImageMimeType(file.type)) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64String = (event.target?.result as string)?.split(',')[1]
            const format = file.type.split('/')[1] as ImageFormat
            if (base64String) {
              setSelectedImage({ base64: base64String, format })
              setSelectedDocument(null)
            }
          }
          reader.readAsDataURL(file)
          return
        }
      }

      // Handle file paste (if it's a file in clipboard)
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          // Check if it's an image
          if (isImageMimeType(file.type)) {
            e.preventDefault()
            const reader = new FileReader()
            reader.onload = (event) => {
              const base64String = (event.target?.result as string)?.split(',')[1]
              const format = file.type.split('/')[1] as ImageFormat
              if (base64String) {
                setSelectedImage({ base64: base64String, format })
                setSelectedDocument(null)
              }
            }
            reader.readAsDataURL(file)
            return
          }

          // Check if it's a document
          if (isDocumentMimeType(file.type)) {
            e.preventDefault()
            const text = await extractTextFromFile(file)
            if (text) {
              const format = getDocumentFormat(file.type)
              setSelectedDocument({ content: text, name: file.name, format })
              setSelectedImage(null)
            }
            return
          }
        }
      }
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
  }

  const clearDocument = () => {
    setSelectedDocument(null)
  }

  const handleNewConversation = async () => {
    // Clear messages but keep using the same companion ID
    setDisplayMessages([])
    // Clear from DB too
    if (db && dbReady) {
      try {
        const settings = await db.getSettings()
        const companionId = settings?.selectedCompanion || DEFAULT_COMPANION_ID
        await db.storeConversation({
          id: companionId,
          companionId,
          messages: [],
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        // ignore
      }
    }
  }

  const handleSelectConversation = (conv: ConversationData) => {
    setConversationId(conv.id)
    setDisplayMessages(conv.messages)
  }

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = input.substring(0, start)
    const after = input.substring(end)
    const newInput = before + emoji + after

    setInput(newInput)

    // Move cursor after the emoji
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          {isPopup && companionImageUrl && (
            <img
              src={companionImageUrl}
              alt={companionName}
              className="w-9 h-9 rounded-full object-cover border border-primary/40 flex-shrink-0"
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isPopup && companionName ? companionName : 'Chat'}
            </h2>
            <p className={`text-sm ${isOnline ? 'text-muted-foreground' : 'text-gray-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ConversationHistory
            currentConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
          {!isPopup && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => {
                      const url = `/chat/${conversationId || DEFAULT_COMPANION_ID}`
                      const chatName = `chat-${conversationId || DEFAULT_COMPANION_ID}`
                      const w = 800, h = 636
                      const top = Math.round((screen.availHeight - h) / 2)
                      window.open(url, chatName, `width=${w},height=${h},left=0,top=${top},resizable=no,scrollbars=no`)
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Pop out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!isPopup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setIsChatVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-4 space-y-4">
            {displayMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  No messages yet. Start a conversation!
                </p>
              </div>
            ) : (
              <>
                {displayMessages.slice(-MAX_DISPLAY_MESSAGES).map((message) => {
                  const isUser = message.role === 'user'
                  const isCopied = copiedMessageId === message.id

                  const handleCopy = () => {
                    navigator.clipboard.writeText(message.content)
                    setCopiedMessageId(message.id)
                    setTimeout(() => setCopiedMessageId(null), 2000)
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex group ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Copy button — left side for user messages */}
                      {isUser && (
                        <button
                          onClick={handleCopy}
                          className="self-start mt-1 mr-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-pointer"
                          aria-label="Copy message"
                        >
                          {isCopied
                            ? <span className="text-green-500"><CheckIcon /></span>
                            : <CopyIcon />
                          }
                        </button>
                      )}

                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${isUser
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-secondary text-secondary-foreground rounded-bl-none'
                          }`}
                      >
                        {message.imageBase64 && message.imageFormat && (
                          <div className={`relative mb-2 group/img ${!isUser ? 'inline-block' : ''}`}>
                            <img
                              src={`data:image/${message.imageFormat};base64,${message.imageBase64}`}
                              alt={isUser ? 'Chat image' : 'Generated image'}
                              className="max-w-xs rounded max-h-64 object-cover"
                            />
                            {!isUser && (
                              <a
                                href={`data:image/${message.imageFormat};base64,${message.imageBase64}`}
                                download={`athena-image-${message.id}.${message.imageFormat}`}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity rounded"
                                aria-label="Download generated image"
                              >
                                <Download className="h-6 w-6 text-white" />
                              </a>
                            )}
                          </div>
                        )}
                        {message.documentName && (
                          <div className="flex items-center gap-1 mb-2 text-xs opacity-70">
                            <FileText className="h-3 w-3" />
                            <span>{message.documentName}</span>
                          </div>
                        )}
                        <div className="text-sm break-words">
                          <MarkdownMessage content={message.content} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {message.role === 'companion' && (voiceOutputEnabled || onTTSReady) && (
                            <button
                              onClick={() => handleReplayTTS(message.id, message.content)}
                              className="ml-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                              aria-label={replayingMessageId === message.id ? 'Stop replay' : 'Replay message'}
                            >
                              {replayingMessageId === message.id
                                ? <Square className="h-3 w-3" />
                                : <Play className="h-3 w-3" />
                              }
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Copy button — right side for companion messages */}
                      {!isUser && (
                        <button
                          onClick={handleCopy}
                          className="self-start mt-1 ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-pointer"
                          aria-label="Copy message"
                        >
                          {isCopied
                            ? <span className="text-green-500"><CheckIcon /></span>
                            : <CopyIcon />
                          }
                        </button>
                      )}
                    </div>
                  )
                })}
                {isLoading && <TypingIndicator message="Thinking..." />}
                {isTranscribing && <TypingIndicator message="Transcribing..." />}
                <div ref={scrollRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-muted/30">
        {/* Attachment preview */}
        {selectedImage && (
          <div className="mb-3 flex items-center gap-2">
            <img
              src={`data:image/${selectedImage.format};base64,${selectedImage.base64}`}
              alt="Selected"
              className="h-12 w-12 rounded object-cover"
            />
            <span className="text-xs text-muted-foreground flex-1">Image attached</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearImage}
              className="h-6 w-6 p-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {selectedDocument && (
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <span className="text-xs text-foreground">{selectedDocument.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({selectedDocument.content.length.toLocaleString()} chars)
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearDocument}
              className="h-6 w-6 p-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Main input container */}
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          {/* Top row: Recording bar OR TTS playback OR textarea with token circle */}
          <div className="flex items-center gap-2 p-3 min-h-[56px]">
            {isRecording ? (
              <WaveformRecorder
                isRecording={isRecording}
                recordingTime={recordingTime}
                maxDuration={120}
                onStop={handleStopRecording}
              />
            ) : isPlayingTTS ? (
              <TTSPlayback
                isPlaying={isPlayingTTS}
                audioControls={ttsAudioControls}
                onStop={() => {
                  ttsAudioControls?.stop()
                  setIsPlayingTTS(false)
                  setTTSAudioControls(null)
                }}
              />
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  placeholder="Send a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1 min-h-[32px] max-h-32 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none resize-none"
                  rows={1}
                />
                <TokenUsagePopover usage={tokenUsage} maxTokens={8192} />
              </>
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-muted/30">
            <input
              ref={fileInputRef}
              type="file"
              accept={`image/*,${DOCUMENT_FORMAT_MIME_TYPES.join(',')}`}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File upload */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Emoji picker */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />

            {/* Memory/context indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-accent transition-colors"
                  >
                    <Brain className="h-4 w-4" />
                    <span className="text-xs">{Math.min(memoryWindowSize, memorySize)} / {memorySize}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>AI context: {Math.min(memoryWindowSize, memorySize)} / {memorySize} messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Microphone */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleMicClick}
                    disabled={isTranscribing || isLoading || !sttSupported}
                    className={`cursor-pointer h-8 w-8 ${!sttSupported ? 'opacity-50 cursor-not-allowed' : isRecording ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{!sttSupported ? 'STT not available for this provider' : isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Record audio'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Voice output toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleToggleVoiceOutput}
                    disabled={isLoading}
                    className={`cursor-pointer h-8 w-8 ${voiceOutputEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{voiceOutputEnabled ? 'Voice output enabled' : 'Voice output disabled'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Send button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSendMessage}
                    disabled={(!input.trim() && !selectedImage && !selectedDocument) || isLoading}
                    className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  )
}
