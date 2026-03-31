'use client'

import { X, Mic, Volume2, VolumeX, Loader2, ExternalLink, Mic2, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AnimatedCharacter } from '@/components/animated-character'
import { StatusBadge } from '@/components/status-badge'
import { lazy, Suspense, useEffect, useRef } from 'react'

// Module-level ref so it persists across renders
let _companionPopupRef: Window | null = null

export function openCompanionPopup(url: string, name: string) {
  if (_companionPopupRef && !_companionPopupRef.closed) {
    _companionPopupRef.focus()
    return
  }
  const w = 392, h = 535
  const left = screen.availWidth - w
  const top = Math.round((screen.availHeight - h) / 2)
  _companionPopupRef = window.open(url, name, `width=${w},height=${h},left=${left},top=${top},resizable=no,scrollbars=no`)
}

export function getCompanionPopupRef() { return _companionPopupRef }
export function setCompanionPopupRef(ref: Window | null) { _companionPopupRef = ref }

const Avatar25D = lazy(() => import('@/components/avatar-2-5d').then(m => ({ default: m.Avatar25D })))
import type { CompanionData, PersonalityType, VisualFormat, ExpressionState, EmotionState } from '@/lib/types'
import { DEFAULT_COMPANION_NAME, DEFAULT_PERSONALITY, PERSONALITY_TRAITS, DEFAULT_VISUAL_FORMAT } from '@/lib/constants'

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'processing'

interface CompanionWindowProps {
  isOpen: boolean
  onClose: () => void
  isChatVisible: boolean
  setIsChatVisible: (visible: boolean) => void
  isVoiceMode?: boolean
  onVoiceModeToggle?: () => void
  isOnline: boolean
  companion: CompanionData
  expressionState?: ExpressionState
  lastDetectedEmotion?: EmotionState | null
  visualFormat?: VisualFormat
  decartStream?: MediaStream | null
  decartError?: string | null
  // Voice interaction props
  voiceState?: VoiceState
  onMicClick?: () => void
  voiceOutputEnabled?: boolean
  onVoiceOutputToggle?: () => void
  sttSupported?: boolean
  /** When true, hides the built-in header and footer — used by the mobile tabbed layout */
  tabbed?: boolean
}

export function CompanionWindow({
  isOpen,
  onClose,
  isChatVisible,
  setIsChatVisible,
  isVoiceMode = false,
  onVoiceModeToggle,
  isOnline,
  companion,
  expressionState = 'idle',
  lastDetectedEmotion = null,
  visualFormat = DEFAULT_VISUAL_FORMAT,
  decartStream = null,
  decartError = null,
  voiceState = 'idle',
  onMicClick,
  voiceOutputEnabled = true,
  onVoiceOutputToggle,
  sttSupported = true,
  tabbed = false,
}: CompanionWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach Decart WebRTC stream to video element when stream arrives
  useEffect(() => {
    if (videoRef.current && decartStream) {
      videoRef.current.srcObject = decartStream
    }
  }, [decartStream])

  if (!isOpen) return null

  return (
    <>
      {/* Header with close button — hidden in tabbed mode (rendered by parent) */}
      {!tabbed && <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 p-4 flex items-start justify-between flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{companion.name || DEFAULT_COMPANION_NAME}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {PERSONALITY_TRAITS[companion.personality as PersonalityType] || PERSONALITY_TRAITS[DEFAULT_PERSONALITY]}
          </p>
        </div>
        <div className="flex items-center gap-1 -mt-1 -mr-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => {
                    const url = `/companion/${companion.id}?name=${encodeURIComponent(companion.name)}&image=${encodeURIComponent(companion.imageUrl || '')}&format=${visualFormat || 'static-2d'}`
                    openCompanionPopup(url, `companion-${companion.id}`)
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>}

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Character Display - conditionally animated or static */}
        <div className="flex-1 pt-5 pb-4 bg-background border-t border-border flex items-center justify-center min-h-0 overflow-hidden">
          {/* h-full drives width via aspect-[3/4] — height is the known dimension from flex-1 */}
          <div className="relative h-full aspect-[3/4] max-w-full">
            {/* Emotion emoji badge — top-left corner, always visible */}
            {/* Uses lastDetectedEmotion (independent of animation state) so TTS/thinking never overrides it */}
            <div className="absolute duration-300 flex h-7 items-center justify-center leading-none left-1 select-none text-xl top-1 transition-all w-8 z-20">
              {lastDetectedEmotion === 'happy' && '😊'}
              {lastDetectedEmotion === 'sad' && '😢'}
              {lastDetectedEmotion === 'angry' && '😠'}
              {lastDetectedEmotion === 'surprised' && '😲'}
              {lastDetectedEmotion === 'thoughtful' && '🤔'}
              {!lastDetectedEmotion && '😌'}
            </div>

            {visualFormat === 'live-avatar' ? (
              <>
                <div className="w-full h-full rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20">
                  {decartStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted={false}
                      className="w-full h-full object-cover"
                      aria-label={`${companion.name} live avatar`}
                    />
                  ) : (
                    // Fallback — static avatar while connecting or on error
                    <img
                      src={companion.imageUrl || "/placeholder.svg"}
                      alt={companion.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Live-avatar uses its own status logic — inline for specificity */}
                <div className={`absolute bottom-1 right-1 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border shadow-md ${decartError ? 'border-destructive/40' : 'border-primary/30'}`}>
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${decartStream ? 'bg-green-500 animate-pulse' : decartError ? 'bg-destructive' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                    {decartStream ? 'Live' : decartError ? (decartError.toLowerCase().includes('credit') ? 'Insufficient credits' : 'Connection failed') : 'Connecting...'}
                  </span>
                </div>
              </>
            ) : visualFormat === 'animated-3d' ? (
              <>
              <Suspense fallback={
                <img
                  src={companion.imageUrl || "/placeholder.svg"}
                  alt={companion.name}
                  className="w-full h-full object-cover opacity-60 animate-pulse rounded-lg"
                />
              }>
                <Avatar25D
                  imageUrl={companion.imageUrl || "/placeholder.svg"}
                  name={companion.name}
                  expressionState={expressionState}
                  isOnline={isOnline}
                  hideStatus={true}
                />
              </Suspense>
              <StatusBadge isOnline={isOnline} expressionState={expressionState} />
            </>
            ) : visualFormat === 'animated-2d' ? (
              <>
              <AnimatedCharacter
                imageUrl={companion.imageUrl || "/placeholder.svg"}
                name={companion.name}
                expressionState={expressionState}
                isOnline={isOnline}
                usePixi={true}
                hideStatus={true}
              />
              <StatusBadge isOnline={isOnline} expressionState={expressionState} />
              </>
            ) : (
              <>
                <div className="w-full h-full rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20">
                  <img
                    src={companion.imageUrl || "/placeholder.svg"}
                    alt={companion.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <StatusBadge isOnline={isOnline} expressionState={expressionState} />
              </>
            )}

            {/* Speaker button - top right */}
            {onVoiceOutputToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-1 right-1 h-8 w-8 rounded-full cursor-pointer transition-colors ${
                        voiceOutputEnabled 
                          ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      onClick={onVoiceOutputToggle}
                    >
                      {voiceOutputEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{voiceOutputEnabled ? 'Disable voice' : 'Enable voice'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Mic button - bottom left */}
            {sttSupported && onMicClick && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute bottom-1 left-1 h-8 w-8 rounded-full cursor-pointer transition-colors ${
                        voiceState === 'recording'
                          ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                          : voiceState === 'transcribing' || voiceState === 'processing'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-primary/20 text-primary hover:bg-primary/30'
                      }`}
                      onClick={onMicClick}
                      disabled={voiceState === 'transcribing' || voiceState === 'processing'}
                    >
                      {voiceState === 'transcribing' || voiceState === 'processing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {voiceState === 'recording' 
                        ? 'Tap to stop' 
                        : voiceState === 'transcribing'
                        ? 'Transcribing...'
                        : voiceState === 'processing'
                        ? 'Processing...'
                        : 'Tap to speak'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Info Section — pinned to bottom of the flex column */}
        <div className="mt-auto p-4 bg-muted/30 border-t border-border">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Personality</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-foreground truncate cursor-help">{PERSONALITY_TRAITS[companion.personality as PersonalityType] || PERSONALITY_TRAITS[DEFAULT_PERSONALITY]}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{PERSONALITY_TRAITS[companion.personality as PersonalityType] || PERSONALITY_TRAITS[DEFAULT_PERSONALITY]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Created</p>
              <p className="text-foreground text-xs">
                {new Date(companion.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>{/* end flex flex-col */}

      {/* Footer Action — hidden in tabbed mode (rendered by parent) */}
      {!tabbed && <div className="p-4 pr-20 sm:pr-4 border-t border-border bg-card flex-shrink-0 flex items-center gap-2">
        {/* Voice Mode toggle — left */}
        {onVoiceModeToggle && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className={[
                    'flex-1 flex items-center justify-center gap-1.5 cursor-pointer font-medium',
                    isVoiceMode
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                      : 'border border-border text-foreground bg-transparent hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                  onClick={onVoiceModeToggle}
                >
                  <Mic2 className="h-4 w-4" />
                  <span className="text-xs">Voice Mode</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isVoiceMode ? 'Disable voice mode' : 'Enable voice mode'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Start Chat / Hide Chat button — right, fills remaining space */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsChatVisible(!isChatVisible)}
                size="sm"
                disabled={isVoiceMode}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 cursor-pointer font-medium',
                  isChatVisible
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    : 'border border-border text-foreground bg-transparent hover:bg-muted hover:text-foreground',
                  isVoiceMode ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <Keyboard className="h-4 w-4" />
                <span className="text-xs">{isChatVisible ? 'Hide Chat' : 'Start Chat'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isChatVisible ? 'Close the chat window' : 'Open the chat window'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>}
    </>
  )
}
