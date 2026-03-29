'use client'

import { useState, useEffect } from 'react'
import { MessageSquarePlus, History, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDB } from '@/lib/db-context'
import { decryptData } from '@/lib/crypto'
import type { ConversationData } from '@/lib/types'

interface ConversationHistoryProps {
  currentConversationId: string | null
  onSelectConversation: (conversation: ConversationData) => void
  onNewConversation: () => void
}

export function ConversationHistory({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationHistoryProps) {
  const { db, dbReady } = useDB()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!dbReady || !db) return

    const loadConversations = async () => {
      try {
        const stored = await db.getAllConversations()
        console.log('[Athena] Conversation history - found', stored.length, 'stored conversations')

        // Decrypt each stored conversation — skip any that fail (e.g. old unencrypted data)
        const decrypted: ConversationData[] = []
        for (const conv of stored) {
          try {
            const [messagesJson, metadataJson] = await Promise.all([
              decryptData(conv.messagesEncrypted, 'athena-conversations'),
              decryptData(conv.metadataEncrypted, 'athena-conversations'),
            ])
            if (!messagesJson || !metadataJson) {
              console.warn('[Athena] Conversation history - skipping unreadable conversation:', conv.id, '— decryption returned null (likely old format)')
              continue
            }
            const messages = JSON.parse(messagesJson)
            const metadata = JSON.parse(metadataJson)
            if (!Array.isArray(messages)) {
              console.warn('[Athena] Conversation history - skipping conversation with invalid messages shape:', conv.id)
              continue
            }
            decrypted.push({
              id: conv.id,
              companionId: '',
              messages,
              createdAt: metadata.createdAt || metadata.updatedAt || new Date().toISOString(),
              updatedAt: metadata.updatedAt || new Date().toISOString(),
            })
          } catch {
            console.warn('[Athena] Conversation history - skipping unreadable conversation:', conv.id)
          }
        }

        // Sort by updatedAt descending (most recent first)
        const sorted = decrypted.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        console.log('[Athena] Conversation history - loaded', sorted.length, 'decrypted conversations')
        setConversations(sorted)
      } catch (error) {
        console.error('[Athena] Error loading conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [db, dbReady, currentConversationId])

  const handleDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!db) return

    try {
      await db.deleteConversation(convId)
      setConversations(prev => prev.filter(c => c.id !== convId))
      
      // If deleting current conversation, start a new one
      if (convId === currentConversationId) {
        onNewConversation()
      }
    } catch (error) {
      console.error('[Athena] Error deleting conversation:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getPreview = (conv: ConversationData) => {
    if (conv.messages.length === 0) return 'Empty conversation'
    const lastMsg = conv.messages[conv.messages.length - 1]
    const preview = lastMsg.content.slice(0, 40)
    return preview.length < lastMsg.content.length ? `${preview}...` : preview
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onNewConversation}
        title="New conversation"
        className="h-8 w-8 cursor-pointer"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Conversation history"
            className="h-8 w-8 cursor-pointer"
          >
            <History className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {isLoading ? (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">Loading...</span>
            </DropdownMenuItem>
          ) : conversations.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">No conversations yet</span>
            </DropdownMenuItem>
          ) : (
            <>
              {conversations.slice(0, 10).map((conv) => (
                <DropdownMenuItem
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`flex items-start justify-between cursor-pointer ${
                    conv.id === currentConversationId ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.updatedAt)}
                    </p>
                    <p className="text-sm truncate">
                      {getPreview(conv)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 cursor-pointer"
                    onClick={(e) => handleDelete(conv.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))}
              {conversations.length > 10 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <span className="text-xs text-muted-foreground">
                      +{conversations.length - 10} more conversations
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
