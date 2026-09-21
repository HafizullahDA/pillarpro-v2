'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { formatINR, formatDate } from '@/lib/format'
import {
  HindranceItem,
  HindranceCategory,
  HindranceDelayType,
  HINDRANCE_CATEGORY_LABELS,
  calculateHindranceMetrics,
  getNoticeUrgency,
  calculateDurationDays,
  generateClause5NoticeText,
} from '@/lib/calculations/hindrance'

interface Project {
  id: string
  name: string
  agency_name?: string | null
  advertised_cost?: number | null
  awarded_amount?: number | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
}

interface AllHindrancesClientProps {
  projects: Project[]
  userRole: string
  orgProfile: {
    name?: string
    legal_name?: string
    email?: string
    phone?: string
    registration_no?: string
    address?: string
  }
  initialHindrances: HindranceItem[]
  initialEOTApplications: any[]
}

export function AllHindrancesClient({
  projects,
  userRole,
  orgProfile,
  initialHindrances,
  initialEOTApplications,
}: AllHindrancesClientProps) {
  const supabase = createClient()
  const { success, error: toastError, info } = useToast()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [hindrances, setHindrances] = useState<HindranceItem[]>(initialHindrances)
  const [eotApps, setEotApps] = useState<any[]>(initialEOTApplications)
  const [activeTab, setActiveTab] = useState<'register' | 'eot'>('register')

  // Drawer / Modals
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [eotModalOpen, setEotModalOpen] = useState(false)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [selectedHindrance, setSelectedHindrance] = useState<HindranceItem | null>(null)
  const [form27ModalOpen, setForm27ModalOpen] = useState(false)
  const [selectedEOT, setSelectedEOT] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State for Log Hindrance
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || '')
  const [category, setCategory] = useState<HindranceCategory>('site_handover')
  const [description, setDescription] = useState('')
  const [locationChainage, setLocationChainage] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [delayType, setDelayType] = useState<HindranceDelayType>('compensable')
  const [overlappingDays, setOverlappingDays] = useState<number>(0)
  const [noticeServed, setNoticeServed] = useState(false)
  const [noticeDate, setNoticeDate] = useState('')
  const [noticeRefNo, setNoticeRefNo] = useState('')
  const [officerAcknowledgedBy, setOfficerAcknowledgedBy] = useState('')
  const [officerDesignation, setOfficerDesignation] = useState('')

  // Notice Letter Customization
  const [contractRefNo, setContractRefNo] = useState('Agreement / Work Order No.')
  const [customLetterRef, setCustomLetterRef] = useState('')

  // EOT Form State
  const [eotTargetProjectId, setEotTargetProjectId] = useState<string>(projects[0]?.id || '')
  const [eotAppNumber, setEotAppNumber] = useState('EOT/CLAIM/01')
  const [proposedDate, setProposedDate] = useState('')
  const [eotDaysSought, setEotDaysSought] = useState(30)
  const [eotJustification, setEotJustification] = useState('')

  // Filter hindrances & EOTs by selected project
  const filteredHindrances = selectedProjectId === 'all'
    ? hindrances
    : hindrances.filter(h => (h as any).project_id === selectedProjectId)

  const filteredEOTs = selectedProjectId === 'all'
    ? eotApps
    : eotApps.filter(e => e.project_id === selectedProjectId)

  // Calculate aggregated metrics
  const totalAwarded = selectedProjectId === 'all'
    ? projects.reduce((sum, p) => sum + (Number(p.awarded_amount) || 0), 0)
    : (projects.find(p => p.id === selectedProjectId)?.awarded_amount || 0)

  const metrics = calculateHindranceMetrics(filteredHindrances, totalAwarded)

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Project'
  }

  const handleSaveHindrance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetProjectId || !description.trim() || !startDate) {
      toastError('Please select a project, enter description and start date.')
      return
    }

    setSubmitting(true)
    try {
      const grossDays = calculateDurationDays(startDate, endDate)
      const netDays = Math.max(0, grossDays - (Number(overlappingDays) || 0))
      const projHindrances = hindrances.filter(h => (h as any).project_id === targetProjectId)
      const nextNum = projHindrances.length > 0 ? Math.max(...projHindrances.map(h => h.hindrance_number)) + 1 : 1

      const { data, error } = await supabase
        .from('hindrances')
        .insert({
          project_id: targetProjectId,
          hindrance_number: nextNum,
          category,
          description: description.trim(),
          location_chainage: locationChainage.trim() || null,
          start_date: startDate,
          end_date: endDate || null,
          delay_type: delayType,
          overlapping_days: Number(overlappingDays) || 0,
          net_delay_days: netDays,
          notice_served: noticeServed,
          notice_date: noticeServed ? (noticeDate || new Date().toISOString().split('T')[0]) : null,
          notice_reference_no: noticeServed ? noticeRefNo.trim() : null,
          officer_acknowledged_by: officerAcknowledgedBy.trim() || null,
          officer_designation: officerDesignation.trim() || null,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      setHindrances(prev => [data as HindranceItem, ...prev])
      success('Site hindrance logged in official register.')
      setDrawerOpen(false)
      setDescription('')
      setLocationChainage('')
      setEndDate('')
    } catch (err: any) {
      toastError(err?.message || 'Failed to record hindrance.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateEOT = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eotTargetProjectId || !eotAppNumber.trim() || !proposedDate) {
      toastError('Please fill all required fields.')
      return
    }

    setSubmitting(true)
    try {
      const targetProj = projects.find(p => p.id === eotTargetProjectId)
      const projHindrances = hindrances.filter(h => (h as any).project_id === eotTargetProjectId)
      const projMetrics = calculateHindranceMetrics(projHindrances, targetProj?.awarded_amount || 0)

      const { data, error } = await supabase
        .from('eot_applications')
        .insert({
          project_id: eotTargetProjectId,
          application_number: eotAppNumber.trim(),
          stipulated_date_of_completion: targetProj?.end_date || new Date().toISOString().split('T')[0],
          proposed_extended_date: proposedDate,
          total_days_sought: Number(eotDaysSought) || 0,
          compensable_days: projMetrics.compensableDays,
          non_compensable_days: projMetrics.nonCompensableDays,
          justification: eotJustification.trim() || `Extension claimed on grounds of ${projHindrances.length} documented site hindrances.`,
          hindrance_ids: projHindrances.map(h => h.id),
          status: 'submitted',
        })
        .select()
        .single()

      if (error) throw error

      setEotApps(prev => [data, ...prev])
      success('Extension of Time application created.')
      setEotModalOpen(false)
    } catch (err: any) {
      toastError(err?.message || 'Failed to create EOT application.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenNoticeModal = (h: HindranceItem) => {
    setSelectedHindrance(h)
    setCustomLetterRef(`PP/EOT/NOTICE/${String(h.hindrance_number).padStart(2, '0')}`)
    setNoticeModalOpen(true)
  }

  const selectedProjForNotice = selectedHindrance
    ? projects.find(p => p.id === (selectedHindrance as any).project_id) || { name: 'Subject Project', agency_name: 'Public Works Department' }
    : { name: 'Subject Project', agency_name: 'Public Works Department' }

  const generatedNoticeText = selectedHindrance
    ? generateClause5NoticeText({
        project: selectedProjForNotice,
        hindrance: selectedHindrance,
        firmName: orgProfile.legal_name || orgProfile.name || 'Contracting Agency',
        contractRefNo: contractRefNo,
        refNo: customLetterRef || `PP/EOT/NOTICE/${selectedHindrance.hindrance_number}`,
      })
    : ''

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Delay Defense &amp; EOT Engine
            </h1>
            <Badge label="CPWD GCC Clause 5" variant="default" />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Form 27 Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Contemporaneous site hindrance register, 14-day statutory notice countdown, and 10% Liquidated Damages shield.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs font-semibold"
            onClick={() => setEotModalOpen(true)}
          >
            + New EOT Claim (Form 27)
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setDrawerOpen(true)}
          >
            + Log Site Hindrance
          </Button>
        </div>
      </div>

      {/* Project Selector & Direct Deep Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter by Project:</span>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProjectId !== 'all' && (
          <Link
            href={`/projects/${selectedProjectId}/hindrances`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            Open Dedicated Project Register &rarr;
          </Link>
        )}
      </div>

      {/* Statutory 14-Day Warning Alert Banner */}
      {metrics.urgentNoticesCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🚨</span>
            <div>
              <p className="font-bold text-rose-950">
                Statutory 14-Day Notice Action Required ({metrics.urgentNoticesCount} Hindrance{metrics.urgentNoticesCount === 1 ? '' : 's'})
              </p>
              <p className="text-rose-800/90 mt-0.5 leading-relaxed">
                Clause 5 of standard government contracts mandates written notice within 14 days of site impediment. Dispatch official notice letters now to preserve your right to Extension of Time and Price Escalation (Clause 10CA/10CC).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="text-xs py-1.5 px-3.5 h-auto shrink-0 bg-white border-rose-300 text-rose-900 hover:bg-rose-100"
            onClick={() => setActiveTab('register')}
          >
            Review Notices &rarr;
          </Button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Delay</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{metrics.totalNetDays}</span>
            <span className="text-xs font-semibold text-slate-500">Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-2">
            <span>Compensable: <b className="text-emerald-700">{metrics.compensableDays}d</b></span>
            <span>Weather: <b className="text-slate-700">{metrics.nonCompensableDays}d</b></span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">10% LD Penalty Shield</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              {formatINR(metrics.ldProtectedAmount)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Protected from liquidated damages deductions
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clause 5 Notices</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${metrics.urgentNoticesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {metrics.unservedNoticesCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">Unserved</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            {metrics.urgentNoticesCount > 0 ? (
              <span className="text-rose-600 font-bold">{metrics.urgentNoticesCount} notice(s) urgent/overdue</span>
            ) : (
              <span className="text-emerald-600 font-semibold">All notice clocks healthy</span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EOT Applications</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{filteredEOTs.length}</span>
            <span className="text-xs font-semibold text-slate-500">Claims</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Form 27 submissions for time extension
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('register')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'register'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Digital Hindrance Register</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {filteredHindrances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('eot')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'eot'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>EOT Claims &amp; Form 27</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {filteredEOTs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Digital Hindrance Register */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {filteredHindrances.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                📋
              </div>
              <h3 className="text-base font-bold text-slate-900">No Hindrances Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Log every site obstruction—from delayed land handover to utility shifts and drawing revisions. Creating contemporaneous records protects you from 10% Liquidated Damages.
              </p>
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setDrawerOpen(true)}
              >
                + Log First Site Hindrance
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Project &amp; #</th>
                      <th className="px-4 py-3">Hindrance Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Dates &amp; Net Delay</th>
                      <th className="px-4 py-3">Classification</th>
                      <th className="px-4 py-3">Clause 5 Notice</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHindrances.map(h => {
                      const urgency = getNoticeUrgency(h.start_date, h.notice_served, h.notice_date)
                      const isOngoing = !h.end_date
                      const projName = getProjectName((h as any).project_id)

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-slate-900">#{h.hindrance_number}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">{projName}</p>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="font-semibold text-slate-900 line-clamp-2">{h.description}</p>
                            {h.location_chainage && (
                              <p className="text-[11px] text-blue-600 font-mono mt-0.5 font-medium">
                                📍 {h.location_chainage}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              {HINDRANCE_CATEGORY_LABELS[h.category] || h.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-semibold text-slate-900">
                              {formatDate(h.start_date)} &rarr; {h.end_date ? formatDate(h.end_date) : <span className="text-blue-600 font-bold">Ongoing</span>}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              <b className="text-slate-900 font-bold">{h.net_delay_days}d Net Delay</b>
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            {h.delay_type === 'compensable' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                Compensable
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                Non-Compensable
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              urgency.status === 'served'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : urgency.status === 'overdue'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : urgency.status === 'due_soon'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {urgency.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => handleOpenNoticeModal(h)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Notice Letter
                            </button>
                            <Link
                              href={`/projects/${(h as any).project_id}/hindrances`}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition-colors"
                            >
                              Open &rarr;
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EOT Claims */}
      {activeTab === 'eot' && (
        <div className="space-y-4">
          {filteredEOTs.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
                ⏳
              </div>
              <h3 className="text-base font-bold text-slate-900">No EOT Applications Filed</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Submit an official Form 27 application to the Executive / Superintending Engineer before contract completion expires to shield your firm from penalty deductions.
              </p>
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setEotModalOpen(true)}
              >
                + Draft EOT Application (Form 27)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEOTs.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{app.application_number}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {getProjectName(app.project_id)} &bull; Submitted on {formatDate(app.submission_date)}
                      </p>
                    </div>
                    <Badge
                      label={app.status?.replace(/_/g, ' ') || 'submitted'}
                      variant={app.status === 'sanctioned_without_ld' ? 'success' : app.status === 'sanctioned_with_ld' ? 'danger' : 'neutral'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <p className="text-slate-500">Days Sought</p>
                      <p className="font-bold text-slate-900 text-sm tabular-nums">{app.total_days_sought} Days</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Proposed Completion</p>
                      <p className="font-semibold text-slate-900">{formatDate(app.proposed_extended_date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Compensable Days</p>
                      <p className="font-semibold text-emerald-700">{app.compensable_days || 0} Days</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Non-Compensable</p>
                      <p className="font-semibold text-slate-700">{app.non_compensable_days || 0} Days</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    &ldquo;{app.justification}&rdquo;
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Clause 5 Standard GCC
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs py-1 px-3 h-auto"
                      onClick={() => {
                        setSelectedEOT(app)
                        setForm27ModalOpen(true)
                      }}
                    >
                      View / Print Form 27 &rarr;
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DRAWER: Log Site Hindrance */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Site Hindrance"
      >
        <form onSubmit={handleSaveHindrance} className="space-y-4">
          <FieldWrapper label="Target Project" required>
            <select
              value={targetProjectId}
              onChange={e => setTargetProjectId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none font-medium"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Category of Hindrance" required>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as HindranceCategory)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            >
              {Object.entries(HINDRANCE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Description of Impediment" required>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Electric poles in road widening stretch, awaiting department utility shifting."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <FieldWrapper label="Location / Chainage (Km)">
            <input
              type="text"
              value={locationChainage}
              onChange={e => setLocationChainage(e.target.value)}
              placeholder="e.g. Km 4+200 to Km 4+600, Box Culvert No. 3"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Date of Occurrence" required>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Date of Removal">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="Leave blank if ongoing"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Classification" required>
              <select
                value={delayType}
                onChange={e => setDelayType(e.target.value as HindranceDelayType)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              >
                <option value="compensable">Compensable (Dept Delay)</option>
                <option value="non_compensable">Non-Compensable (Force Majeure)</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Overlapping Days">
              <input
                type="number"
                min="0"
                value={overlappingDays}
                onChange={e => setOverlappingDays(Number(e.target.value))}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noticeServed}
                onChange={e => setNoticeServed(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-900">
                Formal Clause 5 Written Notice Already Dispatched to Dept
              </span>
            </label>
          </div>

          {noticeServed && (
            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <FieldWrapper label="Dispatch Date">
                <input
                  type="date"
                  value={noticeDate}
                  onChange={e => setNoticeDate(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
                />
              </FieldWrapper>
              <FieldWrapper label="Reference No.">
                <input
                  type="text"
                  value={noticeRefNo}
                  onChange={e => setNoticeRefNo(e.target.value)}
                  placeholder="e.g. INF/EOT/2026/04"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
                />
              </FieldWrapper>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Recording…' : 'Record in Hindrance Register'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* MODAL: Draft EOT Application */}
      <Modal
        open={eotModalOpen}
        onClose={() => setEotModalOpen(false)}
        title="Draft Extension of Time (EOT) Application"
      >
        <form onSubmit={handleCreateEOT} className="space-y-4 text-left">
          <FieldWrapper label="Project" required>
            <select
              value={eotTargetProjectId}
              onChange={e => setEotTargetProjectId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs font-medium"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Application Reference Number" required>
            <input
              type="text"
              required
              value={eotAppNumber}
              onChange={e => setEotAppNumber(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Proposed Extended Date" required>
              <input
                type="date"
                required
                value={proposedDate}
                onChange={e => setProposedDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Extension Days Sought" required>
              <input
                type="number"
                min="1"
                required
                value={eotDaysSought}
                onChange={e => setEotDaysSought(Number(e.target.value))}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Contractual Justification">
            <textarea
              rows={3}
              value={eotJustification}
              onChange={e => setEotJustification(e.target.value)}
              placeholder="Grounds of claim under Clause 5..."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
            />
          </FieldWrapper>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Creating…' : 'Generate Form 27 Application'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Clause 5 Formal Legal Notice Generator */}
      <Modal
        open={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        title="Clause 5 Statutory Notice Letter"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-500">
            Official formal notice to the Executive Engineer reserving all contractual rights to Extension of Time and Price Escalation (Clause 10CA/10CC).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Work Order / Agreement Ref No.">
              <input
                type="text"
                value={contractRefNo}
                onChange={e => setContractRefNo(e.target.value)}
                placeholder="e.g. EE/R&B/BAR/2026/0411"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </FieldWrapper>
            <FieldWrapper label="Dispatch Letter Reference No.">
              <input
                type="text"
                value={customLetterRef}
                onChange={e => setCustomLetterRef(e.target.value)}
                placeholder="e.g. INF/EOT/NOTICE/01"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </FieldWrapper>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto select-all">
            {generatedNoticeText}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(generatedNoticeText)
                success('Notice letter copied to clipboard.')
              }}
            >
              📋 Copy Notice Text
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setNoticeModalOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.print()}
              >
                🖨️ Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: CPWD Form 27 Printable View */}
      <Modal
        open={form27ModalOpen}
        onClose={() => setForm27ModalOpen(false)}
        title="CPWD Form 27 — Application for Extension of Time"
      >
        <div className="space-y-4 text-left">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 font-sans">
            <div className="text-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                FORM 27 &bull; APPLICATION FOR EXTENSION OF TIME
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                (Under Clause 5 of General Conditions of Contract)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><b>Name of Work:</b> {selectedEOT ? getProjectName(selectedEOT.project_id) : 'Project'}</div>
              <div><b>Contractor:</b> {orgProfile.legal_name || orgProfile.name || 'Contractor'}</div>
              <div><b>Proposed Extended Date:</b> {selectedEOT ? formatDate(selectedEOT.proposed_extended_date) : '—'}</div>
              <div><b>Total Extension Sought:</b> {selectedEOT?.total_days_sought || 0} Days</div>
              <div><b>Compensable (Department) Days:</b> {selectedEOT?.compensable_days || 0} Days</div>
              <div><b>Non-Compensable Days:</b> {selectedEOT?.non_compensable_days || 0} Days</div>
            </div>

            <div className="pt-2">
              <p className="font-bold text-slate-800 text-[11px] mb-1">Grounds of Application:</p>
              <p className="text-slate-600 text-[11px] bg-white p-2.5 rounded border border-slate-200">
                {selectedEOT?.justification || 'Multiple concurrent site hindrances recorded contemporaneously.'}
              </p>
            </div>

            <div className="pt-6 grid grid-cols-2 text-center text-[10px] text-slate-600">
              <div>
                <p className="font-bold text-slate-900">For {orgProfile.legal_name || 'Contracting Firm'}</p>
                <div className="h-10"></div>
                <p className="border-t border-slate-300 pt-1 mx-6">Authorized Signatory</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Executive Engineer</p>
                <div className="h-10"></div>
                <p className="border-t border-slate-300 pt-1 mx-6">Divisional Officer / Sanction Authority</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setForm27ModalOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.print()}
            >
              🖨️ Print Form 27
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

