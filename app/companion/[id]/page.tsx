'use client'

/**
 * /companion/[id] — Pop-out companion window
 *
 * Opens as a standalone browser popup via window.open().
 * Display-only — renders CompanionPopupView with connection status from the DB.
 * Designed to be pinned always-on-top by the user via their OS or browser.
 */

import { use, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CompanionPopupView } from '@/components/companion-popup-view'
import { DBProvider, useDB } from '@/lib/db-context'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import type { CompanionData, VisualFormat } from '@/lib/types'

interface CompanionPopupPageProps {
  params: Promise<{ id: string }>
}

function CompanionPopup({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const paramName = searchParams.get('name') || ''
  const paramImage = searchParams.get('image') || ''
  const visualFormat = (searchParams.get('format') || 'static-2d') as VisualFormat

  const { db, dbReady } = useDB()
  const { isOnline } = useConnectionStatus()

  const [resolvedName, setResolvedName] = useState(paramName || 'Companion')
  const [resolvedImage, setResolvedImage] = useState(paramImage)

  useEffect(() => {
    if (!dbReady || !db || (paramName && paramImage)) return
    Promise.all([db.getSettings(), db.getCompanion(id)])
      .then(([settings, comp]) => {
        if (!paramName && settings?.selectedCompanionName) setResolvedName(settings.selectedCompanionName)
        if (!paramImage && comp?.imageUrl) setResolvedImage(comp.imageUrl)
      })
      .catch(() => {})
  }, [dbReady, db, id, paramName, paramImage])

  const companion: CompanionData = {
    id,
    name: resolvedName,
    imageUrl: resolvedImage,
    personality: '',
    gender: 'F',
    createdAt: new Date().toISOString(),
    category: 'general',
  }

  const openChat = () => {
    const chatName = `chat-${id}`
    const w = 800, h = 636
    const top = Math.round((screen.availHeight - h) / 2)
    const existing = (window as Window & { _chatPopupRef?: Window | null })._chatPopupRef
    if (existing && !existing.closed) {
      existing.focus()
      return
    }
    const ref = window.open(`/chat/${id}`, chatName, `width=${w},height=${h},left=0,top=${top},resizable=no,scrollbars=no`)
    ;(window as Window & { _chatPopupRef?: Window | null })._chatPopupRef = ref
    ;(window as Window & { _companionPopupRef?: Window | null })._companionPopupRef = window
  }

  return (
    <CompanionPopupView
      companion={companion}
      visualFormat={visualFormat}
      isOnline={isOnline}
      onOpenChat={openChat}
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
