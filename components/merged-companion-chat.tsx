'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/chat-interface'
import { CompanionWindow } from '@/components/companion-window'
import type { CompanionData, VisualFormat } from '@/lib/types'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { useBrain } from '@/lib/llm/brain'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Keyboard, Mic2, X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { openCompanionPopup } from '@/components/companion-window'
import type { MobileTab, PersonalityType } from '@/lib/types'
import {
  DEFAULT_COMPANION_NAME,
  PERSONALITY_TRAITS,
  DEFAULT_PERSONALITY,
  MOBILE_SWIPE_THRESHOLD
} from '@/lib/constants'

interface MergedCompanionChatProps {
  isOpen: boolean
  onClose: () => void
  isChatVisible: boolean
  setIsChatVisible: (visible: boolean) => void
  isVoiceMode: boolean
  onVoiceModeToggle: () => void
  isOnline: boolean
  companion: CompanionData
  voiceOutputEnabled: boolean
  selectedVoice: string
  voiceProvider: string
  onVoiceOutputToggle: () => Promise<void>
  visualFormat?: VisualFormat
  /** Opens the settings panel scrolled to the Model section. Used by the chat empty-state CTA when no API key is configured. */
  onConfigureApiKey?: () => void
}

export function MergedCompanionChat({
  isOpen,
  onClose,
  isChatVisible,
  setIsChatVisible,
  isVoiceMode,
  onVoiceModeToggle,
  isOnline,
  companion,
  voiceOutputEnabled,
  selectedVoice,
  voiceProvider,
  onVoiceOutputToggle,
  visualFormat,
  onConfigureApiKey,
}: MergedCompanionChatProps) {
  const {
    expressionState,
    lastDetectedEmotion,
    setLastDetectedEmotion,
    voiceState,
    sttSupported,
    decartStream,
    decartError,
    handleMicClick,
    playWithDecart,
    handleExpressionChange,
  } = useBrain({ companion, visualFormat, voiceOutputEnabled, isOpen })

  const isMobile = useIsMobile()
  const [isTablet, setIsTablet] = useState(false)
  const [activeTab, setActiveTab] = useState<MobileTab>('companion')
  const { t } = useTranslation()

  // Touch tracking for swipe
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isLiveAvatar = visualFormat === 'live-avatar'
  const isSmallScreen = isMobile || isTablet
  const showChat = isChatVisible && !isVoiceMode

  // Auto-sync the active tab with chat visibility — when the chat appears
  // we switch to the chat tab, and we fall back to the companion tab when
  // the chat hides. Centralising this here avoids the cross-component
  // state coordination that the click handlers had to do manually.
  useEffect(() => {
    setActiveTab(showChat ? 'chat' : 'companion')
  }, [showChat])

  if (!isOpen) return null

  // ─── Swipe handlers ─────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null

    if (deltaX < -MOBILE_SWIPE_THRESHOLD && showChat) {
      // Swipe left → Chat tab
      setActiveTab('chat')
    } else if (deltaX > MOBILE_SWIPE_THRESHOLD) {
      // Swipe right → Companion tab
      setActiveTab('companion')
    }
  }

  // ─── Shared footer (used in tabbed mobile view) ──────────────────────────────
  const SharedFooter = () => (
    <div className="p-4 pr-20 sm:pr-4 border-t border-border bg-card flex-shrink-0 flex items-center gap-2">
      {/* Voice Mode toggle */}
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
              <span className="text-xs">{t('companion.voiceModeButton')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isVoiceMode ? t('companion.voiceModeDisable') : t('companion.voiceModeEnable')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Start Chat / Hide Chat */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              disabled={isVoiceMode}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 cursor-pointer font-medium',
                isChatVisible
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'border border-border text-foreground bg-transparent hover:bg-muted hover:text-foreground',
                isVoiceMode ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
              onClick={() => setIsChatVisible(!isChatVisible)}
            >
              <Keyboard className="h-4 w-4" />
              <span className="text-xs">{isChatVisible ? t('companion.hideChat') : t('companion.startChat')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isChatVisible ? t('companion.chatClose') : t('companion.chatOpen')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  // ─── Mobile / Tablet: full-viewport tabbed layout ────────────────────────────
  if (isSmallScreen) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col w-full h-[100dvh] overflow-hidden bg-background">

        {/* Shared header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground leading-tight truncate">
              {companion.name || DEFAULT_COMPANION_NAME}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {PERSONALITY_TRAITS[companion.personality as PersonalityType] || PERSONALITY_TRAITS[DEFAULT_PERSONALITY]}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
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
                  <p>{t('companion.popOut')}</p>
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
        </div>

        {/* Tab bar — only shown when chat is open */}
        {showChat && (
          <div className="flex-shrink-0 flex border-b border-border bg-card px-4 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('companion')}
              className={[
                'flex-1 text-sm font-medium pb-2 transition-colors border-b-2 cursor-pointer',
                activeTab === 'companion'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t('companion.tabCompanion')}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={[
                'flex-1 text-sm font-medium pb-2 transition-colors border-b-2 cursor-pointer',
                activeTab === 'chat'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t('companion.tabChat')}
            </button>
          </div>
        )}

        {/* Swipeable content area */}
        <div
          className="flex-1 min-h-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Companion tab */}
          <div className={[
            'h-full w-full flex flex-col',
            (!showChat || activeTab === 'companion') ? 'flex' : 'hidden',
          ].join(' ')}>
            <CompanionWindow
              isOpen={true}
              onClose={onClose}
              isChatVisible={isChatVisible}
              setIsChatVisible={setIsChatVisible}
              isVoiceMode={isVoiceMode}
              onVoiceModeToggle={onVoiceModeToggle}
              isOnline={isOnline}
              companion={companion}
              expressionState={expressionState}
              lastDetectedEmotion={lastDetectedEmotion}
              visualFormat={visualFormat}
              decartStream={decartStream}
              decartError={decartError}
              voiceState={voiceState}
              onMicClick={handleMicClick}
              voiceOutputEnabled={voiceOutputEnabled}
              onVoiceOutputToggle={onVoiceOutputToggle}
              sttSupported={sttSupported}
              tabbed={true}
            />
          </div>

          {/* Chat tab */}
          {showChat && (
            <div className={[
              'h-full w-full flex flex-col',
              activeTab === 'chat' ? 'flex' : 'hidden',
            ].join(' ')}>
              <ChatInterface
                isChatVisible={showChat}
                setIsChatVisible={setIsChatVisible}
                isVoiceMode={isVoiceMode}
                isOnline={isOnline}
                voiceOutputEnabled={voiceOutputEnabled}
                selectedVoice={selectedVoice}
                voiceProvider={voiceProvider}
                onVoiceOutputToggle={onVoiceOutputToggle}
                onExpressionChange={handleExpressionChange}
                onEmotionDetected={(emotion) => { setLastDetectedEmotion(emotion) }}
                onTTSReady={isLiveAvatar ? (blob) => playWithDecart(blob) : undefined}
                sttSupported={sttSupported}
                onConfigureApiKey={onConfigureApiKey}
              />
            </div>
          )}
        </div>

        {/* Shared footer — always visible on all tabs */}
        <SharedFooter />
      </div>
    )
  }

  // ─── Desktop: existing horizontal resizable layout (untouched) ───────────────
  const mergedClasses = isChatVisible ? 'fixed -bottom-6 left-6 z-40 gap-1' : 'fixed -bottom-6 left-230 z-40'

  return (
    <ResizablePanelGroup direction="horizontal" className={mergedClasses}>
      {/* Left: Chat Interface */}
      {showChat && (
        <>
          <ResizablePanel defaultSize={67} minSize={30}>
            <Card className="w-full h-120 -py-6 shadow-2xl border-r border-border overflow-hidden flex flex-col">
              <ChatInterface
                isChatVisible={showChat}
                setIsChatVisible={setIsChatVisible}
                isVoiceMode={isVoiceMode}
                isOnline={isOnline}
                voiceOutputEnabled={voiceOutputEnabled}
                selectedVoice={selectedVoice}
                voiceProvider={voiceProvider}
                onVoiceOutputToggle={onVoiceOutputToggle}
                onExpressionChange={handleExpressionChange}
                onEmotionDetected={(emotion) => { setLastDetectedEmotion(emotion) }}
                onTTSReady={isLiveAvatar ? (blob) => playWithDecart(blob) : undefined}
                sttSupported={sttSupported}
                onConfigureApiKey={onConfigureApiKey}
              />
            </Card>
          </ResizablePanel>
          <ResizableHandle className="-bg-border" />
        </>
      )}

      {/* Right: Companion Visual */}
      <ResizablePanel defaultSize={showChat ? 33 : 100} minSize={20}>
        <Card className="w-96 h-120 -py-6 gap-0 shadow-2xl border-l border-border overflow-hidden flex flex-col" style={{ touchAction: 'none' }}>
          <CompanionWindow
            isOpen={true}
            onClose={onClose}
            isChatVisible={showChat}
            setIsChatVisible={setIsChatVisible}
            isVoiceMode={isVoiceMode}
            onVoiceModeToggle={onVoiceModeToggle}
            isOnline={isOnline}
            companion={companion}
            expressionState={expressionState}
            lastDetectedEmotion={lastDetectedEmotion}
            visualFormat={visualFormat}
            decartStream={decartStream}
            decartError={decartError}
            voiceState={voiceState}
            onMicClick={handleMicClick}
            voiceOutputEnabled={voiceOutputEnabled}
            onVoiceOutputToggle={onVoiceOutputToggle}
            sttSupported={sttSupported}
          />
        </Card>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
