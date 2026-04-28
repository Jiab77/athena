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
import { useTranslation } from '@/hooks/use-translation'

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
  const { t, locale } = useTranslation()

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
        warning = t('import.markdownWarning')
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
      const message = err instanceof Error ? err.message : t('import.loadFailed')
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
      alert(t('import.successAlert', { imported: result.imported, skipped: result.skipped }))
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('import.errorFallback')
      setError(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>
            {t('import.description')}
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
                <p className="text-muted-foreground text-xs font-semibold">{t('import.format')}</p>
                <p className="font-medium capitalize">{summary.format}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold">{t('import.fileSize')}</p>
                <p className="font-medium">{summary.fileSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold">{t('import.conversations')}</p>
                <p className="font-medium">{summary.conversationCount}</p>
              </div>
              {summary.exportDate && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">{t('import.exported')}</p>
                  <p className="font-medium text-xs">
                    {new Date(summary.exportDate).toLocaleDateString(locale === 'en' ? 'en-US' : locale)}
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
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!summary || isImporting}
            className="cursor-pointer"
          >
            {isImporting ? t('import.importing') : t('import.import')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
