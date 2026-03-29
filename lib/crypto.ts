/**
 * Encryption utilities using Web Crypto API
 * Implements AES-GCM encryption (built-in, no dependencies)
 * Uses device-specific key derivation for user isolation
 */

import { getDeviceID } from './device-id'

export interface EncryptedData {
  ciphertext: string // base64 encoded
  iv: string // base64 encoded initialization vector
  salt: string // base64 encoded salt
  iterations?: number // PBKDF2 iteration count — stored so legacy blobs decrypt correctly
}

/**
 * Current PBKDF2 iteration count.
 * NIST SP 800-132 (2023) recommends ≥600,000 for SHA-256.
 * Legacy blobs without an `iterations` field were encrypted at 100,000
 * and will be decrypted using that fallback value transparently.
 */
const PBKDF2_ITERATIONS = 600_000
const PBKDF2_ITERATIONS_LEGACY = 100_000

/**
 * Derive a key from device ID and purpose using PBKDF2
 */
async function deriveKey(purpose: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const deviceID = await getDeviceID()

  // Combine device ID with purpose to create unique password per use case
  const passwordData = encoder.encode(`${deviceID}:${purpose}`)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with device-specific key derivation
 */
export async function encryptData(
  plaintext: string,
  purpose: string = 'athena-default'
): Promise<EncryptedData> {
  const encoder = new TextEncoder()
  const randomSalt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const key = await deriveKey(purpose, randomSalt, PBKDF2_ITERATIONS)
  const plaintextBytes = encoder.encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintextBytes
  )

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...randomSalt)),
    iterations: PBKDF2_ITERATIONS,
  }
}

/**
 * Decrypt data with device-specific key derivation
 */
export async function decryptData(
  encrypted: EncryptedData,
  purpose: string = 'athena-default'
): Promise<string | null> {
  try {
    const salt = new Uint8Array(atob(encrypted.salt).split('').map(c => c.charCodeAt(0)))
    const iv = new Uint8Array(atob(encrypted.iv).split('').map(c => c.charCodeAt(0)))
    const ciphertext = new Uint8Array(atob(encrypted.ciphertext).split('').map(c => c.charCodeAt(0)))

    // Use stored iteration count if present, fall back to legacy value for
    // blobs encrypted before the iteration count was persisted in the blob.
    const iterations = encrypted.iterations ?? PBKDF2_ITERATIONS_LEGACY
    const key = await deriveKey(purpose, salt, iterations)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    return null
  }
}
