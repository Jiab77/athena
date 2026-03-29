'use client'

import React from "react"

import { useState } from 'react'
import { MessageCircle, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FABItem {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

interface FloatingActionButtonProps {
  items?: FABItem[]
  onCompanionClick?: () => void
  onSettingsClick?: () => void
}

export function FloatingActionButton({
  items,
  onCompanionClick,
  onSettingsClick,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Default items if not provided
  const defaultItems: FABItem[] = [
    {
      id: 'companion',
      label: 'Companion',
      icon: <MessageCircle className="h-5 w-5" />,
      onClick: () => {
        onCompanionClick?.()
        setIsExpanded(false)
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      onClick: () => {
        onSettingsClick?.()
        setIsExpanded(false)
      },
    },
  ]

  const fabItems = items || defaultItems

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded menu items */}
      {isExpanded && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {fabItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-xs font-medium text-muted-foreground bg-background px-3 py-1 rounded-full whitespace-nowrap border border-border shadow-sm">
                {item.label}
              </span>
              <div className="w-12 h-12 flex-shrink-0">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => {
                    item.onClick()
                    setIsExpanded(false)
                  }}
                >
                  {item.icon}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <Button
        size="icon"
        className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  )
}
