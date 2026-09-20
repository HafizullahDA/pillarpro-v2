'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { parseBOQCSV } from '@/lib/calculations/boq'
import { CSVBOQRow } from '@/lib/types/boq'
import { formatINR } from '@/lib/format'

interface ImportBOQModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onImportSuccess: () => void
}

const SAMPLE_CSV = `Item No,Description,Unit,Quantity,Rate
1.1,"Earthwork excavation in foundation trenches in all kinds of soil",cum,500,220.50
1.2,"Supplying and filling sand in plinth",cum,150,850.00
2.1,"Plain Cement Concrete 1:4:8 with graded stone aggregate 40mm",cum,80,4200.00
2.2,"Reinforced Cement Concrete M25 for columns, beams and lintels",cum,120,8900.00
3.1,"Thermo-mechanically treated (TMT) Fe-500D steel reinforcement",kg,14500,74.00
4.1,"Brick work with common burnt clay F.P.S. bricks in cement mortar 1:6",cum,180,5400.00`

export function ImportBOQModal({
  open,
  onClose,
  projectId,
  onImportSuccess,
}: ImportBOQModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rawText, setRawText] = useState('')
  const [parsedData, setParsedData] = useState<CSVBOQRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload')

  if (!open) return null

  const handleProcessCSV = (content: string) => {
    setRawText(content)
    const { data, errors } = parseBOQCSV(content)
    setParsedData(data)
    setParseErrors(errors)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      handleProcessCSV(content || '')
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'PillarPro_BOQ_Import_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return

    setImporting(true)
    try {
      const recordsToInsert = parsedData.map((row) => ({
        project_id: projectId,
        item_number: row.item_number,
        description: row.description,
        unit: row.unit,
        tender_quantity: row.tender_quantity,
        awarded_rate: row.awarded_rate,
      }))

      const { error: insertError } = await supabase
        .from('boq_items')
        .insert(recordsToInsert)

      if (insertError) throw insertError

      toast.success(`Successfully imported ${parsedData.length} BOQ items.`)
      onImportSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to import BOQ items. Please verify data.')
    } finally {
      setImporting(false)
    }
  }

  const totalTenderSum = parsedData.reduce(
    (acc, row) => acc + (row.tender_quantity * row.awarded_rate),
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bulk Import Bill of Quantities (BOQ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload standard CPWD, PWD, or tender CSV schedule with rates and quantities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Action Tabs & Template Download */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Paste CSV Text
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample CSV
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-700">Click to select BOQ CSV file</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports CSV exported from Excel or Government Tender Portals</p>
            </div>
          ) : (
            <div>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => handleProcessCSV(e.target.value)}
                placeholder={SAMPLE_CSV}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          )}

          {/* Validation Errors */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-bold text-red-800 mb-1">Errors detected in CSV ({parseErrors.length}):</p>
              <ul className="text-[11px] text-red-700 space-y-0.5 max-h-24 overflow-y-auto list-disc pl-4">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-900">
                  Ready to Import: {parsedData.length} items
                </p>
                <span className="text-xs font-bold text-slate-900">
                  Total: {formatINR(totalTenderSum)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2">Item No</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2 text-right">Tender Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 font-mono font-bold text-slate-800 whitespace-nowrap">{row.item_number}</td>
                        <td className="p-2 text-slate-700 truncate max-w-xs">{row.description}</td>
                        <td className="p-2 text-slate-500 uppercase">{row.unit}</td>
                        <td className="p-2 text-right tabular-nums">{row.tender_quantity.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right tabular-nums">₹{row.awarded_rate.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right tabular-nums font-semibold text-slate-900">
                          {formatINR(row.tender_quantity * row.awarded_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={parsedData.length === 0 || importing}
            className="bg-slate-900 hover:bg-black text-white"
          >
            {importing ? 'Importing Items...' : `Confirm & Import ${parsedData.length} Items`}
          </Button>
        </div>
      </div>
    </div>
  )
}
