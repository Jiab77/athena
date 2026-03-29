'use client'

import { useState } from 'react'
import Image from 'next/image'

import { DEFAULT_COMPANION_NAME, DEFAULT_VISUAL_FORMAT } from '@/lib/constants'
import type { VisualFormat } from '@/lib/types'

const VISUAL_FORMAT_LABELS: Record<VisualFormat, string> = {
  'static-2d':   'Static 2D',
  'animated-2d': 'Animated 2D',
  'animated-3d': '2.5D Avatar',
  'live-avatar': 'Live Avatar',
}

interface CharacterRenderProps {
  companionName?: string
  imageUrl?: string
  animating?: boolean
  visualFormat?: VisualFormat
}

/**
 * Character Rendering Component
 * Displays the companion avatar on the landing page showcase.
 * Reflects the visual format configured in settings.
 */
export function CharacterRender({
  companionName = DEFAULT_COMPANION_NAME,
  imageUrl = '/avatars/cyberpunk/f-03-vibrant.jpg',
  animating = false,
  visualFormat = DEFAULT_VISUAL_FORMAT,
}: CharacterRenderProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto">
      {/* Character container with neon glow and float animation */}
      <div
        className={`relative w-full aspect-[4/5] rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 ${
          animating ? 'animate-pulse' : ''
        }`}
        style={{
          animation: animating ? undefined : 'float 4s ease-in-out infinite',
        }}
      >
        {/* Neon glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 z-10 pointer-events-none" />

        {/* Character image */}
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={`${companionName} - AI Companion`}
          fill
          className={`object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          sizes="(max-width: 640px) 280px, 384px"
          priority
        />

        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}

        {/* Bottom gradient for name overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/80 to-transparent z-10" />

        {/* Character name */}
        <span className="absolute bottom-3 left-0 right-0 text-center text-sm font-bold text-foreground z-20 tracking-widest">
          {companionName.toUpperCase()}
        </span>
      </div>

      {/* Active visual format label */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Visual format: <span className="text-primary font-medium">{VISUAL_FORMAT_LABELS[visualFormat]}</span>
      </p>

      {/* Float animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
