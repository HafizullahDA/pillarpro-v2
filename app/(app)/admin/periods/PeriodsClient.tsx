'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'

type Project = { id: string; name: string }
type Period = {
  id: string
  project_id: string
  period_year: number
  period_month: number
  closed_at: string | null
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = [2025, 2026]

export function PeriodsClient({ projects, periods }: { projects: Project[]; periods: Period[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const periodMap = new Map(
    periods.map(p => [`${p.project_id}_${p.period_year}_${p.period_month}`, p])
  )

  const handleToggleClose = async (projectId: string, monthIndex: number) => {
    const key = `${projectId}_${selectedYear}_${monthIndex}`
    const existing = periodMap.get(key)
    const isClosed = Boolean(existing?.closed_at)

    setUpdatingId(key)

    if (existing) {
      // Toggle closed_at
      await supabase
        .from('ledger_periods')
        .update({ closed_at: isClosed ? null : new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      // Insert closed row
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('ledger_periods').insert({
        project_id: projectId,
        period_year: selectedYear,
        period_month: monthIndex,
        closed_at: new Date().toISOString(),
        closed_by: user?.id || null,
      })
    }

    setUpdatingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700">Select Accounting Year:</span>
        <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-medium">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-lg transition-colors ${selectedYear === y ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Projects & Months */}
      <div className="space-y-4">
        {projects.map(proj => (
          <div key={proj.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">{proj.name}</h3>
              <span className="text-xs text-slate-400 font-medium">{selectedYear} Audit Grid</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {MONTH_NAMES.map((mName, idx) => {
                const mIdx = idx + 1
                const key = `${proj.id}_${selectedYear}_${mIdx}`
                const periodRow = periodMap.get(key)
                const isClosed = Boolean(periodRow?.closed_at)
                const isLoading = updatingId === key

                return (
                  <div
                    key={mIdx}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-between gap-2 text-center transition-colors ${
                      isClosed ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{mName}</span>
                      <span className="text-[10px] opacity-75">{selectedYear}</span>
                    </div>

                    <Badge
                      label={isClosed ? 'Locked' : 'Open'}
                      variant={isClosed ? 'neutral' : 'success'}
                    />

                    <Button
                      size="sm"
                      variant={isClosed ? 'secondary' : 'primary'}
                      className="w-full text-[11px] py-1 h-7"
                      loading={isLoading}
                      onClick={() => handleToggleClose(proj.id, mIdx)}
                    >
                      {isClosed ? 'Unlock' : 'Close'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
