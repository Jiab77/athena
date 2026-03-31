'use client'

/**
 * /companion/[id] — Pop-out companion window
 *
 * Opens as a standalone browser popup via window.open().
 * Display-only window — renders CompanionPopupView directly with state
 * passed via URL params (name, image, format, online).
 * Designed to be pinned always-on-top by the user via their OS or browser.
 */

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { CompanionPopupView } from '@/components/companion-popup-view'
import { DBProvider } from '@/lib/db-context'
import type { CompanionData, PersonalityType, VisualFormat } from '@/lib/types'
import { DEFAULT_VISUAL_FORMAT, DEFAULT_COMPANION } from '@/lib/constants'

interface CompanionPopupPageProps {
  params: Promise<{ id: string }>
}

function CompanionPopup({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const paramName = searchParams.get('name') || DEFAULT_COMPANION.name
  const paramImage = searchParams.get('image') || DEFAULT_COMPANION.imageUrl
  const paramPersonality = searchParams.get('personality') || DEFAULT_COMPANION.personality as PersonalityType
  const paramAppearance = searchParams.get('appearance') || DEFAULT_COMPANION.appearance
  const paramCreatedAt = searchParams.get('createdAt') || DEFAULT_COMPANION.createdAt
  const visualFormat = (searchParams.get('format') || DEFAULT_VISUAL_FORMAT) as VisualFormat
  const isOnline = searchParams.get('online') === '1'

  const companion: CompanionData = {
    id,
    name: paramName,
    personality: paramPersonality,
    appearance: paramAppearance,
    imageUrl: paramImage,
    createdAt: paramCreatedAt,
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
      ; (window as Window & { _chatPopupRef?: Window | null })._chatPopupRef = ref
      ; (window as Window & { _companionPopupRef?: Window | null })._companionPopupRef = window
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
