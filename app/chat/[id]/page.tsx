'use client'

import { use, Suspense } from 'react'
import { useEffect, useState } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { Providers } from '@/components/providers'
import { DEFAULT_VOICE_ID, DEFAULT_VOICE_PROVIDER, ENABLE_VOICE_OUTPUT } from '@/lib/constants'

function ChatPopup({ id }: { id: string }) {
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(ENABLE_VOICE_OUTPUT)
  const [isChatVisible, setIsChatVisible] = useState(true)

  useEffect(() => {
    console.log('[ChatPopup] Mounted — conversationId:', id)
    // Remove browser chrome padding for popup context
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    return () => {
      console.log('[ChatPopup] Unmounted')
    }
  }, [id])

  const handleVoiceOutputToggle = async () => {
    setVoiceOutputEnabled(prev => !prev)
  }

  return (
    <div className="w-full h-screen bg-background flex flex-col overflow-hidden">
      <ChatInterface
        isChatVisible={isChatVisible}
        setIsChatVisible={setIsChatVisible}
        isOnline={true}
        voiceOutputEnabled={voiceOutputEnabled}
        selectedVoice={DEFAULT_VOICE_ID}
        voiceProvider={DEFAULT_VOICE_PROVIDER}
        onVoiceOutputToggle={handleVoiceOutputToggle}
        isPopup={true}
      />
    </div>
  )
}

export default function ChatPopupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <Providers>
      <Suspense>
        <ChatPopup id={id} />
      </Suspense>
    </Providers>
  )
}
