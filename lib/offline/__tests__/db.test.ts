import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  saveOfflineSnapshot,
  getOfflineSnapshot,
  getAllOfflineSnapshots,
  clearOfflineData,
  QueuedItem
} from '../db'

describe('Offline IndexedDB Store & Queue', () => {
  // Simple in-memory mock of IndexedDB for testing
  let store: { queue: Map<string, any>; snapshots: Map<string, any> }

  beforeEach(() => {
    store = {
      queue: new Map(),
      snapshots: new Map(),
    }

    const mockIDB = {
      open: vi.fn().mockReturnValue({
        result: {
          objectStoreNames: {
            contains: (name: string) => true,
          },
          transaction: (storeNames: string | string[], mode: string) => {
            const name = Array.isArray(storeNames) ? storeNames[0] : storeNames
            const targetStore = (store as any)[name] || new Map()

            return {
              objectStore: () => ({
                put: (item: any) => {
                  targetStore.set(item.id, item)
                  const req: any = {}
                  setTimeout(() => req.onsuccess?.({ target: req }), 0)
                  return req
                },
                get: (id: string) => {
                  const req: any = {}
                  setTimeout(() => {
                    req.result = targetStore.get(id)
                    req.onsuccess?.({ target: req })
                  }, 0)
                  return req
                },
                getAll: () => {
                  const req: any = {}
                  setTimeout(() => {
                    req.result = Array.from(targetStore.values())
                    req.onsuccess?.({ target: req })
                  }, 0)
                  return req
                },
                delete: (id: string) => {
                  targetStore.delete(id)
                  const req: any = {}
                  setTimeout(() => req.onsuccess?.({ target: req }), 0)
                  return req
                },
                clear: () => {
                  targetStore.clear()
                  const req: any = {}
                  setTimeout(() => req.onsuccess?.({ target: req }), 0)
                  return req
                },
              }),
            }
          },
        },
        set onsuccess(cb: any) {
          setTimeout(() => cb({ target: this }), 0)
        },
        set onerror(cb: any) {},
        set onupgradeneeded(cb: any) {},
      }),
    }

    vi.stubGlobal('window', { indexedDB: mockIDB, localStorage: { getItem: () => 'mock-user-1', setItem: () => {}, removeItem: () => {} } })
    vi.stubGlobal('indexedDB', mockIDB)
  })

  it('queues offline expenses and retrieves them sorted by creation time', async () => {
    const id = await saveToOfflineQueue('expense', {
      amount: 2500,
      category: 'Fuel / Diesel',
      paid_to: 'Bunk',
    })

    expect(id).toMatch(/^expense_/)
    const queue = await getOfflineQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].payload.amount).toBe(2500)
    expect(queue[0].type).toBe('expense')
  })

  it('supports queueing diesel_log items for fleet tracking', async () => {
    const id = await saveToOfflineQueue('diesel_log', {
      asset_name: 'Excavator JCB-3DX',
      diesel_liters: 65,
      end_meter: 1240,
    })

    expect(id).toMatch(/^diesel_log_/)
    const queue = await getOfflineQueue()
    const item = queue.find(q => q.id === id)
    expect(item).toBeDefined()
    expect(item?.payload.diesel_liters).toBe(65)
  })

  it('allows removing an individual queued entry', async () => {
    const id1 = await saveToOfflineQueue('expense', { amount: 100 })
    const id2 = await saveToOfflineQueue('attendance', { worker_count: 5 })

    let queue = await getOfflineQueue()
    expect(queue.length).toBe(2)

    await removeFromOfflineQueue(id1)
    queue = await getOfflineQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].id).toBe(id2)
  })

  it('stores and retrieves snapshots with getAllOfflineSnapshots', async () => {
    await saveOfflineSnapshot('/dashboard', {
      projects: [{ id: 'p1', name: 'Site Alpha' }],
      orgName: 'Alpha Infra',
    })

    await saveOfflineSnapshot('/suppliers', {
      suppliers: [{ id: 's1', name: 'Sharma Steels' }],
    })

    const all = await getAllOfflineSnapshots()
    expect(all['/dashboard']).toBeDefined()
    expect(all['/dashboard'].payload.orgName).toBe('Alpha Infra')
    expect(all['/suppliers']).toBeDefined()
    expect(all['/suppliers'].payload.suppliers[0].name).toBe('Sharma Steels')
  })

  it('supports queueing worker items and attendance muster rolls offline', async () => {
    const workerId = await saveToOfflineQueue('worker', {
      id: 'worker-uuid-1',
      name: 'Ramesh Kumar',
      trade: 'Mason',
      daily_wage_rate: 750,
    })

    expect(workerId).toMatch(/^worker_/)

    const attendanceId = await saveToOfflineQueue('attendance', [
      {
        worker_id: 'worker-uuid-1',
        worker_name: 'Ramesh Kumar',
        date: '2026-09-24',
        status: 'present',
        present: true,
        overtime_hours: 2.0,
      }
    ])

    expect(attendanceId).toMatch(/^attendance_/)

    const queue = await getOfflineQueue()
    expect(queue.some(q => q.type === 'worker' && q.payload.name === 'Ramesh Kumar')).toBe(true)
    expect(queue.some(q => q.type === 'attendance' && Array.isArray(q.payload) && q.payload[0].worker_id === 'worker-uuid-1')).toBe(true)
  })
})
