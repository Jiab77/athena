/**
 * IndexedDB utilities for Athena
 * Handles encrypted storage per MEMORY.md and IMPLEMENTATION_PLAN.md
 */

import type { StoredSettings } from './types'
import { encryptData, decryptData } from './crypto'
export type { StoredSettings }

// Internal DB record — the actual shape stored in IndexedDB
interface StoredSettingsRecord {
  key: string
  settingsEncrypted: string // base64 JSON of EncryptedData
}

export interface StoredCompanion {
  id: string
  nameEncrypted?: string
  personalityEncrypted?: string
  appearanceEncrypted?: string
  imageUrl?: string
  createdAt: string
}

export interface StoredConversation {
  id: string
  companionIdEncrypted: string
  messagesEncrypted: string // base64 encoded encrypted JSON
  metadataEncrypted: string // base64 encoded encrypted metadata
}

export interface StoredAPIKey {
  provider: string
  keyEncrypted: string
  updatedAt: string
}

export interface StoredDeviceID {
  key: string // 'athena-device-id' as the singleton key
  deviceID: string
  createdAt: string
}

export class AthenaDB {
  private db: IDBDatabase | null = null
  private dbName = 'athena-db'
  private version = 1

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('companions')) {
          db.createObjectStore('companions', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('apiKeys')) {
          db.createObjectStore('apiKeys', { keyPath: 'provider' })
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * Store a companion
   */
  async storeCompanion(companion: StoredCompanion): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['companions'], 'readwrite')
      const store = transaction.objectStore('companions')
      const request = store.put(companion)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get a companion by ID
   */
  async getCompanion(id: string): Promise<StoredCompanion | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['companions'], 'readonly')
      const store = transaction.objectStore('companions')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Get all companions
   */
  async getAllCompanions(): Promise<StoredCompanion[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['companions'], 'readonly')
      const store = transaction.objectStore('companions')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Delete a companion
   */
  async deleteCompanion(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['companions'], 'readwrite')
      const store = transaction.objectStore('companions')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Store a conversation
   */
  async storeConversation(conversation: StoredConversation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readwrite')
      const store = transaction.objectStore('conversations')
      const request = store.put(conversation)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<StoredConversation | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly')
      const store = transaction.objectStore('conversations')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Get all conversations
   */
  async getAllConversations(): Promise<StoredConversation[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly')
      const store = transaction.objectStore('conversations')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readwrite')
      const store = transaction.objectStore('conversations')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Store API key
   */
  async storeAPIKey(apiKey: StoredAPIKey): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiKeys'], 'readwrite')
      const store = transaction.objectStore('apiKeys')
      const request = store.put(apiKey)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Check API key by provider
   */
  async checkAPIKey(provider: string): Promise<StoredAPIKey | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiKeys'], 'readonly')
      const store = transaction.objectStore('apiKeys')
      const request = store.get(provider)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Delete API key
   */
  async deleteAPIKey(provider: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiKeys'], 'readwrite')
      const store = transaction.objectStore('apiKeys')
      const request = store.delete(provider)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Store user settings — encrypted at rest
   */
  async storeSettings(settings: StoredSettings): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const plaintext = JSON.stringify(settings)
    const encrypted = await encryptData(plaintext, 'athena-settings')
    const record: StoredSettingsRecord = {
      key: 'userSettings',
      settingsEncrypted: JSON.stringify(encrypted),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      const request = store.put(record)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get user settings — decrypts on read
   * Falls back to treating stored value as plaintext for backwards compatibility
   * with data stored before encryption was introduced
   */
  async getSettings(): Promise<StoredSettings | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const request = store.get('userSettings')

      request.onerror = () => reject(request.error)
      request.onsuccess = async () => {
        const record = request.result
        if (!record) return resolve(null)

        // Encrypted record: { key, settingsEncrypted }
        if (record.settingsEncrypted) {
          try {
            const encrypted = JSON.parse(record.settingsEncrypted)
            const plaintext = await decryptData(encrypted, 'athena-settings')
            if (!plaintext) return resolve(null)
            resolve(JSON.parse(plaintext) as StoredSettings)
          } catch {
            resolve(null)
          }
          return
        }

        // Legacy plaintext fallback — migrate on next write
        resolve(record as StoredSettings)
      }
    })
  }

}

// Singleton instance
let dbInstance: AthenaDB | null = null

export async function getDB(): Promise<AthenaDB> {
  if (!dbInstance) {
    dbInstance = new AthenaDB()
    await dbInstance.init()
  }
  return dbInstance
}
