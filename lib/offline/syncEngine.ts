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
      } else if (item.type === 'supplier') {
        // Offline suppliers have a client-generated UUID, making retries safe.
        const { data: organizationId, error: organizationError } = await supabase.rpc('get_user_organization_id')
        if (organizationError || !organizationId) throw organizationError || new Error('Organization is unavailable')

        const { error } = await supabase
          .from('suppliers')
          .upsert({ ...item.payload, organization_id: organizationId }, { onConflict: 'id', ignoreDuplicates: true })
        if (error) throw error
      } else if (item.type === 'supplier_transaction') {
        // A client-generated UUID prevents a reconnect retry from duplicating a payment or procurement.
        const { error } = await supabase
          .from('supplier_transactions')
          .upsert(item.payload, { onConflict: 'id', ignoreDuplicates: true })
        if (error) throw error
      } else if (item.type === 'diesel_log') {
        let payload = item.payload
        if (!payload.organization_id) {
          const { data: organizationId } = await supabase.rpc('get_user_organization_id')
          if (organizationId) payload = { ...payload, organization_id: organizationId }
        }
        const { error } = await supabase
          .from('machinery_logs')
          .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })
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
