'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Smile } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Declare the em-emoji-picker custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        theme?: string
        'preview-position'?: string
        'skin-tone-position'?: string
        'per-line'?: string | number
        'max-frequent-rows'?: string | number
      }
    }
  }
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const pickerRef = useRef<HTMLElement>(null)

  // Load and initialise emoji data once on mount — before the picker is ever opened
  // This ensures em.init() always completes before <em-emoji-picker> mounts
  useEffect(() => {
    let cancelled = false

    import('@emoji-mart/data').then((mod) => {
      if (cancelled) return
      import('emoji-mart').then((em) => {
        if (cancelled) return
        em.init({ data: mod.default }).then(() => {
          if (!cancelled) setDataReady(true)
        })
      })
    })

    return () => { cancelled = true }
  }, [])

  // Wire up the emoji-select event from the web component
  useEffect(() => {
    const el = pickerRef.current
    if (!el || !isOpen) return

    const handler = (e: Event) => {
      const emoji = (e as CustomEvent).detail
      if (emoji?.native) {
        onEmojiSelect(emoji.native)
        setIsOpen(false)
      }
    }

    el.addEventListener('emoji-click', handler)
    return () => el.removeEventListener('emoji-click', handler)
  }, [isOpen, onEmojiSelect])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          title="Add emoji"
          className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-0 border-border bg-background shadow-xl"
        sideOffset={8}
      >
        <style>{`
          em-emoji-picker {
            --em-rgb-background: 0, 0, 0 !important;
            --em-rgb-border: 255, 255, 255, 0.1 !important;
            --em-rgb-text: 255, 255, 255 !important;
            height: 350px !important;
          }
        `}</style>
        {isOpen && dataReady && (
          <em-emoji-picker
            ref={pickerRef as any}
            theme="dark"
            preview-position="none"
            skin-tone-position="none"
            per-line={8}
            max-frequent-rows={1}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
