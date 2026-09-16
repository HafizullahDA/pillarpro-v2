'use client'

import { useEffect, useState } from 'react'
import { getOfflineSnapshot } from '@/lib/offline/db'
import { formatINR } from '@/lib/format'

type Snapshot = { payload: any; savedAt: number } | null

export function OfflineSnapshotViewer() {
  const [snapshot, setSnapshot] = useState<Snapshot>(null)
  const [loaded, setLoaded] = useState(false)
  const route = typeof window === 'undefined' ? '' : window.location.pathname

  useEffect(() => {
    void getOfflineSnapshot(route)
      .then(setSnapshot)
      .catch(() => setSnapshot(null))
      .finally(() => setLoaded(true))
  }, [route])

  if (!loaded || !snapshot) return null

  const savedAt = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(snapshot.savedAt)
  const data = snapshot.payload

  return (
    <section className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-left space-y-3">
      <div>
        <h2 className="text-sm font-bold text-blue-100">Previously viewed data</h2>
        <p className="mt-0.5 text-[11px] text-blue-200/75">Saved on this device: {savedAt}. Read-only until you reconnect.</p>
      </div>

      {route === '/dashboard' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SnapshotMetric label="Projects" value={data.projects?.length ?? 0} />
          <SnapshotMetric label="RA Bills" value={data.bills?.length ?? 0} />
          <SnapshotMetric label="Suppliers" value={data.suppliers?.filter((s: any) => s.project_id === null).length ?? 0} />
          <SnapshotMetric label="Ledger entries" value={data.ledger?.length ?? 0} />
        </div>
      )}

      {route === '/suppliers' && (
        <SnapshotList
          items={(data.suppliers ?? []).slice(0, 8)}
          empty="No supplier data was saved."
          render={(supplier: any) => (
            <div className="flex justify-between gap-3">
              <span className="truncate">{supplier.name}</span>
              <span className="shrink-0 text-amber-200">Due {formatINR(Number(supplier.outstanding_balance) || 0)}</span>
            </div>
          )}
        />
      )}

      {route === '/ra-bills' && (
        <SnapshotList
          items={(data.bills ?? []).slice(0, 8)}
          empty="No RA Bill data was saved."
          render={(bill: any) => (
            <div className="flex justify-between gap-3">
              <span className="truncate">{bill.bill_number} · {bill.projects?.name ?? 'Project'}</span>
              <span className="shrink-0 text-amber-200">{formatINR(Number(bill.outstanding_balance) || 0)}</span>
            </div>
          )}
        />
      )}
    </section>
  )
}

function SnapshotMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-950/30 px-3 py-2"><div className="text-lg font-bold text-white">{value}</div><div className="text-[10px] text-slate-400">{label}</div></div>
}

function SnapshotList({ items, empty, render }: { items: any[]; empty: string; render: (item: any) => React.ReactNode }) {
  if (!items.length) return <p className="text-xs text-slate-400">{empty}</p>
  return <div className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/70 bg-slate-950/30 px-3 text-xs text-slate-200">{items.map((item: any) => <div key={item.id} className="py-2">{render(item)}</div>)}</div>
}
