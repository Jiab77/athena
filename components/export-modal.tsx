'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { exportAndDownload } from '@/lib/export'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true)
    setError(null)
    
    try {
      await exportAndDownload(format)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Conversations</DialogTitle>
          <DialogDescription>
            Choose a format for exporting your conversation history with Athena.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* JSON Option */}
          <div className="p-4 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition"
            onClick={() => handleExport('json')}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">JSON Format</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete export with full structure. Best for backup and re-import.
                </p>
              </div>
              <Button
                size="sm"
                disabled={isExporting}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExport('json')
                }}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>

          {/* Markdown Option */}
          <div className="p-4 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition"
            onClick={() => handleExport('markdown')}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Markdown Format</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Human-readable transcript. Easy to read and share.
                </p>
              </div>
              <Button
                size="sm"
                disabled={isExporting}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExport('markdown')
                }}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
