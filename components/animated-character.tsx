'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import type { ExpressionState } from '@/lib/types'

// Lazy load R3F component for code splitting — Three.js is heavy
const R3FAnimatedCharacter = lazy(() =>
  import('./r3f-animated-character').then(mod => ({ default: mod.R3FAnimatedCharacter }))
)

interface AnimatedCharacterProps {
  imageUrl: string
  name: string
  expressionState?: ExpressionState
  isOnline?: boolean
  usePixi?: boolean
  hideStatus?: boolean
}

export function AnimatedCharacter({
  imageUrl,
  name,
  expressionState = 'idle',
  isOnline = true,
  usePixi = true,
  hideStatus = false,
}: AnimatedCharacterProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)

  // Simulate audio levels for speaking state
  useEffect(() => {
    if (expressionState !== 'speaking') {
      setPulseIntensity(0)
      return
    }

    const interval = setInterval(() => {
      setPulseIntensity(Math.random() * 100)
    }, 100)

    return () => clearInterval(interval)
  }, [expressionState])

  // Expression-specific styles
  const getExpressionStyles = () => {
    switch (expressionState) {
      case 'listening':
        return {
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
          animation: 'pulse-listen 1.5s ease-in-out infinite',
        }
      case 'thinking':
        return {
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
          animation: 'pulse-think 0.8s ease-in-out infinite',
        }
      case 'speaking':
        return {
          boxShadow: `0 0 ${20 + pulseIntensity * 0.3}px rgba(34, 197, 94, 0.5), 0 0 ${40 + pulseIntensity * 0.5}px rgba(34, 197, 94, 0.3)`,
          animation: 'none',
        }
      // Emotion states
      case 'happy':
        return {
          boxShadow: '0 0 24px rgba(250, 204, 21, 0.6), 0 0 48px rgba(250, 204, 21, 0.3)',
          animation: 'pulse-happy 1.2s ease-in-out infinite',
        }
      case 'sad':
        return {
          boxShadow: '0 0 16px rgba(100, 116, 139, 0.5), 0 0 32px rgba(100, 116, 139, 0.2)',
          animation: 'float 6s ease-in-out infinite',
        }
      case 'angry':
        return {
          boxShadow: '0 0 24px rgba(239, 68, 68, 0.6), 0 0 48px rgba(239, 68, 68, 0.3)',
          animation: 'pulse-angry 0.6s ease-in-out infinite',
        }
      case 'surprised':
        return {
          boxShadow: '0 0 28px rgba(249, 115, 22, 0.6), 0 0 56px rgba(249, 115, 22, 0.3)',
          animation: 'pulse-surprised 0.4s ease-in-out 3',
        }
      case 'thoughtful':
        return {
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(99, 102, 241, 0.25)',
          animation: 'pulse-think 2s ease-in-out infinite',
        }
      default: // idle
        return {
          boxShadow: '0 4px 20px rgba(var(--primary), 0.2)',
          animation: 'float 4s ease-in-out infinite, breathe 3s ease-in-out infinite',
        }
    }
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    switch (expressionState) {
      case 'listening': return 'Listening...'
      case 'thinking': return 'Thinking...'
      case 'speaking': return 'Speaking...'
      case 'happy': return 'Happy'
      case 'sad': return 'Sad'
      case 'angry': return 'Frustrated'
      case 'surprised': return 'Surprised'
      case 'thoughtful': return 'Thoughtful'
      default: return 'Online'
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500'
    switch (expressionState) {
      case 'listening': return 'bg-blue-500'
      case 'thinking': return 'bg-purple-500'
      case 'speaking': return 'bg-green-500'
      case 'happy': return 'bg-yellow-400'
      case 'sad': return 'bg-slate-400'
      case 'angry': return 'bg-red-500'
      case 'surprised': return 'bg-orange-400'
      case 'thoughtful': return 'bg-indigo-400'
      default: return 'bg-green-500'
    }
  }

  const styles = getExpressionStyles()

  // Use Three.js (R3F) canvas rendering when enabled
  if (usePixi) {
    return (
      <Suspense fallback={
        <div className="w-48 rounded-lg overflow-hidden border border-primary/30 bg-muted animate-pulse flex items-center justify-center" style={{ height: '264px' }}>
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      }>
        <R3FAnimatedCharacter
          imageUrl={imageUrl}
          name={name}
          expressionState={expressionState}
          isOnline={isOnline}
        />
      </Suspense>
    )
  }

  // CSS fallback for lower-end devices
  return (
    <div className="relative">
      {/* Character container with dynamic expression effects */}
      <div 
        className={`w-48 h-66 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
          expressionState === 'listening' ? 'border-blue-500/60' :
          expressionState === 'thinking' ? 'border-purple-500/60' :
          expressionState === 'speaking' ? 'border-green-500/60' :
          expressionState === 'happy' ? 'border-yellow-400/60' :
          expressionState === 'sad' ? 'border-slate-400/60' :
          expressionState === 'angry' ? 'border-red-500/60' :
          expressionState === 'surprised' ? 'border-orange-400/60' :
          expressionState === 'thoughtful' ? 'border-indigo-400/60' :
          'border-primary/30'
        }`}
        style={styles}
      >
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={name}
          className="w-full h-full object-cover"
        />

        {/* Expression overlay effects */}
        {expressionState === 'thinking' && (
          <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
        )}
        {expressionState === 'listening' && (
          <div className="absolute inset-0 bg-blue-500/10" />
        )}
        {expressionState === 'speaking' && (
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500/30 to-transparent transition-all duration-100"
            style={{ height: `${20 + pulseIntensity * 0.3}%` }}
          />
        )}
        {/* Emotion overlay effects */}
        {expressionState === 'happy' && (
          <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
        )}
        {expressionState === 'sad' && (
          <div className="absolute inset-0 bg-slate-500/15" />
        )}
        {expressionState === 'angry' && (
          <div className="absolute inset-0 bg-red-500/15 animate-pulse" />
        )}
        {expressionState === 'surprised' && (
          <div className="absolute inset-0 bg-orange-400/10 animate-pulse" />
        )}
        {expressionState === 'thoughtful' && (
          <div className="absolute inset-0 bg-indigo-400/10 animate-pulse" />
        )}
      </div>

      {/* Dynamic status indicator */}
      {!hideStatus && (
        <div className="absolute bottom-1 right-1 flex items-center gap-2 bg-background/80 px-3 py-1 rounded-full border border-primary/30 shadow-md">
          <div className={`h-2 w-2 rounded-full ${getStatusColor()} ${expressionState !== 'idle' && isOnline ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium text-foreground">{getStatusText()}</span>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes pulse-listen {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3);
          }
          50% { 
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.7), 0 0 60px rgba(59, 130, 246, 0.4);
          }
        }
        @keyframes pulse-think {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3);
          }
          50% { 
            box-shadow: 0 0 35px rgba(168, 85, 247, 0.8), 0 0 70px rgba(168, 85, 247, 0.5);
          }
        }
        @keyframes pulse-happy {
          0%, 100% { 
            box-shadow: 0 0 24px rgba(250, 204, 21, 0.6), 0 0 48px rgba(250, 204, 21, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 36px rgba(250, 204, 21, 0.8), 0 0 72px rgba(250, 204, 21, 0.4);
            transform: scale(1.01);
          }
        }
        @keyframes pulse-angry {
          0%, 100% { 
            box-shadow: 0 0 24px rgba(239, 68, 68, 0.6), 0 0 48px rgba(239, 68, 68, 0.3);
          }
          50% { 
            box-shadow: 0 0 32px rgba(239, 68, 68, 0.9), 0 0 64px rgba(239, 68, 68, 0.5);
          }
        }
        @keyframes pulse-surprised {
          0% { transform: scale(1); }
          30% { transform: scale(1.04); }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
