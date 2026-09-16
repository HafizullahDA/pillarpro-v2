// Lightweight IndexedDB helper for Offline Storage Queue

const DB_NAME = 'PillarProOfflineDB'
const DB_VERSION = 2

type OfflineSnapshot<T = unknown> = {
  id: string
  userId: string
  route: string
  payload: T
  savedAt: number
}

export type QueuedItem = {
  id: string
  type: 'expense' | 'attendance'
  payload: any
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
    if (!db.objectStoreNames.contains('queue')) {
      db.createObjectStore('queue', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('snapshots')) {
      db.createObjectStore('snapshots', { keyPath: 'id' })
    }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveToOfflineQueue(type: 'expense' | 'attendance', payload: any): Promise<string> {
  const db = await openDB()
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  const item: QueuedItem = {
    id,
    type,
    payload,
    createdAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    const store = tx.objectStore('queue')
    const req = store.put(item)

    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflineQueue(): Promise<QueuedItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly')
    const store = tx.objectStore('queue')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    const store = tx.objectStore('queue')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    const store = tx.objectStore('queue')
    const req = store.clear()

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function getCurrentUserId(): Promise<string | null> {
  const { createClient } = await import('@/lib/supabase/client')
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * Persist a read-only copy of data that the current user has already viewed.
 * Snapshots are keyed by user id and are cleared when the user signs out.
 */
export async function saveOfflineSnapshot<T>(route: string, payload: T): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const db = await openDB()
  const snapshot: OfflineSnapshot<T> = {
    id: `${userId}:${route}`,
    userId,
    route,
    payload,
    savedAt: Date.now(),
  }

  await new Promise<void>((resolve, reject) => {
    const req = db.transaction('snapshots', 'readwrite').objectStore('snapshots').put(snapshot)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflineSnapshot<T>(route: string): Promise<{ payload: T; savedAt: number } | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('snapshots', 'readonly').objectStore('snapshots').get(`${userId}:${route}`)
    req.onsuccess = () => {
      const snapshot = req.result as OfflineSnapshot<T> | undefined
      resolve(snapshot ? { payload: snapshot.payload, savedAt: snapshot.savedAt } : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function clearOfflineData(): Promise<void> {
  const db = await openDB()
  await Promise.all(['queue', 'snapshots'].map(storeName => new Promise<void>((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })))
}
