'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/format'
import { NewDPRDrawer } from '@/components/dpr/NewDPRDrawer'
import { canManageDPR } from '@/lib/permissions'

export interface DPRItem {
  id: string
  project_id: string
  report_date: string
  weather: string
  work_completed_notes: string
  impediments_delays: string | null
  total_manpower_count: number
  masons_count: number
  labourers_count: number
  machinery_active_count: number
  photos: { url: string; caption?: string; taken_at?: string }[]
  status: string
  created_at: string
}

interface DPRClientProps {
  project: {
    id: string
    name: string
    agency_name: string | null
  }
  reports: DPRItem[]
  userRole: string
}

const WEATHER_LABELS: Record<string, { label: string; icon: string }> = {
  sunny_clear:    { label: 'Sunny / Clear', icon: '☀️' },
  overcast_cloudy: { label: 'Cloudy', icon: '⛅' },
  rain_drizzle:   { label: 'Light Rain', icon: '🌦️' },
  heavy_rain_halt:{ label: 'Heavy Rain / Halted', icon: '🌧️' },
  extreme_heat:   { label: 'Extreme Heat', icon: '🌡️' },
  fog_cold:       { label: 'Fog / Cold', icon: '🌫️' },
}

export function DPRClient({ project, reports, userRole }: DPRClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const canManage = canManageDPR(userRole)

  const copyWhatsAppReport = (dpr: DPRItem) => {
    const weather = WEATHER_LABELS[dpr.weather]?.label || dpr.weather
    const text = `*🏗️ PillarPro Daily Progress Report (DPR)*
*Project:* ${project.name}
*Date:* ${formatDate(dpr.report_date)}
*Weather:* ${weather}

*👷 Manpower & Plant:*
• Masons (मिस्त्री): ${dpr.masons_count}
• Labourers (मजदूर): ${dpr.labourers_count}
• Total Workers: ${dpr.total_manpower_count}
• Active Machines: ${dpr.machinery_active_count}

*📝 Work Executed:*
${dpr.work_completed_notes}
${dpr.impediments_delays ? `\n*⚠️ Delays / Bottlenecks:*\n${dpr.impediments_delays}` : ''}
${dpr.photos.length > 0 ? `\n*📸 Site Photos Attached:* ${dpr.photos.length} photo(s)` : ''}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      alert('DPR copied to clipboard! Ready to paste on WhatsApp.')
      navigator.clipboard.writeText(text).catch(() => {})
    }
    const encoded = encodeURIComponent(text)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Daily Site Progress Reports (DPR)</h2>
            <Badge label={`${reports.length} Reports`} variant="info" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological field diary, weather impact logs, daily worker deployment, and photo records.
          </p>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Today&apos;s DPR
          </Button>
        )}
      </div>

      {/* Reports Timeline */}
      {reports.length === 0 ? (
        <EmptyState
          title="No Daily Progress Reports Yet"
          description="Log daily site accomplishments, weather conditions, worker counts, and photo diaries for client inspection."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                Create First DPR
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {reports.map(dpr => {
            const weatherInfo = WEATHER_LABELS[dpr.weather] || { label: dpr.weather, icon: '⛅' }

            return (
              <div
                key={dpr.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{weatherInfo.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {formatDate(dpr.report_date)}
                      </h3>
                      <p className="text-[11px] text-slate-500">{weatherInfo.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      label={dpr.status}
                      variant={dpr.status === 'verified' ? 'success' : 'neutral'}
                    />
                    <button
                      onClick={() => copyWhatsAppReport(dpr)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      title="Copy formatted summary to share on WhatsApp"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.983.538 1.83.824 2.791.824 3.182 0 5.768-2.587 5.768-5.769 0-3.182-2.586-5.768-5.768-5.768zm0 10.354c-.87 0-1.684-.249-2.383-.715l-.171-.112-1.77.464.472-1.725-.119-.189c-.482-.767-.736-1.517-.736-2.312 0-2.523 2.052-4.575 4.576-4.575 2.523 0 4.575 2.052 4.575 4.575 0 2.524-2.052 4.575-4.575 4.575z" />
                      </svg>
                      Share WhatsApp
                    </button>
                  </div>
                </div>

                {/* Manpower and Machine Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Manpower</span>
                    <span className="font-bold text-slate-800 text-sm">{dpr.total_manpower_count} workers</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Masons / Mistri</span>
                    <span className="font-semibold text-slate-700">{dpr.masons_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Labourers</span>
                    <span className="font-semibold text-slate-700">{dpr.labourers_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Machinery</span>
                    <span className="font-semibold text-blue-600">{dpr.machinery_active_count} units</span>
                  </div>
                </div>

                {/* Work Completed */}
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    Work Executed Today:
                  </span>
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    {dpr.work_completed_notes}
                  </p>
                </div>

                {/* Impediments / Delays */}
                {dpr.impediments_delays && (
                  <div className="text-xs space-y-1 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
                    <span className="font-semibold text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <span>⚠️</span> Delays / Site Obstacles:
                    </span>
                    <p className="text-amber-950 leading-relaxed">
                      {dpr.impediments_delays}
                    </p>
                  </div>
                )}

                {/* Photos Grid */}
                {dpr.photos && dpr.photos.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Site Photos ({dpr.photos.length}):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {dpr.photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setSelectedPhoto(photo.url)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer aspect-square bg-slate-100 hover:opacity-95 shadow-sm transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.caption || `Site photo ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {photo.caption && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 text-[10px] text-white truncate">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Expanded site photo"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* DPR Drawer */}
      <NewDPRDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  )
}

