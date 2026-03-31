'use client'

import { lazy, Suspense, useRef, useEffect } from 'react'
import { MessageSquare, Mic, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatedCharacter } from '@/components/animated-character'
import type { CompanionData, VisualFormat, ExpressionState, EmotionState } from '@/lib/types'
import { DEFAULT_VISUAL_FORMAT } from '@/lib/constants'

const Avatar25D = lazy(() => import('@/components/avatar-2-5d').then(m => ({ default: m.Avatar25D })))

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'processing'

const EMOTION_EMOJI: Record<NonNullable<EmotionState>, string> = {
  happy:      '😊',
  sad:        '😢',
  angry:      '😠',
  surprised:  '😲',
  thoughtful: '🤔',
}

interface CompanionPopupViewProps {
  companion: CompanionData
  visualFormat?: VisualFormat
  isOnline?: boolean
  expressionState?: ExpressionState
  lastDetectedEmotion?: EmotionState | null
  decartStream?: MediaStream | null
  decartError?: string | null
  voiceState?: VoiceState
  voiceOutputEnabled?: boolean
  sttSupported?: boolean
  onMicClick?: () => void
  onVoiceOutputToggle?: () => void
  onOpenChat?: () => void
}

export function CompanionPopupView({
  companion,
  visualFormat = DEFAULT_VISUAL_FORMAT,
  isOnline = false,
  expressionState = 'idle',
  lastDetectedEmotion = null,
  decartStream = null,
  decartError = null,
  voiceState = 'idle',
  voiceOutputEnabled = true,
  sttSupported = true,
  onMicClick,
  onVoiceOutputToggle,
  onOpenChat,
}: CompanionPopupViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && decartStream) {
      videoRef.current.srcObject = decartStream
    }
  }, [decartStream])

  console.log('[v0] CompanionPopupView — isOnline prop received:', isOnline, '| visualFormat:', visualFormat)

  const statusLabel = visualFormat === 'live-avatar'
    ? decartStream ? 'Live' : decartError ? 'Connection failed' : 'Connecting...'
    : isOnline ? 'Online' : 'Offline'

  const statusColor = visualFormat === 'live-avatar'
    ? decartStream ? 'bg-green-500 animate-pulse' : decartError ? 'bg-destructive' : 'bg-amber-500 animate-pulse'
    : isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'

  return (
    <div className="relative w-full overflow-hidden bg-background" style={{ height: '100dvh' }}>

      {/* ── Full-screen avatar ───────────────────────────────────── */}
      {visualFormat === 'live-avatar' ? (
        decartStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            aria-label={`${companion.name} live avatar`}
          />
        ) : (
          <img
            src={companion.imageUrl || '/placeholder.svg'}
            alt={companion.name}
            className={`w-full h-full object-cover ${decartError ? 'opacity-80' : 'opacity-60 animate-pulse'}`}
          />
        )
      ) : visualFormat === 'animated-3d' ? (
        <div className="absolute inset-0">
          <Suspense fallback={
            <img
              src={companion.imageUrl || '/placeholder.svg'}
              alt={companion.name}
              className="w-full h-full object-cover opacity-60 animate-pulse"
            />
          }>
            <Avatar25D
              imageUrl={companion.imageUrl || '/placeholder.svg'}
              name={companion.name}
              expressionState={expressionState}
              isOnline={isOnline}
              hideStatus
              fullscreen
            />
          </Suspense>
        </div>
      ) : visualFormat === 'animated-2d' ? (
        <AnimatedCharacter
          imageUrl={companion.imageUrl || '/placeholder.svg'}
          name={companion.name}
          expressionState={expressionState}
          isOnline={isOnline}
          hideStatus
        />
      ) : (
        <img
          src={companion.imageUrl || '/placeholder.svg'}
          alt={companion.name}
          className="w-full h-full object-cover animate-[float_6s_ease-in-out_infinite]"
        />
      )}

      {/* ── Bottom gradient scrim for legibility ─────────────────── */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/70 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/50 to-transparent pointer-events-none z-10" />

      {/* ── TOP-LEFT: emotion emoji ───────────────────────────────── */}
      <div className="absolute top-4 left-4 z-20 text-3xl select-none leading-none">
        {lastDetectedEmotion ? EMOTION_EMOJI[lastDetectedEmotion] : '😌'}
      </div>

      {/* ── TOP-RIGHT: open chat button ───────────────────────────── */}
      <div className="absolute top-3 right-3 z-20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-background/60 hover:bg-background/80 cursor-pointer backdrop-blur-sm"
                onClick={onOpenChat}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Open chat</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── BOTTOM-LEFT: mic + speaker ───────────��────────────────── */}
      <div className="absolute bottom-5 left-4 z-20 flex items-center gap-2">
        {sttSupported && onMicClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-full cursor-pointer backdrop-blur-sm transition-colors ${
                    voiceState === 'recording'
                      ? 'bg-red-500/30 text-red-400 hover:bg-red-500/40 animate-pulse'
                      : voiceState === 'transcribing' || voiceState === 'processing'
                      ? 'bg-amber-500/30 text-amber-400'
                      : 'bg-background/60 hover:bg-background/80 text-foreground'
                  }`}
                  onClick={onMicClick}
                  disabled={voiceState === 'transcribing' || voiceState === 'processing'}
                >
                  {voiceState === 'transcribing' || voiceState === 'processing'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Mic className="h-4 w-4" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{voiceState === 'recording' ? 'Tap to stop' : voiceState === 'transcribing' ? 'Transcribing...' : voiceState === 'processing' ? 'Processing...' : 'Tap to speak'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {onVoiceOutputToggle && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-full cursor-pointer backdrop-blur-sm transition-colors ${
                    voiceOutputEnabled
                      ? 'bg-primary/30 text-primary hover:bg-primary/40'
                      : 'bg-background/60 text-muted-foreground hover:bg-background/80'
                  }`}
                  onClick={onVoiceOutputToggle}
                >
                  {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{voiceOutputEnabled ? 'Disable voice' : 'Enable voice'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* ── BOTTOM-RIGHT: status ──────────────────────────────────── */}
      <div className="absolute bottom-5 right-4 z-20 flex items-center gap-2 bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColor}`} />
        <span className="text-xs font-medium text-foreground">{statusLabel}</span>
      </div>

      {/* ── Float animation keyframes ─────────────────────────────── */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
