'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export type ExpressionState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface CssAnimatedAvatarProps {
  imageUrl: string
  name: string
  expressionState?: ExpressionState
  isOnline?: boolean
}

/**
 * CSS Animated Avatar Component
 * Uses CSS animations for smooth, reliable visual feedback.
 * Expression states shown via glow colors, animations, and status indicators.
 *
 * Note: True facial animation (blinking, lip-sync) requires either:
 * - Pre-rendered sprite sheets per avatar
 * - Live2D models with rigged facial features
 * - Face landmark detection + overlay positioning
 *
 * Current implementation focuses on polished ambient animation
 * that works reliably with any avatar image.
 */
export function CssAnimatedAvatar({
  imageUrl,
  name,
  expressionState = 'idle',
  isOnline = true,
}: CssAnimatedAvatarProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)

  // Speaking pulse animation - simulates voice activity
  useEffect(() => {
    if (expressionState !== 'speaking') {
      setPulseIntensity(0)
      return
    }

    const interval = setInterval(() => {
      setPulseIntensity(0.3 + Math.random() * 0.7)
    }, 100)

    return () => clearInterval(interval)
  }, [expressionState])

  // Expression-based styling
  const getExpressionStyles = () => {
    const baseGlow = '0 4px 20px'

    switch (expressionState) {
      case 'listening':
        return {
          boxShadow: `${baseGlow} rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)`,
          borderColor: 'rgba(59, 130, 246, 0.6)',
        }
      case 'thinking':
        return {
          boxShadow: `${baseGlow} rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)`,
          borderColor: 'rgba(168, 85, 247, 0.6)',
        }
      case 'speaking':
        const intensity = 20 + pulseIntensity * 25
        return {
          boxShadow: `0 0 ${intensity}px rgba(34, 197, 94, 0.5), 0 0 ${intensity * 1.5}px rgba(34, 197, 94, 0.3)`,
          borderColor: 'rgba(34, 197, 94, 0.6)',
        }
      default: // idle
        return {
          boxShadow: `${baseGlow} rgba(139, 92, 246, 0.3)`,
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }
    }
  }

  const getAnimationClass = () => {
    switch (expressionState) {
      case 'listening':
        return 'animate-pulse-slow'
      case 'thinking':
        return 'animate-pulse-fast'
      case 'speaking':
        return '' // Speaking uses dynamic pulse via state
      default:
        return 'animate-breathe'
    }
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    switch (expressionState) {
      case 'listening': return 'Listening...'
      case 'thinking': return 'Thinking...'
      case 'speaking': return 'Speaking...'
      default: return 'Online'
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500'
    switch (expressionState) {
      case 'listening': return 'bg-blue-500'
      case 'thinking': return 'bg-purple-500'
      case 'speaking': return 'bg-green-500'
      default: return 'bg-green-500'
    }
  }

  const styles = getExpressionStyles()

  return (
    <div className="relative">
      {/* Character container */}
      <div
        className={`
          w-48 h-66 rounded-lg overflow-hidden border-2
          transition-all duration-300 ease-out
          ${getAnimationClass()}
        `}
        style={{
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
        }}
      >
        {/* Character image with ambient animation */}
        <div className="relative w-full h-full">
          <Image
            src={imageUrl || '/placeholder.svg'}
            alt={name}
            fill
            className="object-cover"
            priority
          />

          {/* Expression overlay - subtle color wash */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              background: expressionState === 'idle'
                ? 'transparent'
                : `radial-gradient(ellipse at center, ${
                    expressionState === 'listening' ? 'rgba(59, 130, 246, 0.1)' :
                    expressionState === 'thinking' ? 'rgba(168, 85, 247, 0.1)' :
                    `rgba(34, 197, 94, ${0.05 + pulseIntensity * 0.1})`
                  } 0%, transparent 70%)`,
            }}
          />
        </div>
      </div>

      {/* Status indicator badge */}
      <div className="absolute bottom-1 right-1 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50 shadow-md">
        <div className={`h-2 w-2 rounded-full ${getStatusColor()} ${expressionState !== 'idle' && isOnline ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium text-foreground">{getStatusText()}</span>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.015) translateY(-2px); }
        }

        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes pulse-fast {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }

        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-pulse-fast {
          animation: pulse-fast 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
