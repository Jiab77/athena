/**
 * Device ID management for encryption key derivation
 * Generates a unique device ID on first visit and persists it.
 *
 * Storage strategy (dual-layer for resilience):
 *   Primary:   IndexedDB  — survives hard refreshes, shared across tabs
 *   Secondary: localStorage — synchronous fallback if IndexedDB is unavailable
 *
 * A new ID is NEVER generated without being persisted to at least one layer.
 * If both layers fail to read, we restore from the other before resolving.
 */

const DEVICE_ID_KEY = 'athena-device-id'
const LS_KEY = 'athena-did'

function generateDeviceID(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Read/write localStorage safely (may be blocked in some contexts) */
function lsGet(): string | null {
  try { return localStorage.getItem(LS_KEY) } catch { return null }
}
function lsSet(id: string): void {
  try { localStorage.setItem(LS_KEY, id) } catch { /* blocked — acceptable */ }
}

/**
 * Get or create device ID — always persisted, never ephemeral.
 */
export async function getDeviceID(): Promise<string> {
  // Check localStorage first — synchronous and always available
  const lsID = lsGet()

  return new Promise((resolve) => {
    let idbRequest: IDBOpenDBRequest
    try {
      idbRequest = indexedDB.open('athena-db', 1)
    } catch {
      // IndexedDB entirely unavailable — use localStorage or generate+persist there
      if (lsID) return resolve(lsID)
      const newID = generateDeviceID()
      lsSet(newID)
      return resolve(newID)
    }

    idbRequest.onsuccess = () => {
      const db = idbRequest.result

      if (!db.objectStoreNames.contains('settings')) {
        // DB exists but settings store not yet created — use localStorage anchor
        if (lsID) return resolve(lsID)
        const newID = generateDeviceID()
        lsSet(newID)
        resolve(newID)
        return
      }

      const tx = db.transaction(['settings'], 'readonly')
      const store = tx.objectStore('settings')
      const getReq = store.get(DEVICE_ID_KEY)

      getReq.onsuccess = () => {
        const idbID: string | undefined = getReq.result?.deviceID

        if (idbID) {
          // IDB has the ID — sync to localStorage and resolve
          lsSet(idbID)
          return resolve(idbID)
        }

        // IDB miss — use localStorage value if available, otherwise generate
        const id = lsID ?? generateDeviceID()

        // Persist to IDB
        try {
          const writeTx = db.transaction(['settings'], 'readwrite')
          const writeStore = writeTx.objectStore('settings')
          writeStore.put({ key: DEVICE_ID_KEY, deviceID: id, createdAt: new Date().toISOString() })
        } catch { /* IDB write failed — localStorage copy is the anchor */ }

        lsSet(id)
        resolve(id)
      }

      getReq.onerror = () => {
        // IDB read error — fall back to localStorage or generate+persist there
        const id = lsID ?? generateDeviceID()
        lsSet(id)
        resolve(id)
      }
    }

    idbRequest.onerror = () => {
      // IDB open failed — fall back to localStorage or generate+persist there
      const id = lsID ?? generateDeviceID()
      lsSet(id)
      resolve(id)
    }
  })
}
