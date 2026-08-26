import { createClient } from '@/lib/supabase/client'
import { getOfflineQueue, removeFromOfflineQueue } from './db'

export async function flushOfflineQueue(): Promise<{ synced: number; errors: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, errors: 0 }
  }

  const queue = await getOfflineQueue()
  if (!queue.length) return { synced: 0, errors: 0 }

  const supabase = createClient()
  let synced = 0
  let errors = 0

  for (const item of queue) {
    try {
      if (item.type === 'expense') {
        const { error } = await supabase.from('expenses').insert(item.payload)
        if (error) throw error
      } else if (item.type === 'attendance') {
        const { error } = await supabase.from('attendance').upsert(item.payload, { onConflict: 'project_id,worker_id,date' })
        if (error) throw error
      }

      await removeFromOfflineQueue(item.id)
      synced++
    } catch (err) {
      console.error(`Failed to sync offline item ${item.id}:`, err)
      errors++
    }
  }

  return { synced, errors }
}
