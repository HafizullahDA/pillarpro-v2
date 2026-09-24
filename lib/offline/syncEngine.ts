import { createClient } from '@/lib/supabase/client'
import { getOfflineQueue, removeFromOfflineQueue } from './db'

export async function flushOfflineQueue(): Promise<{ synced: number; errors: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, errors: 0 }
  }

  const queue = await getOfflineQueue()
  if (!queue.length) return { synced: 0, errors: 0 }

  // Sort queue so that 'worker' additions are synced before 'attendance' records
  const sortedQueue = [...queue].sort((a, b) => {
    if (a.type === 'worker' && b.type !== 'worker') return -1
    if (a.type !== 'worker' && b.type === 'worker') return 1
    return a.createdAt - b.createdAt
  })

  const supabase = createClient()
  let synced = 0
  let errors = 0

  for (const item of sortedQueue) {
    try {
      if (item.type === 'expense') {
        const { error } = await supabase.from('expenses').insert(item.payload)
        if (error) throw error
      } else if (item.type === 'worker') {
        // Offline workers have a client-generated UUID, making retries safe.
        const { data: organizationId, error: organizationError } = await supabase.rpc('get_user_organization_id')
        if (organizationError || !organizationId) throw organizationError || new Error('Organization is unavailable')

        const workerPayload = {
          id: item.payload.id,
          name: item.payload.name,
          trade: item.payload.trade || 'Helper',
          daily_wage_rate: Number(item.payload.daily_wage_rate) || 0,
          organization_id: organizationId,
        }
        const { error } = await supabase
          .from('workers')
          .upsert(workerPayload, { onConflict: 'id', ignoreDuplicates: true })
        if (error) throw error
      } else if (item.type === 'attendance') {
        if (Array.isArray(item.payload)) {
          // Array of worker attendance rows from offline muster roll
          const rows = item.payload.map((r: any) => ({
            project_id: r.project_id || null,
            worker_id: r.worker_id,
            date: r.date,
            status: (r.status === 'overtime' || r.status === 'present') ? 'present' : (r.status === 'half_day' ? 'half_day' : 'absent'),
            present: r.present !== undefined ? r.present : (r.status !== 'absent'),
            overtime_hours: Number(r.overtime_hours) || 0,
            notes: r.notes || null,
          }))

          const { error: upsertErr } = await supabase
            .from('attendance')
            .upsert(rows, { onConflict: 'project_id,worker_id,date' })

          if (upsertErr) {
            if (
              upsertErr.message?.includes('overtime_hours') ||
              upsertErr.code === '42703' ||
              upsertErr.message?.includes('attendance_status_check')
            ) {
              const fallbackRows = rows.map(({ overtime_hours, ...rest }: any) => ({
                ...rest,
                status: rest.status === 'overtime' ? 'present' : rest.status,
              }))
              const { error: fbErr } = await supabase
                .from('attendance')
                .upsert(fallbackRows, { onConflict: 'project_id,worker_id,date' })
              if (fbErr) throw fbErr
            } else {
              throw upsertErr
            }
          }
        } else if (item.payload.worker_id) {
          const row = {
            project_id: item.payload.project_id || null,
            worker_id: item.payload.worker_id,
            date: item.payload.date,
            status: (item.payload.status === 'overtime' || item.payload.status === 'present') ? 'present' : (item.payload.status === 'half_day' ? 'half_day' : 'absent'),
            present: item.payload.present !== undefined ? item.payload.present : (item.payload.status !== 'absent'),
            overtime_hours: Number(item.payload.overtime_hours) || 0,
            notes: item.payload.notes || null,
          }
          const { error } = await supabase.from('attendance').upsert(row, { onConflict: 'project_id,worker_id,date' })
          if (error) throw error
        } else {
          // Legacy aggregated summary item
          console.warn('Aggregated attendance entry without worker_id skipped during sync:', item.payload)
        }
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
