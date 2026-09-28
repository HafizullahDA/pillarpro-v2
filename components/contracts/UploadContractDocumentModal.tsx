'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ContractDocument, ContractDocumentType, CONTRACT_DOC_TYPES } from '@/lib/types/contract'
import { createClient } from '@/lib/supabase/client'
import { uploadDocumentToStorage } from '@/lib/storage'

interface UploadContractDocumentModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  projectId: string
  onUploaded: (newDoc: ContractDocument) => void
}

export function UploadContractDocumentModal({
  open,
  onClose,
  contractId,
  projectId,
  onUploaded,
}: UploadContractDocumentModalProps) {
  const supabase = createClient()
  const [documentType, setDocumentType] = useState<ContractDocumentType>('Agreement')
  const [title, setTitle] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!title) {
        // Strip extension for initial default title
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setTitle(nameWithoutExt)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError('Please choose a file to upload (PDF, DWG, Image, Doc).')
      return
    }

    if (!title.trim()) {
      setError('Please provide a document title.')
      return
    }

    setUploading(true)
    try {
      // 1. Upload to Supabase Storage in 'contracts' folder
      const folderPath = `contracts/${projectId}`
      const fileUrl = await uploadDocumentToStorage(folderPath, selectedFile, selectedFile.name, 'documents')

      // 2. Insert record into public.contract_documents
      const { data, error: insertError } = await supabase
        .from('contract_documents')
        .insert({
          contract_id: contractId,
          project_id: projectId,
          document_type: documentType,
          title: title.trim(),
          document_number: documentNumber.trim() || null,
          issue_date: issueDate || null,
          file_url: fileUrl,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          file_type: selectedFile.type || 'application/octet-stream',
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      onUploaded(data as ContractDocument)
      // Reset form
      setSelectedFile(null)
      setTitle('')
      setDocumentNumber('')
      setIssueDate('')
      setNotes('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to upload contract document')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Contract Document or Drawing"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Category *
          </label>
          <select
            value={documentType}
            onChange={e => setDocumentType(e.target.value as ContractDocumentType)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {CONTRACT_DOC_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Signed Contract Agreement / GAD Bridge Drawing Sheet 1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document / Drawing Number
            </label>
            <input
              type="text"
              placeholder="e.g. DWG-BR-01 or EE/R&B/441"
              value={documentNumber}
              onChange={e => setDocumentNumber(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Issue / Letter Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select File (PDF, Image, DWG, Doc) *
          </label>
          <input
            type="file"
            required
            onChange={handleFileChange}
            className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-500 border border-slate-300 rounded-lg p-1.5"
          />
          {selectedFile && (
            <p className="text-[11px] text-slate-500 mt-1">
              Selected: <span className="font-semibold text-slate-700">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Scope Reference
          </label>
          <textarea
            rows={2}
            placeholder="Add relevant clauses, revisions, or drawing notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={uploading}>
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  )
}
