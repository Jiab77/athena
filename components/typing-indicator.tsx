'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
  message?: string
}

export function TypingIndicator({ className, message = 'Thinking...' }: TypingIndicatorProps) {
  return (
    <div className={cn('flex justify-start', className)}>
      <div className="bg-secondary text-secondary-foreground rounded-lg rounded-bl-none px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '0ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '150ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-foreground ml-2">{message}</span>
        </div>
      </div>
    </div>
  )
}
