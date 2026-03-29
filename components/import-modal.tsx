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
import { Card } from '@/components/ui/card'
import { detectFormatFromExtension, importFromJSON, importFromMarkdown } from '@/lib/import'
import { handleFileImport } from '@/lib/import'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  file: File | null
}

interface ImportSummary {
  format: 'json' | 'markdown'
  conversationCount: number
  fileSize: string
  exportDate?: string
  warning?: string
}

export function ImportModal({ isOpen, onClose, file }: ImportModalProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  // Load file summary when file changes
  useState(() => {
    if (file && isOpen) {
      loadFileSummary()
    }
  })

  const loadFileSummary = async () => {
    if (!file) return

    try {
      const format = detectFormatFromExtension(file.name)
      const fileContent = await file.text()
      let conversationCount = 0
      let exportDate: string | undefined
      let warning: string | undefined

      if (format === 'json') {
        const data = JSON.parse(fileContent)
        conversationCount = data.conversations?.length || 0
        exportDate = data.exportedAt
      } else if (format === 'markdown') {
        const conversationMatches = fileContent.match(/## Conversation \d+/g)
        conversationCount = conversationMatches?.length || 0
        warning = 'Markdown imports are preview-only. Use JSON for full recovery.'
      }

      const fileSizeKB = (file.size / 1024).toFixed(2)

      setSummary({
        format,
        conversationCount,
        fileSize: `${fileSizeKB} KB`,
        exportDate,
        warning,
      })
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file'
      setError(message)
      setSummary(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setError(null)

    try {
      const result = await handleFileImport(file)
      alert(`Import successful: ${result.imported} imported, ${result.skipped} skipped`)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setError(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Conversations</DialogTitle>
          <DialogDescription>
            Review the contents before importing to your database.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {summary && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-semibold">Format</p>
                <p className="font-medium capitalize">{summary.format}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold">File Size</p>
                <p className="font-medium">{summary.fileSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold">Conversations</p>
                <p className="font-medium">{summary.conversationCount}</p>
              </div>
              {summary.exportDate && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Exported</p>
                  <p className="font-medium text-xs">
                    {new Date(summary.exportDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {summary.warning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">{summary.warning}</p>
              </div>
            )}
          </Card>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!summary || isImporting}
            className="cursor-pointer"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
