'use client'

/**
 * /companion/[id] — Pop-out companion window
 *
 * Opens as a standalone browser popup via window.open().
 * Renders just the CompanionWindow with the useBrain() hook for full interactivity.
 * Designed to be pinned always-on-top by the user via their OS or browser.
 */

import { use, useEffect, useState } from 'react' // useEffect + useState used in CompanionPopup
import { useSearchParams } from 'next/navigation'
import { CompanionPopupView } from '@/components/companion-popup-view'
import { useBrain } from '@/lib/brain'
import { DBProvider, useDB } from '@/lib/db-context'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import type { CompanionData, VisualFormat } from '@/lib/types'

interface CompanionPopupPageProps {
  params: Promise<{ id: string }>
}

function CompanionBrain({ id, name, imageUrl, visualFormat }: {
  id: string
  name: string
  imageUrl: string
  visualFormat: VisualFormat
}) {
  const { isOnline } = useConnectionStatus()

  const companion: CompanionData = {
    id,
    name,
    imageUrl,
    personality: 'friendly',
    gender: 'F',
    createdAt: new Date().toISOString(),
    category: 'general',
  }

  const {
    expressionState,
    lastDetectedEmotion,
    voiceState,
    sttSupported,
    decartStream,
    decartError,
    handleMicClick,
  } = useBrain({
    companion,
    visualFormat,
    voiceOutputEnabled: true,
    isOpen: true,
  })

  const openChat = () => {
    const chatName = `chat-${id}`
    const w = 800, h = 636
    const top = Math.round((screen.availHeight - h) / 2)
    // Check if chat popup is already open
    const existing = (window as Window & { _chatPopupRef?: Window | null })._chatPopupRef
    if (existing && !existing.closed) {
      existing.focus()
      return
    }
    const ref = window.open(`/chat/${id}`, chatName, `width=${w},height=${h},left=0,top=${top},resizable=no,scrollbars=no`)
    ;(window as Window & { _chatPopupRef?: Window | null })._chatPopupRef = ref
    // Also expose this companion window ref to the chat popup via opener
    ;(window as Window & { _companionPopupRef?: Window | null })._companionPopupRef = window
  }

  return (
    <CompanionPopupView
      companion={companion}
      visualFormat={visualFormat}
      isOnline={isOnline}
      expressionState={expressionState}
      lastDetectedEmotion={lastDetectedEmotion}
      decartStream={decartStream}
      decartError={decartError}
      voiceState={voiceState}
      voiceOutputEnabled={true}
      sttSupported={sttSupported}
      onMicClick={handleMicClick}
      onOpenChat={openChat}
    />
  )
}

function CompanionPopup({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const paramName = searchParams.get('name') || ''
  const paramImage = searchParams.get('image') || ''
  const visualFormat = (searchParams.get('format') || 'static-2d') as VisualFormat
  const { db, dbReady } = useDB()

  // URL params are the source of truth — no DB needed
  // If missing, fall back to DB once ready
  const [resolvedName, setResolvedName] = useState(paramName || 'Companion')
  const [resolvedImage, setResolvedImage] = useState(paramImage)

  useEffect(() => {
    if (!dbReady || !db || (paramName && paramImage)) return
    // Fallback: load from DB if URL params were missing
    Promise.all([db.getSettings(), db.getCompanion(id)])
      .then(([settings, comp]) => {
        if (!paramName && settings?.selectedCompanionName) setResolvedName(settings.selectedCompanionName)
        if (!paramImage && comp?.imageUrl) setResolvedImage(comp.imageUrl)
      })
      .catch(() => {})
  }, [dbReady, db, id, paramName, paramImage])

  return (
    <CompanionBrain
      id={id}
      name={resolvedName}
      imageUrl={resolvedImage}
      visualFormat={visualFormat}
    />
  )
}

export default function CompanionPopupPage({ params }: CompanionPopupPageProps) {
  const { id } = use(params)

  return (
    <DBProvider>
      <CompanionPopup id={id} />
    </DBProvider>
  )
}
