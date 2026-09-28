'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { formatChainage } from '@/lib/calculations/measurement'

interface SupportingMeasurementsModalProps {
  open: boolean
  onClose: () => void
  raBillId: string
  raBillNumber: string
  boqItemId: string
  itemNumber: string
  description: string
  unit: string
  rate: number
  billedQuantity: number
}

interface SupportingEntry {
  id: string
  entry_number: string
  page_number: number
  measurement_date: string
  location?: string | null
  chainage_km?: number | null
  chainage_m?: number | null
  description: string
  calculation_mode: string
  number_of_units: number
  length: number
  breadth: number
  depth_height: number
  calculated_quantity: number
  unit: string
  certified_by?: string | null
  certified_at?: string | null
  status: string
  measurement_books?: {
    book_number: string
    title: string
  } | null
}

export function SupportingMeasurementsModal({
  open,
  onClose,
  raBillId,
  raBillNumber,
  boqItemId,
  itemNumber,
  description,
  unit,
  rate,
  billedQuantity,
}: SupportingMeasurementsModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<SupportingEntry[]>([])

  useEffect(() => {
    if (!open || !raBillId || !boqItemId) return

    let isMounted = true
    setLoading(true)

    async function fetchSupportingMeasurements() {
      try {
        // Query measurement_entries linked directly or via ra_bill_measurement_entries
        const { data: linkData } = await supabase
          .from('ra_bill_measurement_entries')
          .select('measurement_entry_id')
          .eq('ra_bill_id', raBillId)
          .eq('boq_item_id', boqItemId)

        const linkedIds = (linkData || []).map((l: any) => l.measurement_entry_id)

        let query = supabase
          .from('measurement_entries')
          .select(`
            id,
            entry_number,
            page_number,
            measurement_date,
            location,
            chainage_km,
            chainage_m,
            description,
            calculation_mode,
            number_of_units,
            length,
            breadth,
            depth_height,
            calculated_quantity,
            unit,
            certified_by,
            certified_at,
            status,
            measurement_books:measurement_book_id(book_number, title)
          `)
          .eq('boq_item_id', boqItemId)

        if (linkedIds.length > 0) {
          query = query.in('id', linkedIds)
        } else {
          // Fallback to entries marked with billed_in_ra_bill_id or certified for this project
          query = query.or(`billed_in_ra_bill_id.eq.${raBillId},status.eq.CERTIFIED`)
        }

        const { data, error } = await query.order('measurement_date', { ascending: false })

        if (error) throw error
        if (isMounted) {
          setEntries((data as any) || [])
        }
      } catch (err) {
        console.error('Failed to load supporting measurements:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSupportingMeasurements()

    return () => {
      isMounted = false
    }
  }, [open, raBillId, boqItemId, supabase])

  const totalSupportingQty = entries.reduce(
    (sum, e) => sum + Number(e.calculated_quantity || 0),
    0
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Supporting Measurements Traceability — ${raBillNumber}`}
    >
      <div className="space-y-4 text-xs">
        {/* BOQ Header Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono font-bold text-slate-900 text-sm">
                Item {itemNumber}
              </span>
              <p className="font-medium text-slate-800 mt-0.5">{description}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Awarded Rate</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(rate)} / {unit}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Billed in This RA Bill:</span>
              <span className="font-mono font-bold text-blue-700">{billedQuantity} {unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Linked Supporting Measurements:</span>
              <span className="font-mono font-bold text-emerald-700">{Number(totalSupportingQty.toFixed(3))} {unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Certified Value:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(totalSupportingQty * rate)}</span>
            </div>
          </div>
        </div>

        {/* Traceability Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
            <span>Verified e-MB Records ({entries.length} Entries)</span>
            <span className="text-[10px] text-slate-500 font-normal">
              Statutory Chain: RA Bill &rarr; BOQ Item &rarr; Entry &rarr; Book &rarr; Certification
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading verified measurement records...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No individual measurement book records linked to this item.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">e-MB Book / Entry #</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Location / Chainage</th>
                    <th className="p-2.5 text-right">Dimensions</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5 text-center">Certified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/70">
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-slate-900 block">{e.entry_number}</span>
                        <span className="text-[10px] text-slate-500">
                          {e.measurement_books?.book_number || 'General MB'} (p.{e.page_number})
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{formatDate(e.measurement_date)}</td>
                      <td className="p-2.5">
                        <span className="font-medium text-slate-800 block">{e.location || '—'}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatChainage(e.chainage_km, e.chainage_m)}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-[11px] text-slate-600">
                        {e.calculation_mode === 'manual' ? (
                          'Direct'
                        ) : (
                          <span>
                            {e.number_of_units || 1} × {e.length || 0} × {e.breadth || 0} × {e.depth_height || 0}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {e.calculated_quantity} {e.unit}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 block">
                          {e.certified_by || 'EE Certified'}
                        </span>
                        {e.certified_at && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {formatDate(e.certified_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
