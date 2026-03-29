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

interface MergedCompanionChatProps {
  isOpen: boolean
  onClose: () => void
  isChatVisible: boolean
  setIsChatVisible: (visible: boolean) => void
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

  const isLiveAvatar = visualFormat === 'live-avatar'

  if (!isOpen) return null

  const mergedClasses = isChatVisible ? 'fixed -bottom-6 left-6 z-40 gap-1' : 'fixed -bottom-6 left-230 z-40'

  return (
    <ResizablePanelGroup direction="horizontal" className={mergedClasses}>
      {/* Left: Chat Interface */}
      {isChatVisible && (
        <>
          <ResizablePanel defaultSize={67} minSize={30}>
            <Card className="w-full h-120 -py-6 shadow-2xl border-r border-border overflow-hidden flex flex-col">
              <ChatInterface
                isChatVisible={isChatVisible}
                setIsChatVisible={setIsChatVisible}
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
      <ResizablePanel defaultSize={isChatVisible ? 33 : 100} minSize={20}>
        <Card className="w-96 h-120 -py-6 gap-0 shadow-2xl border-l border-border overflow-hidden flex flex-col" style={{ touchAction: 'none' }}>
          <CompanionWindow
            isOpen={true}
            onClose={onClose}
            isChatVisible={isChatVisible}
            setIsChatVisible={setIsChatVisible}
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
