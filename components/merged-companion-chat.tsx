'use client'

import { Card } from '@/components/ui/card'
import { ChatInterface } from '@/components/chat-interface'
import { CompanionWindow } from '@/components/companion-window'
import type { CompanionData, VisualFormat } from '@/lib/types'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { useBrain } from '@/lib/brain'
import { useIsMobile } from '@/hooks/use-mobile'
import { useEffect, useState } from 'react'

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

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isLiveAvatar = visualFormat === 'live-avatar'
  const isSmallScreen = isMobile || isTablet

  // Chat panel is hidden in voice mode or when not explicitly opened
  const showChat = isChatVisible && !isVoiceMode

  if (!isOpen) return null

  // ─── Mobile / Tablet: vertical stack, full width, anchored to bottom ─────────
  if (isSmallScreen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col w-full">
        {/* Companion panel — always visible */}
        <Card className="w-full rounded-b-none shadow-2xl border-b border-border overflow-hidden flex flex-col">
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

        {/* Chat panel — below companion, only when visible and not in voice mode */}
        {showChat && (
          <Card className="w-full rounded-t-none shadow-2xl border-t border-border overflow-hidden flex flex-col h-96">
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
              onEmotionDetected={(emotion) => {
                setLastDetectedEmotion(emotion)
              }}
              onTTSReady={isLiveAvatar ? (blob) => playWithDecart(blob) : undefined}
            />
          </Card>
        )}
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
                onEmotionDetected={(emotion) => {
                  setLastDetectedEmotion(emotion)
                }}
                onTTSReady={isLiveAvatar ? (blob) => playWithDecart(blob) : undefined}
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
