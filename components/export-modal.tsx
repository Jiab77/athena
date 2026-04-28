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
import { useTranslation } from '@/hooks/use-translation'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true)
    setError(null)
    
    try {
      await exportAndDownload(format)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('export.errorFallback')
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>
            {t('export.description')}
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
                <h3 className="font-semibold text-foreground">{t('export.json.title')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('export.json.description')}
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
                {isExporting ? t('export.exporting') : t('export.export')}
              </Button>
            </div>
          </div>

          {/* Markdown Option */}
          <div className="p-4 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition"
            onClick={() => handleExport('markdown')}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{t('export.markdown.title')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('export.markdown.description')}
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
                {isExporting ? t('export.exporting') : t('export.export')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
