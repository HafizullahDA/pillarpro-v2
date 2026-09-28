'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/format'
import { MeasurementCertificate, MeasurementEntry } from '@/lib/types/measurement'

interface NewMeasurementCertificateModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  contractId?: string | null
  measurementBookId?: string | null
  checkedEntries: MeasurementEntry[]
  onSuccess: (certificate: MeasurementCertificate) => void
}

export function NewMeasurementCertificateModal({
  open,
  onClose,
  projectId,
  contractId,
  measurementBookId,
  checkedEntries,
  onSuccess,
}: NewMeasurementCertificateModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const certifiableEntries = checkedEntries.filter(
    e => e.status === 'CHECKED' || e.status === 'SUBMITTED',
  )
  const totalValue = certifiableEntries.reduce((sum, e) => {
    const rate = Number(e.boq_items?.contract_rate ?? 0)
    return sum + Number(e.calculated_quantity) * rate
  }, 0)

  const [certNumber, setCertNumber] = useState(`MC-${Date.now().toString().slice(-6)}`)
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0])
  const [periodFrom, setPeriodFrom] = useState(new Date().toISOString().split('T')[0])
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split('T')[0])
  const [certifiedByName, setCertifiedByName] = useState('')
  const [certifiedByDesignation, setCertifiedByDesignation] = useState('Executive Engineer / Project Manager')
  const [declaration, setDeclaration] = useState(
    'Certified that the measurements recorded in this Measurement Book have been taken by me or under my personal supervision on site in accordance with CPWD/State PWD/contract specifications and standard method of measurement. The quantities recorded are correct and have not been previously billed or certified.',
  )

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certifiedByName.trim()) {
      toast.showToast('Certifying Officer name is required.', 'error')
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: projectData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (!projectData?.organization_id) throw new Error('Project not found')

      const { data: cert, error: certErr } = await supabase
        .from('measurement_certificates')
        .insert({
          organization_id: projectData.organization_id,
          project_id: projectId,
          contract_id: contractId || null,
          measurement_book_id: measurementBookId || null,
          certificate_number: certNumber.trim(),
          certificate_date: certDate,
          period_from: periodFrom,
          period_to: periodTo,
          total_items_measured: certifiableEntries.length,
          total_certified_value: totalValue,
          certified_by_name: certifiedByName.trim(),
          certified_by_designation: certifiedByDesignation.trim() || null,
          statutory_declaration: declaration.trim(),
          status: 'ISSUED',
        })
        .select()
        .single()

      if (certErr) throw certErr

      // Batch update the entries to CERTIFIED
      if (certifiableEntries.length > 0) {
        const ids = certifiableEntries.map(e => e.id)
        const { error: updateErr } = await supabase
          .from('measurement_entries')
          .update({
            status: 'CERTIFIED',
            certified_by: certifiedByName.trim(),
            certified_at: new Date().toISOString(),
          })
          .in('id', ids)

        if (updateErr) {
          console.warn('Warning updating entries status:', updateErr)
        }
      }

      toast.showToast(`Certificate ${certNumber} issued and ${certifiableEntries.length} entries certified.`, 'success')
      onSuccess(cert as MeasurementCertificate)
      onClose()
    } catch (err: any) {
      console.error('Failed to issue measurement certificate:', err)
      toast.showToast(err.message || 'Failed to issue certificate.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Issue Official Measurement Certificate (e-MB)">
      <form onSubmit={handleIssue} className="space-y-4 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900">
          <div className="flex items-center justify-between">
            <span className="font-bold">Total Items to Certify:</span>
            <span className="font-mono font-bold text-sm">{certifiableEntries.length} Items</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold">Total Measurement Value:</span>
            <span className="font-mono font-bold text-sm text-emerald-700">{formatINR(totalValue)}</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 mt-2">
            Certifying locks these measurement records against direct modification. Any future corrections must be logged via official Adjustment/Reversal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Certificate Number *"
            value={certNumber}
            onChange={e => setCertNumber(e.target.value)}
            required
          />
          <Input
            label="Period From"
            type="date"
            value={periodFrom}
            onChange={e => setPeriodFrom(e.target.value)}
            required
          />
          <Input
            label="Period To"
            type="date"
            value={periodTo}
            onChange={e => setPeriodTo(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Certifying Authority / Engineer Name *"
            placeholder="e.g. Er. Rajesh Gupta"
            value={certifiedByName}
            onChange={e => setCertifiedByName(e.target.value)}
            required
          />
          <Input
            label="Designation / Authority"
            placeholder="e.g. Executive Engineer / Resident Eng"
            value={certifiedByDesignation}
            onChange={e => setCertifiedByDesignation(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Statutory Compliance Declaration Clause *
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            value={declaration}
            onChange={e => setDeclaration(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Issuing Certificate...' : 'Sign & Issue Measurement Certificate'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
