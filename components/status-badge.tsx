'use client'

import type { ExpressionState } from '@/lib/types'

interface StatusBadgeProps {
  isOnline: boolean
  expressionState?: ExpressionState
}

export function getStatusText(expressionState: ExpressionState, isOnline: boolean): string {
  if (!isOnline) return 'Offline'
  switch (expressionState) {
    case 'listening':  return 'Listening...'
    case 'thinking':   return 'Thinking...'
    case 'speaking':   return 'Speaking...'
    case 'happy':      return 'Happy'
    case 'sad':        return 'Sad'
    case 'angry':      return 'Frustrated'
    case 'surprised':  return 'Surprised'
    case 'thoughtful': return 'Thoughtful'
    default:           return 'Online'
  }
}

export function getStatusDotColor(expressionState: ExpressionState, isOnline: boolean): string {
  if (!isOnline) return 'bg-gray-500'
  switch (expressionState) {
    case 'listening':  return 'bg-blue-500'
    case 'thinking':   return 'bg-purple-500'
    case 'speaking':   return 'bg-green-500'
    case 'happy':      return 'bg-yellow-400'
    case 'sad':        return 'bg-slate-400'
    case 'angry':      return 'bg-red-500'
    case 'surprised':  return 'bg-orange-400'
    case 'thoughtful': return 'bg-indigo-400'
    default:           return 'bg-green-500'
  }
}

/**
 * StatusBadge — single canonical status indicator.
 * Rendered by companion-window.tsx as an absolute overlay,
 * positioned bottom-right of the avatar container.
 * All visual formats pass hideStatus=true to suppress their own badge.
 */
export function StatusBadge({ isOnline, expressionState = 'idle' }: StatusBadgeProps) {
  return (
    <div className="absolute bottom-1 right-1 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50 shadow-md z-10">
      <div
        className={`h-2 w-2 rounded-full flex-shrink-0 ${getStatusDotColor(expressionState, isOnline)} ${
          expressionState !== 'idle' && isOnline ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-xs font-medium text-foreground">
        {getStatusText(expressionState, isOnline)}
      </span>
    </div>
  )
}
