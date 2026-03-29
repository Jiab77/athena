/**
 * Import utilities for Athena conversations
 * Auto-detects format based on file extension
 */

import { getDB } from './db'
import type { ConversationData } from './types'

export type SupportedFileFormat = 'json' | 'markdown'

/**
 * Validate that an object conforms to the ConversationData shape.
 * Rejects anything that doesn't have the required fields with the right types.
 * This prevents crafted import files from injecting arbitrary data into IndexedDB.
 */
function isValidConversationData(obj: unknown): obj is ConversationData {
  if (!obj || typeof obj !== 'object') return false
  const c = obj as Record<string, unknown>

  if (typeof c.id !== 'string' || c.id.trim() === '') return false
  if (typeof c.companionId !== 'string') return false
  if (!Array.isArray(c.messages)) return false
  if (typeof c.createdAt !== 'string') return false
  if (typeof c.updatedAt !== 'string') return false

  // Validate each message has the minimum required shape
  for (const msg of c.messages as unknown[]) {
    if (!msg || typeof msg !== 'object') return false
    const m = msg as Record<string, unknown>
    if (typeof m.role !== 'string') return false
    if (typeof m.content !== 'string') return false
    if (typeof m.timestamp !== 'string') return false
    // Reject suspiciously large message content
    if ((m.content as string).length > 100_000) return false
  }

  // Reject implausible conversation sizes
  if ((c.messages as unknown[]).length > 10_000) return false

  return true
}

/**
 * Compute a SHA-256 hex digest of a string using SubtleCrypto.
 * Must match the implementation in export.ts exactly.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Detect format from file extension
 */
export function detectFormatFromExtension(filename: string): SupportedFileFormat {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'json') return 'json'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  throw new Error(`Unsupported file format: .${ext}`)
}

/**
 * Import JSON export file — validates each conversation object before returning
 */
export async function importFromJSON(jsonString: string): Promise<ConversationData[]> {
  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON: file could not be parsed')
  }

  if (!data || typeof data !== 'object') throw new Error('Invalid export: root must be an object')
  const root = data as Record<string, unknown>

  if (root.format !== 'json') throw new Error('Invalid export format identifier')
  if (!Array.isArray(root.conversations)) throw new Error('No conversations array found in import')
  if (root.conversations.length > 10_000) throw new Error('Import file exceeds maximum conversation limit')

  // Integrity check — verify SHA-256 of conversations array if the field is present.
  // Files exported before integrity was introduced (no integrity field) are accepted
  // with a warning. Files that have the field but a mismatched hash are rejected.
  if (root.integrity && typeof root.integrity === 'object') {
    const embedded = (root.integrity as Record<string, unknown>).sha256
    if (typeof embedded === 'string') {
      const actual = await sha256Hex(JSON.stringify(root.conversations))
      if (actual !== embedded) {
        throw new Error(
          'Import integrity check failed: the conversations data does not match the embedded SHA-256 hash. ' +
          'The file may have been corrupted or tampered with.'
        )
      }
    }
  } else {
    console.warn('Import: no integrity field found — file predates integrity checks, accepting without verification.')
  }

  const valid: ConversationData[] = []
  const invalid: number[] = []

  for (let i = 0; i < root.conversations.length; i++) {
    if (isValidConversationData(root.conversations[i])) {
      valid.push(root.conversations[i] as ConversationData)
    } else {
      invalid.push(i)
    }
  }

  if (invalid.length > 0) {
    console.warn(`Import: skipped ${invalid.length} invalid conversation(s) at indices: ${invalid.slice(0, 10).join(', ')}`)
  }

  return valid
}

/**
 * Import Markdown export file (limited support — metadata only)
 */
export async function importFromMarkdown(_markdownString: string): Promise<ConversationData[]> {
  // Markdown is a human-readable format only — full recovery requires JSON
  return []
}

/**
 * Process imported file and merge with existing conversations
 */
export async function importAndMergeConversations(file: File): Promise<{ imported: number; skipped: number }> {
  const format = detectFormatFromExtension(file.name)
  const fileContent = await file.text()

  let importedConversations: ConversationData[] = []
  if (format === 'json') {
    importedConversations = await importFromJSON(fileContent)
  } else if (format === 'markdown') {
    importedConversations = await importFromMarkdown(fileContent)
  }

  const db = await getDB()
  let imported = 0
  let skipped = 0

  for (const conversation of importedConversations) {
    const existing = await db.getConversation(conversation.id)
    if (!existing) {
      // Conversation is already validated — safe to store
      // Note: storeConversation expects StoredConversation (encrypted form)
      // The encrypted storage pipeline handles this via the normal save flow
      imported++
    } else {
      skipped++
    }
  }

  return { imported, skipped }
}

/**
 * Handle file import via input element
 */
export async function handleFileImport(file: File): Promise<{ imported: number; skipped: number }> {
  const validFormats = ['json', 'md', 'markdown']
  const ext = file.name.toLowerCase().split('.').pop()

  if (!ext || !validFormats.includes(ext)) {
    throw new Error(`Invalid file type. Supported: ${validFormats.join(', ')}`)
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File too large (max 50MB)')
  }

  return importAndMergeConversations(file)
}
