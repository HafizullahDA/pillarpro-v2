'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Select } from '@/components/ui/FormField'

type Project = { id: string; name: string }
type Partner = { id: string; name: string }
type ProjectShare = {
  id?: string
  project_id: string
  partner_id: string
  share_percentage: number
}

interface ProjectSharesModalProps {
  open: boolean
  onClose: () => void
  projects: Project[]
  partners: Partner[]
  currentShares: ProjectShare[]
}

export function ProjectSharesModal({
  open,
  onClose,
  projects,
  partners,
  currentShares,
}: ProjectSharesModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? '')
  const [shares, setShares] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    const pId = projects[0]?.id
    partners.forEach(p => {
      const match = currentShares.find(s => s.project_id === pId && s.partner_id === p.id)
      init[p.id] = match ? match.share_percentage.toString() : '0'
    })
    return init
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    const nextShares: Record<string, string> = {}
    partners.forEach(p => {
      const match = currentShares.find(s => s.project_id === projectId && s.partner_id === p.id)
      nextShares[p.id] = match ? match.share_percentage.toString() : '0'
    })
    setShares(nextShares)
    setError('')
  }

  const handleShareChange = (partnerId: string, val: string) => {
    setShares(prev => ({ ...prev, [partnerId]: val }))
    setError('')
  }

  const handleSave = async () => {
    if (!selectedProjectId) {
      setError('Please select a project.')
      return
    }

    let total = 0
    for (const p of partners) {
      const num = parseFloat(shares[p.id] || '0')
      if (isNaN(num) || num < 0 || num > 100) {
        setError(`Invalid percentage for ${p.name}. Must be between 0% and 100%.`)
        return
      }
      total += num
    }

    if (Math.abs(total - 100) > 0.01 && total !== 0) {
      setError(`Total equity share must sum to exactly 100% (currently ${total.toFixed(1)}%).`)
      return
    }

    setSaving(true)
    setError('')

    try {
      // Upsert shares for each partner
      for (const p of partners) {
        const pct = parseFloat(shares[p.id] || '0')
        const { error: upsertErr } = await supabase
          .from('project_partners')
          .upsert(
            {
              project_id: selectedProjectId,
              partner_id: p.id,
              share_percentage: pct,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'project_id,partner_id' }
          )

        if (upsertErr) {
          throw new Error(`Failed to save share for ${p.name}: ${upsertErr.message}`)
        }
      }

      setSaving(false)
      onClose()
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'Failed to save project shares.')
    }
  }

  const totalPercentage = Object.values(shares).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Project Equity & Profit Shares"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>
            Save Equity Splits
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500">
          Define how profits and equity are split between partners for this specific project.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <FieldWrapper label="Select Project" required>
          <Select
            value={selectedProjectId}
            onChange={e => handleProjectChange(e.target.value)}
          >
            {projects.map(pr => (
              <option key={pr.id} value={pr.id}>
                {pr.name}
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Partner Share Distribution
            </span>
            <span
              className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                Math.abs(totalPercentage - 100) < 0.01
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Total: {totalPercentage.toFixed(1)}% / 100%
            </span>
          </div>

          <div className="space-y-3">
            {partners.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">Equity Share</p>
                </div>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={shares[p.id] ?? '0'}
                    onChange={e => handleShareChange(p.id, e.target.value)}
                    className="w-full text-right px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm font-bold text-slate-500">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
