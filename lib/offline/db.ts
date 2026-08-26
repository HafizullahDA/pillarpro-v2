// Lightweight IndexedDB helper for Offline Storage Queue

const DB_NAME = 'PillarProOfflineDB'
const DB_VERSION = 1

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
