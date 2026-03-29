'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AthenaDB, getDB } from '@/lib/db'

interface DBContextType {
  db: AthenaDB | null
  dbReady: boolean
}

const DBContext = createContext<DBContextType>({
  db: null,
  dbReady: false,
})

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AthenaDB | null>(null)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    const initDB = async () => {
      try {
        const dbInstance = await getDB()
        setDb(dbInstance)
        setDbReady(true)
      } catch (error) {
        setDbReady(true) // Mark as ready even on error so app doesn't hang
      }
    }
    initDB()
  }, [])

  return (
    <DBContext.Provider value={{ db, dbReady }}>
      {children}
    </DBContext.Provider>
  )
}

export function useDB(): DBContextType {
  const context = useContext(DBContext)
  if (context === undefined) {
    throw new Error('useDB must be used within a DBProvider')
  }
  return context
}
