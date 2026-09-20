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
  type: 'expense' | 'attendance' | 'supplier' | 'supplier_transaction' | 'diesel_log'
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

export async function saveToOfflineQueue(
  type: QueuedItem['type'],
  payload: any
): Promise<string> {
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
  return new Promise<QueuedItem[]>((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly')
    const store = tx.objectStore('queue')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  }).then(items => items.sort((a, b) => a.createdAt - b.createdAt))
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
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    if (session?.user?.id) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pillarpro_last_user_id', session.user.id)
        } catch {}
      }
      return session.user.id
    }
  } catch {
    // Session fetch may fail when offline or token refresh encounters network errors
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('pillarpro_last_user_id')
      if (cached) return cached
    } catch {}
  }
  return null
}

/**
 * Persist a read-only copy of data that the current user has already viewed.
 * Snapshots are keyed by user id and are cleared when the user signs out.
 */
export async function saveOfflineSnapshot<T>(route: string, payload: T): Promise<void> {
  const userId = (await getCurrentUserId()) || 'local'

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
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const req = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll()
    req.onsuccess = () => {
      const all = (req.result || []) as OfflineSnapshot<T>[]
      // Exact match for active user & route
      let match = userId ? all.find(s => s.userId === userId && s.route === route) : undefined
      // Fallback: match by route across device snapshots (e.g. offline session fallback)
      if (!match) {
        match = all.find(s => s.route === route)
      }
      resolve(match ? { payload: match.payload, savedAt: match.savedAt } : null)
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieve all offline snapshots cached on this device.
 * Used by the offline page to display Dashboard, Suppliers, Bills, Projects, etc.
 */
export async function getAllOfflineSnapshots(): Promise<Record<string, { payload: any; savedAt: number }>> {
  const db = await openDB()
  const userId = await getCurrentUserId()

  return new Promise((resolve, reject) => {
    const req = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll()
    req.onsuccess = () => {
      const all = (req.result || []) as OfflineSnapshot<any>[]
      const map: Record<string, { payload: any; savedAt: number }> = {}

      for (const item of all) {
        if (!userId || item.userId === userId || item.userId === 'local' || !item.userId) {
          if (!map[item.route] || map[item.route].savedAt < item.savedAt) {
            map[item.route] = { payload: item.payload, savedAt: item.savedAt }
          }
        }
      }

      // If map is empty and userId filter was too restrictive, fallback to any available snapshots
      if (Object.keys(map).length === 0 && all.length > 0) {
        for (const item of all) {
          if (!map[item.route] || map[item.route].savedAt < item.savedAt) {
            map[item.route] = { payload: item.payload, savedAt: item.savedAt }
          }
        }
      }

      resolve(map)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function clearOfflineData(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('pillarpro_last_user_id')
    } catch {}
  }
  const db = await openDB()
  await Promise.all(['queue', 'snapshots'].map(storeName => new Promise<void>((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })))
}
