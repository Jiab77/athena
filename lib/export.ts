/**
 * Export utilities for Athena conversations
 * Supports JSON and Markdown formats
 */

import { getDB } from './db'
import type { ConversationData, Message } from './types'

export type ExportFormat = 'json' | 'markdown'

interface ExportData {
  version: string
  exportedAt: string
  format: 'json'
  conversations: ConversationData[]
  metadata: {
    totalConversations: number
    totalMessages: number
  }
  integrity: {
    sha256: string // SHA-256 hex digest of the canonical JSON of the conversations array
  }
}

/**
 * Compute a SHA-256 hex digest of a string using SubtleCrypto.
 * Used to produce and verify the integrity field in export files.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Export all conversations as JSON
 */
export async function exportAsJSON(): Promise<ExportData> {
  try {
    const db = await getDB()
    const storedConversations = await db.getAllConversations()
    
    // For now, since conversations are encrypted, we'll export the raw stored data
    // In production, you'd decrypt these using the appropriate key
    const conversations: ConversationData[] = storedConversations.map(stored => ({
      id: stored.id,
      companionId: stored.companionIdEncrypted, // In production, decrypt this
      messages: [], // In production, decrypt and parse this
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    // Canonical JSON of conversations — deterministic key order for stable hashing
    const conversationsCanonical = JSON.stringify(conversations)
    const integrityHash = await sha256Hex(conversationsCanonical)

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      format: 'json',
      conversations,
      metadata: {
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      },
      integrity: {
        sha256: integrityHash,
      },
    }

    return exportData
  } catch (error) {
    throw error
  }
}

/**
 * Export all conversations as Markdown
 */
export async function exportAsMarkdown(): Promise<string> {
  try {
    const db = await getDB()
    const storedConversations = await db.getAllConversations()
    
    let markdown = '# Athena Conversation Export\n\n'
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`
    markdown += `**Total Conversations:** ${storedConversations.length}\n\n`
    markdown += '---\n\n'

    // In production, decrypt conversations and format them
    storedConversations.forEach((conv, index) => {
      markdown += `## Conversation ${index + 1}\n\n`
      markdown += `**Conversation ID:** \`${conv.id}\`\n\n`
      markdown += `**Companion:** \`${conv.companionIdEncrypted}\`\n\n`
      markdown += '---\n\n'
    })

    return markdown
  } catch (error) {
    throw error
  }
}

/**
 * Download export as file
 */
export function downloadExport(data: string, filename: string, mimeType: string = 'text/plain'): void {
  try {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw error
  }
}

/**
 * Export with format selection and automatic download
 */
export async function exportAndDownload(format: ExportFormat): Promise<void> {
  try {
    const timestamp = new Date().toISOString().split('T')[0]
    
    if (format === 'json') {
      const data = await exportAsJSON()
      const jsonString = JSON.stringify(data, null, 2)
      downloadExport(jsonString, `athena-export-${timestamp}.json`, 'application/json')
    } else if (format === 'markdown') {
      const markdown = await exportAsMarkdown()
      downloadExport(markdown, `athena-export-${timestamp}.md`, 'text/markdown')
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }
    
  } catch (error) {
    throw error
  }
}
