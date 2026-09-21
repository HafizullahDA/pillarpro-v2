'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { formatINR, formatDate } from '@/lib/format'
import { getClientOrganization, OrganizationProfile, DEFAULT_ORGANIZATION } from '@/lib/organization'
import { canAccessFeature, PlanTier } from '@/lib/subscription'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
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

interface HindranceClientProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    advertised_cost?: number | null
    awarded_amount?: number | null
    start_date?: string | null
    end_date?: string | null
    status?: string | null
  }
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

export function HindranceClient({
  project,
  userRole,
  orgProfile,
  initialHindrances,
  initialEOTApplications,
}: HindranceClientProps) {
  const supabase = createClient()
  const { success, error: toastError, info } = useToast()

  const [hindrances, setHindrances] = useState<HindranceItem[]>(initialHindrances)
  const [eotApps, setEotApps] = useState<any[]>(initialEOTApplications)
  const [activeTab, setActiveTab] = useState<'register' | 'eot' | 'notices'>('register')

  // Organization & Subscription State
  const [org, setOrg] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeConfig, setUpgradeConfig] = useState<{
    title: string
    description: string
    requiredPlan: PlanTier
  }>({
    title: 'Subscription Required',
    description: '',
    requiredPlan: 'growth',
  })

  useEffect(() => {
    getClientOrganization().then(setOrg)
  }, [])

  // Drawer & Modal States
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingHindrance, setEditingHindrance] = useState<HindranceItem | null>(null)
  const [eotModalOpen, setEotModalOpen] = useState(false)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [selectedHindrance, setSelectedHindrance] = useState<HindranceItem | null>(null)
  const [form27ModalOpen, setForm27ModalOpen] = useState(false)
  const [selectedEOT, setSelectedEOT] = useState<any | null>(null)

  // Submitting States
  const [submitting, setSubmitting] = useState(false)

  // Hindrance Form State
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

  // Notice Letter Customization State
  const [contractRefNo, setContractRefNo] = useState('Agreement / Work Order No.')
  const [customLetterRef, setCustomLetterRef] = useState('')

  // EOT Form State
  const [eotAppNumber, setEotAppNumber] = useState(`EOT/${project.name.slice(0, 8).trim().replace(/\s+/g, '-')}/01`)
  const [proposedDate, setProposedDate] = useState('')
  const [eotDaysSought, setEotDaysSought] = useState(30)
  const [eotJustification, setEotJustification] = useState('')

  // Calculate Metrics
  const metrics = calculateHindranceMetrics(hindrances, project.awarded_amount || 0)

  // Reset Hindrance Form
  const resetHindranceForm = () => {
    setEditingHindrance(null)
    setCategory('site_handover')
    setDescription('')
    setLocationChainage('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setDelayType('compensable')
    setOverlappingDays(0)
    setNoticeServed(false)
    setNoticeDate('')
    setNoticeRefNo('')
    setOfficerAcknowledgedBy('')
    setOfficerDesignation('')
  }

  const handleOpenDrawer = (h?: HindranceItem) => {
    const access = canAccessFeature('hasDelayDefense', org)
    if (!access.allowed) {
      setUpgradeConfig({
        title: access.reason?.includes('expired')
          ? 'Subscription Expired'
          : 'Growth Contractor Plan Required',
        description:
          access.reason ||
          'Delay Defense, statutory Clause 5 hindrances, and EOT claims are available on the Growth Contractor and Enterprise Infra plans.',
        requiredPlan: access.requiredPlan,
      })
      setUpgradeModalOpen(true)
      return
    }

    if (h) {
      setEditingHindrance(h)
      setCategory(h.category)
      setDescription(h.description)
      setLocationChainage(h.location_chainage || '')
      setStartDate(h.start_date)
      setEndDate(h.end_date || '')
      setDelayType(h.delay_type)
      setOverlappingDays(h.overlapping_days || 0)
      setNoticeServed(h.notice_served)
      setNoticeDate(h.notice_date || '')
      setNoticeRefNo(h.notice_reference_no || '')
      setOfficerAcknowledgedBy(h.officer_acknowledged_by || '')
      setOfficerDesignation(h.officer_designation || '')
    } else {
      resetHindranceForm()
    }
    setDrawerOpen(true)
  }

  const handleOpenEotModal = () => {
    const access = canAccessFeature('hasDelayDefense', org)
    if (!access.allowed) {
      setUpgradeConfig({
        title: access.reason?.includes('expired')
          ? 'Subscription Expired'
          : 'Growth Contractor Plan Required',
        description:
          access.reason ||
          'Extension of Time (EOT) claim applications and liquidated damages defense tools require an active Growth Contractor or Enterprise subscription.',
        requiredPlan: access.requiredPlan,
      })
      setUpgradeModalOpen(true)
      return
    }
    setEotModalOpen(true)
  }

  // Save Hindrance (Create or Update)
  const handleSaveHindrance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !startDate) {
      toastError('Please enter a description and start date.')
      return
    }

    setSubmitting(true)
    try {
      const grossDays = calculateDurationDays(startDate, endDate)
      const netDays = Math.max(0, grossDays - (Number(overlappingDays) || 0))

      if (editingHindrance) {
        // Update
        const { data, error } = await supabase
          .from('hindrances')
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingHindrance.id)
          .select()
          .single()

        if (error) throw error

        setHindrances(prev => prev.map(item => (item.id === editingHindrance.id ? (data as HindranceItem) : item)))
        success('Hindrance entry updated successfully.')
      } else {
        // Create new
        const nextNum = hindrances.length > 0 ? Math.max(...hindrances.map(h => h.hindrance_number)) + 1 : 1

        const { data, error } = await supabase
          .from('hindrances')
          .insert({
            project_id: project.id,
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

        setHindrances(prev => [...prev, data as HindranceItem])
        success('Site hindrance logged in official register.')
      }

      setDrawerOpen(false)
      resetHindranceForm()
    } catch (err: any) {
      toastError(err?.message || 'Failed to save hindrance entry.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Hindrance
  const handleDeleteHindrance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hindrance record? This will remove it from the EOT audit trail.')) {
      return
    }

    try {
      const { error } = await supabase.from('hindrances').delete().eq('id', id)
      if (error) throw error

      setHindrances(prev => prev.filter(h => h.id !== id))
      info('Hindrance record removed.')
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete hindrance.')
    }
  }

  // Mark Hindrance Resolved
  const handleResolveHindrance = async (h: HindranceItem) => {
    const resolvedDate = prompt('Enter hindrance removal / resolution date (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!resolvedDate) return

    try {
      const grossDays = calculateDurationDays(h.start_date, resolvedDate)
      const netDays = Math.max(0, grossDays - (Number(h.overlapping_days) || 0))

      const { data, error } = await supabase
        .from('hindrances')
        .update({
          end_date: resolvedDate,
          status: 'resolved',
          net_delay_days: netDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', h.id)
        .select()
        .single()

      if (error) throw error

      setHindrances(prev => prev.map(item => (item.id === h.id ? (data as HindranceItem) : item)))
      success(`Hindrance #${h.hindrance_number} marked resolved (${netDays} net delay days).`)
    } catch (err: any) {
      toastError(err?.message || 'Failed to resolve hindrance.')
    }
  }

  // Create EOT Application
  const handleCreateEOT = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eotAppNumber.trim() || !proposedDate) {
      toastError('Please enter application number and proposed extended date.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('eot_applications')
        .insert({
          project_id: project.id,
          application_number: eotAppNumber.trim(),
          stipulated_date_of_completion: project.end_date || new Date().toISOString().split('T')[0],
          proposed_extended_date: proposedDate,
          total_days_sought: Number(eotDaysSought) || 0,
          compensable_days: metrics.compensableDays,
          non_compensable_days: metrics.nonCompensableDays,
          justification: eotJustification.trim() || `Delay incurred due to ${hindrances.length} documented departmental and site hindrances recorded in official Hindrance Register.`,
          hindrance_ids: hindrances.map(h => h.id),
          status: 'submitted',
        })
        .select()
        .single()

      if (error) throw error

      setEotApps(prev => [data, ...prev])
      setEotModalOpen(false)
      success('Extension of Time (EOT) Application created.')
    } catch (err: any) {
      toastError(err?.message || 'Failed to create EOT Application.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Notice Letter Generator Modal
  const handleOpenNoticeModal = (h: HindranceItem) => {
    setSelectedHindrance(h)
    setCustomLetterRef(`PP/EOT/NOTICE/${String(h.hindrance_number).padStart(2, '0')}`)
    setNoticeModalOpen(true)
  }

  // Open Form 27 Modal
  const handleOpenForm27 = (app: any) => {
    setSelectedEOT(app)
    setForm27ModalOpen(true)
  }

  const generatedNoticeText = selectedHindrance
    ? generateClause5NoticeText({
        project,
        hindrance: selectedHindrance,
        firmName: orgProfile.legal_name || orgProfile.name || 'Contracting Agency',
        contractRefNo: contractRefNo,
        refNo: customLetterRef || `PP/EOT/NOTICE/${selectedHindrance.hindrance_number}`,
      })
    : ''

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Project Overview
        </Link>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Delay Defense &amp; EOT Engine
            </h1>
            <Badge label="CPWD GCC Clause 5" variant="default" />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Appendix 21 Standard
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {project.name} &bull; <span className="font-medium text-slate-700">{project.agency_name || 'Public Works Department'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs font-semibold"
            onClick={handleOpenEotModal}
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            + New EOT Claim (Form 27)
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => handleOpenDrawer()}
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Log Site Hindrance
          </Button>
        </div>
      </div>

      {/* Statutory 14-Day Warning Alert Banner (If Any Hindrance Needs Urgent Notice) */}
      {metrics.urgentNoticesCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🚨</span>
            <div>
              <p className="font-bold text-rose-950">
                Statutory 14-Day Notice Action Required ({metrics.urgentNoticesCount} Hindrance{metrics.urgentNoticesCount === 1 ? '' : 's'})
              </p>
              <p className="text-rose-800/90 mt-0.5 leading-relaxed">
                Under Clause 5 of CPWD / PWD GCC, formal written notice must be submitted to the Executive Engineer within 14 days of impediment. Dispatch notices immediately to prevent claims from becoming legally time-barred.
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
        {/* Net Delay Days */}
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

        {/* 10% Liquidated Damages Shield */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">10% LD Shield</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              {formatINR(metrics.ldProtectedAmount)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Max statutory penalty protected by audit log
          </p>
        </div>

        {/* 14-Day Notice Urgency */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clause 5 Notices</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${metrics.urgentNoticesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {metrics.unservedNoticesCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">Unserved</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {metrics.urgentNoticesCount > 0 ? (
              <span className="text-rose-600 font-bold">{metrics.urgentNoticesCount} notice(s) urgent/overdue</span>
            ) : (
              <span className="text-emerald-600 font-semibold">All notice timelines healthy</span>
            )}
          </p>
        </div>

        {/* EOT Applications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EOT Applications</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{eotApps.length}</span>
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
            {hindrances.length}
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
            {eotApps.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Digital Hindrance Register */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Official Site Hindrance Register</h2>
              <p className="text-xs text-slate-500">
                Maintained in conformity with CPWD Works Manual Appendix 21 &bull; Contemporaneous site obstruction record.
              </p>
            </div>
          </div>

          {hindrances.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                📋
              </div>
              <h3 className="text-base font-bold text-slate-900">No Hindrances Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Log every site obstruction immediately—from delayed land handover to utility pole shifts and drawing revisions. Creating contemporaneous records protects you from 10% Liquidated Damages.
              </p>
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleOpenDrawer()}
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
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Hindrance &amp; Chainage</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Dates &amp; Net Days</th>
                      <th className="px-4 py-3">Classification</th>
                      <th className="px-4 py-3">Clause 5 Notice</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hindrances.map(h => {
                      const urgency = getNoticeUrgency(h.start_date, h.notice_served, h.notice_date)
                      const grossDays = calculateDurationDays(h.start_date, h.end_date)
                      const isOngoing = !h.end_date

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 tabular-nums">
                            #{h.hindrance_number}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="font-semibold text-slate-900 line-clamp-2">{h.description}</p>
                            {h.location_chainage && (
                              <p className="text-[11px] text-blue-600 font-mono mt-0.5 font-medium">
                                📍 {h.location_chainage}
                              </p>
                            )}
                            {h.officer_acknowledged_by && (
                              <p className="text-[10px] text-slate-500 mt-1">
                                Signed: <span className="font-semibold text-slate-700">{h.officer_acknowledged_by}</span>
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
                              Gross: {grossDays}d &bull; Overlap: {h.overlapping_days}d &bull; <b className="text-slate-900 font-bold">{h.net_delay_days}d Net</b>
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
                            {h.notice_reference_no && (
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Ref: {h.notice_reference_no}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                            {/* Generate Notice Letter */}
                            <button
                              onClick={() => handleOpenNoticeModal(h)}
                              title="Generate Clause 5 Formal Legal Notice Letter"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Notice Letter
                            </button>

                            {/* Mark Resolved */}
                            {isOngoing && (
                              <button
                                onClick={() => handleResolveHindrance(h)}
                                title="Mark Hindrance Removed / Resolved"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenDrawer(h)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteHindrance(h.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
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

      {/* TAB 2: EOT Claims & Form 27 */}
      {activeTab === 'eot' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Extension of Time (EOT) Claims</h2>
              <p className="text-xs text-slate-500">
                Official CPWD Form 27 Applications for sanction of time extension without Liquidated Damages.
              </p>
            </div>
            <Button
              size="sm"
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleOpenEotModal}
            >
              + Create EOT Claim
            </Button>
          </div>

          {eotApps.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
                ⏳
              </div>
              <h3 className="text-base font-bold text-slate-900">No EOT Applications Filed</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                When project delays accumulate, submit an official Form 27 application to the Executive / Superintending Engineer before the contract completion date expires to shield your firm from penalty deductions.
              </p>
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleOpenEotModal}
              >
                + Draft EOT Application (Form 27)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eotApps.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{app.application_number}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Submitted on {formatDate(app.submission_date)}</p>
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
                      <p className="text-slate-500">Compensable (Dept)</p>
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
                      onClick={() => handleOpenForm27(app)}
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

      {/* DRAWER: Log / Edit Site Hindrance */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingHindrance ? `Edit Hindrance #${editingHindrance.hindrance_number}` : 'Log Site Hindrance'}
      >
        <form onSubmit={handleSaveHindrance} className="space-y-4">
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
              placeholder="e.g. High tension power lines obstructing culvert excavation, awaiting electricity department utility shifting."
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
            <FieldWrapper label="Date of Occurrence (Start)" required>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </FieldWrapper>

            <FieldWrapper label="Date of Removal (End)">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="Leave blank if ongoing"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Delay Classification" required>
              <select
                value={delayType}
                onChange={e => setDelayType(e.target.value as HindranceDelayType)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
              >
                <option value="compensable">Compensable (Dept Default)</option>
                <option value="non_compensable">Non-Compensable (Force Majeure)</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Overlapping Days">
              <input
                type="number"
                min="0"
                value={overlappingDays}
                onChange={e => setOverlappingDays(Number(e.target.value))}
                placeholder="0"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </FieldWrapper>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noticeServed}
                onChange={e => setNoticeServed(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-900">
                Formal Clause 5 Written Notice Already Dispatched to Dept
              </span>
            </label>
          </div>

          {noticeServed && (
            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <FieldWrapper label="Notice Dispatch Date">
                <input
                  type="date"
                  value={noticeDate}
                  onChange={e => setNoticeDate(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
                />
              </FieldWrapper>
              <FieldWrapper label="Dispatch Reference No.">
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

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Acknowledging Officer">
              <input
                type="text"
                value={officerAcknowledgedBy}
                onChange={e => setOfficerAcknowledgedBy(e.target.value)}
                placeholder="e.g. Er. M. A. Shah"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
            <FieldWrapper label="Designation">
              <input
                type="text"
                value={officerDesignation}
                onChange={e => setOfficerDesignation(e.target.value)}
                placeholder="e.g. AEE / JE"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

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
              {submitting ? 'Saving…' : editingHindrance ? 'Update Entry' : 'Record in Hindrance Register'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* MODAL: Create Extension of Time Application */}
      <Modal
        open={eotModalOpen}
        onClose={() => setEotModalOpen(false)}
        title="Draft Extension of Time (EOT) Application"
      >
        <form onSubmit={handleCreateEOT} className="space-y-4 text-left">
          <p className="text-xs text-slate-500">
            Generates a formal CPWD Form 27 application linking all {hindrances.length} documented hindrances to claim time extension without Liquidated Damages.
          </p>

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
            <FieldWrapper label="Stipulated End Date">
              <input
                type="text"
                disabled
                value={formatDate(project.end_date)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
            </FieldWrapper>

            <FieldWrapper label="Proposed Extended Date" required>
              <input
                type="date"
                required
                value={proposedDate}
                onChange={e => setProposedDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Total Extension Days Sought" required>
            <input
              type="number"
              min="1"
              required
              value={eotDaysSought}
              onChange={e => setEotDaysSought(Number(e.target.value))}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
            />
          </FieldWrapper>

          <FieldWrapper label="Contractual Justification">
            <textarea
              rows={3}
              value={eotJustification}
              onChange={e => setEotJustification(e.target.value)}
              placeholder="Describe main grounds (e.g. utility shifting, delayed drawings, severe monsoon flood)..."
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
              {submitting ? 'Creating…' : 'Generate EOT Application'}
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
              <div><b>Name of Work:</b> {project.name}</div>
              <div><b>Contractor:</b> {orgProfile.legal_name || orgProfile.name || 'Contractor'}</div>
              <div><b>Department:</b> {project.agency_name || 'Public Works Department'}</div>
              <div><b>Awarded Cost:</b> {formatINR(project.awarded_amount)}</div>
              <div><b>Stipulated Date of Completion:</b> {formatDate(project.end_date)}</div>
              <div><b>Proposed Extended Date:</b> {selectedEOT ? formatDate(selectedEOT.proposed_extended_date) : '—'}</div>
              <div><b>Total Extension Sought:</b> {selectedEOT?.total_days_sought || 0} Days</div>
              <div><b>Compensable (Department) Days:</b> {selectedEOT?.compensable_days || 0} Days</div>
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

      {/* Upgrade Modal for Feature Gating */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title={upgradeConfig.title}
        description={upgradeConfig.description}
        requiredPlan={upgradeConfig.requiredPlan}
        currentPlan={(org?.plan_tier as any) || 'bootstrap'}
      />
    </div>
  )
}
