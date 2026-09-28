'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { MeasurementBook } from '@/lib/types/measurement'

interface NewMeasurementBookModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  contractId?: string | null
  onSuccess: (book: MeasurementBook) => void
}

export function NewMeasurementBookModal({
  open,
  onClose,
  projectId,
  contractId,
  onSuccess,
}: NewMeasurementBookModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [bookNumber, setBookNumber] = useState('')
  const [title, setTitle] = useState('')
  const [financialYear, setFinancialYear] = useState('2026-27')
  const [issuedToName, setIssuedToName] = useState('')
  const [issuedToDesignation, setIssuedToDesignation] = useState('Junior Engineer (JE)')
  const [division, setDivision] = useState('')
  const [subdivision, setSubdivision] = useState('')
  const [totalPages, setTotalPages] = useState('100')
  const [remarks, setRemarks] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookNumber.trim() || !title.trim()) {
      toast.showToast('Book Number and Title are required.', 'error')
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // get org id from project
      const { data: projectData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (!projectData?.organization_id) {
        throw new Error('Project organization not found')
      }

      const { data, error } = await supabase
        .from('measurement_books')
        .insert({
          organization_id: projectData.organization_id,
          project_id: projectId,
          contract_id: contractId || null,
          book_number: bookNumber.trim(),
          title: title.trim(),
          financial_year: financialYear.trim() || null,
          issued_to_name: issuedToName.trim() || null,
          issued_to_designation: issuedToDesignation.trim() || null,
          division: division.trim() || null,
          subdivision: subdivision.trim() || null,
          total_pages: parseInt(totalPages, 10) || 100,
          current_page: 1,
          status: 'ACTIVE',
          remarks: remarks.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.showToast(`Measurement Book ${bookNumber} registered successfully.`, 'success')
      onSuccess(data as MeasurementBook)
      onClose()
    } catch (err: any) {
      console.error('Failed to create measurement book:', err)
      toast.showToast(err.message || 'Failed to allot measurement book.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Allot New Measurement Book (e-MB Register)">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">
          <p className="font-semibold text-slate-800">CPWD / Public Works MB Registration Rules</p>
          <p className="mt-1 text-slate-500">
            Each physical or electronic volume must carry an immutable unique Book Number and be
            officially allotted to an authorized Field Engineer or Agency PM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Measurement Book Number *"
            placeholder="e.g. MB-04/PWD/2026"
            value={bookNumber}
            onChange={e => setBookNumber(e.target.value)}
            required
          />
          <Input
            label="Book Title / Description *"
            placeholder="e.g. Earthwork & Sub-base Book - Vol 1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Financial Year"
            placeholder="2026-27"
            value={financialYear}
            onChange={e => setFinancialYear(e.target.value)}
          />
          <Input
            label="Total Pages Allocated"
            type="number"
            value={totalPages}
            onChange={e => setTotalPages(e.target.value)}
          />
          <Input
            label="Allotted Engineer / In-Charge"
            placeholder="Name of JE / Field Eng"
            value={issuedToName}
            onChange={e => setIssuedToName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Designation"
            placeholder="Junior Engineer / AE / PM"
            value={issuedToDesignation}
            onChange={e => setIssuedToDesignation(e.target.value)}
          />
          <Input
            label="Division"
            placeholder="e.g. R&B Division Srinagar"
            value={division}
            onChange={e => setDivision(e.target.value)}
          />
          <Input
            label="Sub-Division"
            placeholder="e.g. Sub-Div 2"
            value={subdivision}
            onChange={e => setSubdivision(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Remarks &amp; Notes</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Optional notes or reference to physical issue register..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Allotting Book...' : 'Allot & Register e-MB'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
