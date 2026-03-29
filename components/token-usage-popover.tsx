'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface TokenUsage {
  // Groq format
  prompt_tokens?: number
  completion_tokens?: number
  // OpenAI format
  input_tokens?: number
  output_tokens?: number
  // Common
  total_tokens: number
}

interface TokenUsagePopoverProps {
  usage: TokenUsage | null
  maxTokens?: number
}

export function TokenUsagePopover({ usage, maxTokens = 8192 }: TokenUsagePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const totalUsed = usage?.total_tokens || 0
  const percentage = maxTokens > 0 ? Math.min((totalUsed / maxTokens) * 100, 100) : 0
  
  // Calculate stroke dasharray for circular progress
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  // Color based on usage level
  const getProgressColor = () => {
    if (percentage < 50) return 'stroke-primary'
    if (percentage < 80) return 'stroke-yellow-500'
    return 'stroke-destructive'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-8 h-8 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          title="Token usage"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="14"
              cy="14"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/30"
            />
            {/* Progress circle */}
            <circle
              cx="14"
              cy="14"
              r={radius}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className={getProgressColor()}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-4 bg-popover border-border"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {totalUsed.toLocaleString()} tokens
            </span>
          </div>
          
          <div className="space-y-2">
            <TokenBar 
              label="Input" 
              value={usage?.prompt_tokens || usage?.input_tokens || 0} 
              max={maxTokens}
            />
            <TokenBar 
              label="Output" 
              value={usage?.completion_tokens || usage?.output_tokens || 0} 
              max={maxTokens}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TokenBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
