'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { getTodayIST } from '@/lib/date'
import { compressImage } from '@/lib/imageCompress'
import { uploadDocumentToStorage } from '@/lib/storage'
import { createDPRSchema, DPRPhoto } from '@/lib/validations/dpr'

const WEATHER_OPTIONS = [
  { value: 'sunny_clear',      label: '☀️ Sunny / Clear Weather' },
  { value: 'overcast_cloudy',   label: '⛅ Overcast / Cloudy' },
  { value: 'rain_drizzle',      label: '🌦️ Light Rain / Drizzle (Work Continued)' },
  { value: 'heavy_rain_halt',   label: '🌧️ Heavy Rain / Work Suspended' },
  { value: 'extreme_heat',      label: '🌡️ Extreme Heat' },
  { value: 'fog_cold',          label: '🌫️ Fog / Severe Cold' },
]

interface NewDPRDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  defaultDate?: string
}

export function NewDPRDrawer({
  open,
  onClose,
  projectId,
  projectName,
  defaultDate,
}: NewDPRDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const [form, setForm] = useState({
    report_date: defaultDate || getTodayIST(),
    weather: 'sunny_clear',
    work_completed_notes: '',
    impediments_delays: '',
    masons_count: '0',
    labourers_count: '0',
    machinery_active_count: '0',
  })

  const [photos, setPhotos] = useState<DPRPhoto[]>([])

  const totalManpower = (Number(form.masons_count) || 0) + (Number(form.labourers_count) || 0)

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (photos.length + files.length > 12) {
      setError('You can attach a maximum of 12 site photos per daily report.')
      return
    }

    setUploadingPhotos(true)
    setError('')

    try {
      const newPhotos: DPRPhoto[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        // Compress photo client-side
        const compressedBase64 = await compressImage(file, 1600, 0.82)

        // Convert base64 to Blob for storage upload
        const res = await fetch(compressedBase64)
        const blob = await res.blob()

        // Upload to documents bucket under dpr_photos/
        const publicUrl = await uploadDocumentToStorage('dpr_photos', blob, file.name)
        newPhotos.push({
          url: publicUrl,
          caption: '',
          taken_at: new Date().toISOString(),
        })
      }

      setPhotos(prev => [...prev, ...newPhotos])
      showToast(`Uploaded ${files.length} photo(s)`, 'success')
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.')
    } finally {
      setUploadingPhotos(false)
      // Reset input value
      e.target.value = ''
    }
  }

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateCaption = (idx: number, caption: string) => {
    setPhotos(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], caption }
      return updated
    })
  }

  const handleSave = async () => {
    setError('')

    const payload = {
      project_id: projectId,
      report_date: form.report_date,
      weather: form.weather as any,
      work_completed_notes: form.work_completed_notes.trim(),
      impediments_delays: form.impediments_delays.trim() || undefined,
      total_manpower_count: totalManpower,
      masons_count: Number(form.masons_count) || 0,
      labourers_count: Number(form.labourers_count) || 0,
      machinery_active_count: Number(form.machinery_active_count) || 0,
      photos,
      status: 'submitted' as const,
    }

    const parsed = createDPRSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the DPR fields.')
      return
    }

    setSaving(true)

    // Fetch caller's organization ID & User ID
    const { data: { user } } = await supabase.auth.getUser()
    const { data: orgProfile, error: orgErr } = await supabase.rpc('get_organization_profile')

    if (orgErr || !orgProfile || !(orgProfile as any).id) {
      setSaving(false)
      setError('Could not verify organization profile.')
      return
    }

    const orgId = (orgProfile as any).id

    // Upsert by project_id and report_date
    const { error: upsertErr } = await supabase
      .from('daily_progress_reports')
      .upsert(
        {
          organization_id: orgId,
          project_id: projectId,
          report_date: form.report_date,
          weather: form.weather as any,
          work_completed_notes: form.work_completed_notes.trim(),
          impediments_delays: form.impediments_delays.trim() || null,
          total_manpower_count: totalManpower,
          masons_count: Number(form.masons_count) || 0,
          labourers_count: Number(form.labourers_count) || 0,
          machinery_active_count: Number(form.machinery_active_count) || 0,
          photos: photos as any,
          status: 'submitted',
          submitted_by: user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,report_date' }
      )

    setSaving(false)

    if (upsertErr) {
      setError(upsertErr.message)
      return
    }

    showToast('Daily Progress Report (DPR) submitted successfully!', 'success')
    onClose()
    router.refresh()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Daily Progress Report (DPR)"
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-500">Civil Project:</span>
          <span className="font-bold text-slate-800">{projectName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Report Date *">
            <Input
              type="date"
              value={form.report_date}
              onChange={e => setField('report_date', e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Site Weather">
            <Select
              value={form.weather}
              onChange={e => setField('weather', e.target.value)}
            >
              {WEATHER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        {/* Manpower & Machinery Metrics */}
        <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Daily Manpower & Plant Log</span>
            <span className="text-blue-700 font-bold">Total Workers: {totalManpower}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <FieldWrapper label="Masons (मिस्त्री)">
              <Input
                type="number"
                min="0"
                value={form.masons_count}
                onChange={e => setField('masons_count', e.target.value)}
              />
            </FieldWrapper>

            <FieldWrapper label="Labour (मजदूर)">
              <Input
                type="number"
                min="0"
                value={form.labourers_count}
                onChange={e => setField('labourers_count', e.target.value)}
              />
            </FieldWrapper>

            <FieldWrapper label="Active Plant">
              <Input
                type="number"
                min="0"
                value={form.machinery_active_count}
                onChange={e => setField('machinery_active_count', e.target.value)}
                placeholder="e.g. 2 JCB"
              />
            </FieldWrapper>
          </div>
        </div>

        <FieldWrapper
          label="Work Executed Today *"
          hint="e.g. Chainage 12+400 WBM layer compaction completed. Pier P2 shuttering finished."
        >
          <Textarea
            value={form.work_completed_notes}
            onChange={e => setField('work_completed_notes', e.target.value)}
            rows={4}
            placeholder="Detail all construction tasks, concrete pours, excavation, or masonry completed today..."
          />
        </FieldWrapper>

        <FieldWrapper
          label="Impediments, Material Shortages or Delays"
          hint="Optional — record site bottlenecks for claim documentation"
        >
          <Textarea
            value={form.impediments_delays}
            onChange={e => setField('impediments_delays', e.target.value)}
            rows={2}
            placeholder="e.g. Electricity outage from 2pm to 5pm; waiting for 20mm aggregate delivery..."
          />
        </FieldWrapper>

        {/* Site Photos Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Site Photo Diary ({photos.length}/12)
            </label>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{uploadingPhotos ? 'Compressing...' : 'Add Photos'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                disabled={uploadingPhotos || photos.length >= 12}
                className="hidden"
              />
            </label>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white p-1.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Site photo ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <input
                    type="text"
                    value={photo.caption || ''}
                    onChange={e => handleUpdateCaption(idx, e.target.value)}
                    placeholder="Caption (e.g. Pier P2)"
                    className="w-full mt-1.5 text-[10px] px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 shadow transition-opacity"
                    title="Remove Photo"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving || uploadingPhotos}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploadingPhotos}>
            {saving ? 'Saving DPR...' : 'Submit DPR'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

