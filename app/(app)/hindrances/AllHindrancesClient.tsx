'use client'

import { useState, useMemo } from 'react'
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
  HindranceCategory,
  HindranceDelayType,
  HINDRANCE_CATEGORY_LABELS,
  calculateHindranceMetrics,
  getNoticeUrgency,
  calculateDurationDays,
  generateClause5NoticeText,
} from '@/lib/calculations/hindrance'
import {
  ContractEvent,
  DetailedHindrance,
  ContractDefenseStatus,
  ContractEventCategory,
  EVENT_CATEGORY_CONFIG,
  TimelineNode,
} from '@/lib/types/contractDefense'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { EvidenceRecord } from '@/lib/types/evidence'
import {
  buildContractTimeline,
  calculateDefenseMetrics,
  calculateEventDelayDays,
} from '@/lib/calculations/contractDefense'
import { calculateEvidenceCompleteness } from '@/lib/calculations/evidenceCompleteness'
import { NewContractEventModal } from '@/components/contract-defense/NewContractEventModal'
import { ContractTimelineView } from '@/components/contract-defense/ContractTimelineView'
import { EvidenceVaultView } from '@/components/evidence/EvidenceVaultView'
import { EvidenceCompletenessBadge } from '@/components/evidence/EvidenceCompletenessBadge'
import { UploadEvidenceModal } from '@/components/evidence/UploadEvidenceModal'
import { CorrespondenceRecord, ContractNoticeRule } from '@/lib/types/correspondence'
import { CorrespondenceVaultView } from '@/components/correspondence/CorrespondenceVaultView'
import { EOTCase } from '@/lib/types/eot'
import { EOTMasterView } from '@/components/eot/EOTMasterView'
import { ContractVariation } from '@/lib/types/variations'
import { VariationsMasterView } from '@/components/variations/VariationsMasterView'

interface Project {
  id: string
  name: string
  agency_name?: string | null
  advertised_cost?: number | null
  awarded_amount?: number | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  organization_id?: string | null
}

interface AllHindrancesClientProps {
  projects: Project[]
  contracts: ContractRecord[]
  boqItems: BOQItem[]
  initialContractEvents: ContractEvent[]
  initialHindrances: DetailedHindrance[]
  initialEOTApplications: any[]
  initialEvidence: EvidenceRecord[]
  initialCorrespondence?: CorrespondenceRecord[]
  noticeRules?: ContractNoticeRule[]
  initialEOTCases?: EOTCase[]
  initialVariations?: ContractVariation[]
  userRole: string
  orgProfile: {
    name?: string
    legal_name?: string
    email?: string
    phone?: string
    registration_no?: string
    address?: string
  }
}

type DefenseTab =
  | 'events'
  | 'hindrances'
  | 'timeline'
  | 'eot'
  | 'evidence'
  | 'correspondence'
  | 'notices'
  | 'variations'
  | 'claims'

export function AllHindrancesClient({
  projects,
  contracts,
  boqItems,
  initialContractEvents,
  initialHindrances,
  initialEOTApplications,
  initialEvidence,
  initialCorrespondence,
  noticeRules,
  initialEOTCases = [],
  initialVariations = [],
  userRole,
  orgProfile,
}: AllHindrancesClientProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>(initialContractEvents)
  const [hindrances, setHindrances] = useState<DetailedHindrance[]>(initialHindrances)
  const [eotApps, setEotApps] = useState<any[]>(initialEOTApplications)
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(initialEvidence)
  const [correspondenceList, setCorrespondenceList] = useState<CorrespondenceRecord[]>(initialCorrespondence || [])
  const [eotCasesList, setEotCasesList] = useState<EOTCase[]>(initialEOTCases || [])
  const [variationsList, setVariationsList] = useState<ContractVariation[]>(initialVariations || [])
  const [activeTab, setActiveTab] = useState<DefenseTab>('events')

  // Modals & Drawers
  const [newEventModalOpen, setNewEventModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [eotModalOpen, setEotModalOpen] = useState(false)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [selectedHindranceForNotice, setSelectedHindranceForNotice] = useState<DetailedHindrance | null>(null)
  const [form27ModalOpen, setForm27ModalOpen] = useState(false)
  const [selectedEOT, setSelectedEOT] = useState<any | null>(null)
  const [selectedEventDetail, setSelectedEventDetail] = useState<ContractEvent | null>(null)
  const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false)
  const [hindranceToUpdate, setHindranceToUpdate] = useState<DetailedHindrance | null>(null)
  const [newHindranceStatus, setNewHindranceStatus] = useState<ContractDefenseStatus>('OPEN')
  const [hindranceRemovalDate, setHindranceRemovalDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Quick Attach Evidence Modal
  const [quickUploadOpen, setQuickUploadOpen] = useState(false)
  const [quickTargetEventId, setQuickTargetEventId] = useState<string>('')

  // Filters for Events Tab
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('all')
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all')

  // Filters for Hindrance Tab
  const [hindranceStatusFilter, setHindranceStatusFilter] = useState<string>('all')

  // Form State for Log Hindrance (Appendix 21)
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || '')
  const [targetContractId, setTargetContractId] = useState<string>('')
  const [category, setCategory] = useState<HindranceCategory>('site_handover')
  const [description, setDescription] = useState('')
  const [locationChainage, setLocationChainage] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [delayType, setDelayType] = useState<HindranceDelayType>('compensable')
  const [overlappingDays, setOverlappingDays] = useState<number>(0)
  const [affectedWork, setAffectedWork] = useState('')
  const [selectedBoqIds, setSelectedBoqIds] = useState<string[]>([])
  const [labourImpact, setLabourImpact] = useState('')
  const [machineryImpact, setMachineryImpact] = useState('')
  const [deptComm, setDeptComm] = useState('')
  const [contractorComm, setContractorComm] = useState('')
  const [standardStatus, setStandardStatus] = useState<ContractDefenseStatus>('OPEN')
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

  // Filtered datasets by project
  const filteredEvents = useMemo(() => {
    return selectedProjectId === 'all'
      ? contractEvents
      : contractEvents.filter(e => e.project_id === selectedProjectId)
  }, [contractEvents, selectedProjectId])

  const filteredHindrances = useMemo(() => {
    return selectedProjectId === 'all'
      ? hindrances
      : hindrances.filter(h => h.project_id === selectedProjectId)
  }, [hindrances, selectedProjectId])

  const filteredEOTs = useMemo(() => {
    return selectedProjectId === 'all'
      ? eotApps
      : eotApps.filter(e => e.project_id === selectedProjectId)
  }, [eotApps, selectedProjectId])

  const filteredEvidence = useMemo(() => {
    return selectedProjectId === 'all'
      ? evidenceList
      : evidenceList.filter(ev => ev.project_id === selectedProjectId)
  }, [evidenceList, selectedProjectId])

  const filteredCorrespondence = useMemo(() => {
    return selectedProjectId === 'all'
      ? correspondenceList
      : correspondenceList.filter(c => c.project_id === selectedProjectId)
  }, [correspondenceList, selectedProjectId])

  const noticesCount = useMemo(() => {
    return filteredCorrespondence.filter(c => c.category === 'NOTICE').length
  }, [filteredCorrespondence])

  const filteredEOTCases = useMemo(() => {
    if (selectedProjectId === 'all') return eotCasesList
    return eotCasesList.filter(c => c.project_id === selectedProjectId)
  }, [eotCasesList, selectedProjectId])

  const filteredVariations = useMemo(() => {
    if (selectedProjectId === 'all') return variationsList
    return variationsList.filter(v => v.project_id === selectedProjectId)
  }, [variationsList, selectedProjectId])

  const availableContracts = useMemo(() => {
    return targetProjectId
      ? contracts.filter(c => c.project_id === targetProjectId)
      : contracts
  }, [contracts, targetProjectId])

  const availableBoqItems = useMemo(() => {
    return targetProjectId
      ? boqItems.filter(b => b.project_id === targetProjectId)
      : boqItems
  }, [boqItems, targetProjectId])

  // Chronological Timeline calculation
  const timelineNodes: TimelineNode[] = useMemo(() => {
    return buildContractTimeline(filteredEvents, filteredHindrances)
  }, [filteredEvents, filteredHindrances])

  // Aggregated Defense Metrics
  const defenseMetrics = useMemo(() => {
    return calculateDefenseMetrics(filteredEvents, filteredHindrances)
  }, [filteredEvents, filteredHindrances])

  const totalAwarded = useMemo(() => {
    return selectedProjectId === 'all'
      ? projects.reduce((sum, p) => sum + (Number(p.awarded_amount) || 0), 0)
      : (projects.find(p => p.id === selectedProjectId)?.awarded_amount || 0)
  }, [projects, selectedProjectId])

  const legacyHindranceMetrics = useMemo(() => {
    return calculateHindranceMetrics(filteredHindrances as any, totalAwarded)
  }, [filteredHindrances, totalAwarded])

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Project'
  }

  const getContractAgreement = (contractId?: string | null) => {
    if (!contractId) return null
    return contracts.find(c => c.id === contractId)?.agreement_number || null
  }

  // Handle Event Creation Success
  const handleEventCreated = (newEvent: ContractEvent) => {
    setContractEvents(prev => [newEvent, ...prev])
    setNewEventModalOpen(false)
  }

  // Handle Save Hindrance (Enhanced Appendix 21)
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
      const projHindrances = hindrances.filter(h => h.project_id === targetProjectId)
      const targetProj = projects.find(p => p.id === targetProjectId)
      const nextNum = projHindrances.length > 0 ? Math.max(...projHindrances.map(h => h.hindrance_number)) + 1 : 1
      const hindCode = `HR-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`

      const payload: any = {
        organization_id: targetProj?.organization_id || undefined,
        project_id: targetProjectId,
        contract_id: targetContractId || null,
        hindrance_number: nextNum,
        hindrance_code: hindCode,
        category,
        description: description.trim(),
        location_chainage: locationChainage.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        removal_date: endDate || null,
        delay_type: delayType,
        overlapping_days: Number(overlappingDays) || 0,
        net_delay_days: netDays,
        duration_days: netDays,
        affected_work: affectedWork.trim() || null,
        affected_boq_items: selectedBoqIds,
        labour_impact: labourImpact.trim() || null,
        machinery_impact: machineryImpact.trim() || null,
        department_communication: deptComm.trim() || null,
        contractor_communication: contractorComm.trim() || null,
        standard_status: standardStatus,
        status: standardStatus === 'RESOLVED' || standardStatus === 'CLOSED' ? 'resolved' : 'active',
        notice_served: noticeServed,
        notice_date: noticeServed ? (noticeDate || new Date().toISOString().split('T')[0]) : null,
        notice_reference_no: noticeServed ? noticeRefNo.trim() : null,
        officer_acknowledged_by: officerAcknowledgedBy.trim() || null,
        officer_designation: officerDesignation.trim() || null,
      }

      const { data, error } = await supabase
        .from('hindrances')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setHindrances(prev => [data as DetailedHindrance, ...prev])
      success('Site hindrance recorded in official Appendix 21 Register.')
      setDrawerOpen(false)
      setDescription('')
      setLocationChainage('')
      setEndDate('')
      setAffectedWork('')
      setSelectedBoqIds([])
      setLabourImpact('')
      setMachineryImpact('')
      setDeptComm('')
      setContractorComm('')
    } catch (err: any) {
      toastError(err?.message || 'Failed to record hindrance.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Quick Status Update for Hindrance
  const handleUpdateHindranceStatus = async () => {
    if (!hindranceToUpdate) return
    setSubmitting(true)
    try {
      const isClosed = newHindranceStatus === 'RESOLVED' || newHindranceStatus === 'CLOSED'
      const remDate = hindranceRemovalDate || (isClosed ? new Date().toISOString().split('T')[0] : null)
      const grossDays = calculateDurationDays(hindranceToUpdate.start_date, remDate)
      const netDays = Math.max(0, grossDays - (Number(hindranceToUpdate.overlapping_days) || 0))

      const { error } = await supabase
        .from('hindrances')
        .update({
          standard_status: newHindranceStatus,
          status: isClosed ? 'resolved' : 'active',
          end_date: remDate,
          removal_date: remDate,
          net_delay_days: netDays,
          duration_days: netDays,
        })
        .eq('id', hindranceToUpdate.id)

      if (error) throw error

      setHindrances(prev =>
        prev.map(h =>
          h.id === hindranceToUpdate.id
            ? {
                ...h,
                standard_status: newHindranceStatus,
                status: isClosed ? 'resolved' : 'active',
                end_date: remDate,
                removal_date: remDate,
                net_delay_days: netDays,
                duration_days: netDays,
              }
            : h
        )
      )

      success(`Hindrance #${hindranceToUpdate.hindrance_number} updated to ${newHindranceStatus}.`)
      setStatusUpdateModalOpen(false)
      setHindranceToUpdate(null)
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Create EOT
  const handleCreateEOT = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eotTargetProjectId || !eotAppNumber.trim() || !proposedDate) {
      toastError('Please fill all required fields.')
      return
    }

    setSubmitting(true)
    try {
      const targetProj = projects.find(p => p.id === eotTargetProjectId)
      const projHindrances = hindrances.filter(h => h.project_id === eotTargetProjectId)
      const projMetrics = calculateHindranceMetrics(projHindrances as any, targetProj?.awarded_amount || 0)

      const { data, error } = await supabase
        .from('eot_applications')
        .insert({
          organization_id: targetProj?.organization_id || undefined,
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

  const handleOpenNoticeModal = (h: DetailedHindrance) => {
    setSelectedHindranceForNotice(h)
    setCustomLetterRef(`PP/EOT/NOTICE/${String(h.hindrance_number).padStart(2, '0')}`)
    setNoticeModalOpen(true)
  }

  const selectedProjForNotice = selectedHindranceForNotice
    ? projects.find(p => p.id === selectedHindranceForNotice.project_id) || { name: 'Subject Project', agency_name: 'Public Works Department' }
    : { name: 'Subject Project', agency_name: 'Public Works Department' }

  const generatedNoticeText = selectedHindranceForNotice
    ? generateClause5NoticeText({
        project: selectedProjForNotice,
        hindrance: selectedHindranceForNotice as any,
        firmName: orgProfile.legal_name || orgProfile.name || 'Contracting Agency',
        contractRefNo: contractRefNo,
        refNo: customLetterRef || `PP/EOT/NOTICE/${selectedHindranceForNotice.hindrance_number}`,
      })
    : ''

  // Filtered Events view
  const visibleEvents = useMemo(() => {
    return filteredEvents.filter(ev => {
      if (eventCategoryFilter !== 'all' && ev.event_type !== eventCategoryFilter) return false
      if (eventStatusFilter !== 'all' && ev.status !== eventStatusFilter) return false
      return true
    })
  }, [filteredEvents, eventCategoryFilter, eventStatusFilter])

  // Filtered Hindrances view
  const visibleHindrances = useMemo(() => {
    return filteredHindrances.filter(h => {
      const std = h.standard_status || (h.status === 'active' ? 'OPEN' : 'RESOLVED')
      if (hindranceStatusFilter !== 'all' && std !== hindranceStatusFilter) return false
      return true
    })
  }, [filteredHindrances, hindranceStatusFilter])

  const getStatusBadgeVariant = (status?: string): 'default' | 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'OPEN':
        return 'danger'
      case 'UNDER_REVIEW':
      case 'UNDER REVIEW':
        return 'warning'
      case 'RESOLVED':
      case 'REMOVED':
        return 'success'
      case 'CLOSED':
        return 'neutral'
      case 'DISPUTED':
        return 'danger'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Contract Defense &amp; Evidence Vault
            </h1>
            <Badge label="CPWD GCC Clause 5" variant="default" />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              Works Manual Appx 21
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
              Evidence Vault Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Contemporaneous site records, 14-day statutory notices, evidence repository &amp; 10% LD shield.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs font-semibold"
            onClick={() => setEotModalOpen(true)}
          >
            + EOT Claim (Form 27)
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="text-xs font-semibold border-slate-300 text-slate-800 hover:bg-slate-100"
            onClick={() => setDrawerOpen(true)}
          >
            + Log Hindrance
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setNewEventModalOpen(true)}
          >
            + Log Contract Event
          </Button>
        </div>
      </div>

      {/* Project Selector */}
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
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-mono">
              Awarded: <b className="text-slate-900">{formatINR(totalAwarded)}</b>
            </span>
            <Link
              href={`/projects/${selectedProjectId}/hindrances`}
              className="font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              Open Dedicated Project Register &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Statutory 14-Day Notice Alert Banner */}
      {legacyHindranceMetrics.urgentNoticesCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-xs">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-rose-950">
                Statutory 14-Day Notice Action Required ({legacyHindranceMetrics.urgentNoticesCount} Hindrance{legacyHindranceMetrics.urgentNoticesCount === 1 ? '' : 's'})
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
            onClick={() => setActiveTab('hindrances')}
          >
            Review Notices &rarr;
          </Button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Events</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{defenseMetrics.totalEvents}</span>
            <span className="text-xs font-semibold text-rose-600">({defenseMetrics.openEvents} Open)</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            {defenseMetrics.totalEOTRelevantDays} EOT-relevant delay days
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hindrance Register</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{legacyHindranceMetrics.totalNetDays}</span>
            <span className="text-xs font-semibold text-slate-500">Net Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-2">
            <span>Compensable: <b className="text-emerald-700">{legacyHindranceMetrics.compensableDays}d</b></span>
            <span>Non-Comp: <b className="text-slate-700">{legacyHindranceMetrics.nonCompensableDays}d</b></span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence Vault</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 tabular-nums">{filteredEvidence.length}</span>
            <span className="text-xs font-semibold text-slate-500">Files Stored</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Preserving contemporaneously linked proof
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Exposure Shield</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              {formatINR(defenseMetrics.totalFinancialExposure || legacyHindranceMetrics.ldProtectedAmount)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Defending against 10% LD deductions
          </p>
        </div>
      </div>

      {/* 9 CONTRACT DEFENSE TABS */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-4 md:gap-6 text-sm font-semibold whitespace-nowrap min-w-max pb-px">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'events'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>1. Contract Events</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {filteredEvents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hindrances')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'hindrances'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Hindrance Register</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredHindrances.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>3. Contract Timeline</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
              {timelineNodes.length} Nodes
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
            <span>4. EOT &amp; Form 27</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredEOTCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>5. Evidence Vault</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
              {filteredEvidence.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('correspondence')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'correspondence'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>6. Correspondence</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {filteredCorrespondence.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'notices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>7. Notices</span>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
              {noticesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('variations')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'variations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>8. Variations &amp; Deviations</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredVariations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('claims')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'claims'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>9. Claims</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONTRACT EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Filter Events:</span>
              <select
                value={eventCategoryFilter}
                onChange={e => setEventCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">All 16 Categories</option>
                {Object.entries(EVENT_CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <select
                value={eventStatusFilter}
                onChange={e => setEventStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DISPUTED">DISPUTED</option>
              </select>
            </div>

            <Button
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setNewEventModalOpen(true)}
            >
              + Log Contract Event
            </Button>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">No Contract Events Logged</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Log contract events such as site handover delays, drawing revisions, departmental instructions, and utility shifting using factual, neutral language.
              </p>
              <Button
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setNewEventModalOpen(true)}
              >
                + Log First Contract Event
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Event # &amp; Category</th>
                      <th className="px-4 py-3">Project &amp; Contract</th>
                      <th className="px-4 py-3">Description &amp; Cause</th>
                      <th className="px-4 py-3">Dates &amp; Delay</th>
                      <th className="px-4 py-3">Evidence Completeness</th>
                      <th className="px-4 py-3">Financial Impact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleEvents.map(ev => {
                      const catConfig = EVENT_CATEGORY_CONFIG[ev.event_type as ContractEventCategory]
                      const label = catConfig?.label || ev.event_type
                      const delayDays = ev.actual_delay_days || ev.estimated_delay_days || calculateEventDelayDays(ev.start_date, ev.end_date)
                      const projName = ev.projects?.name || getProjectName(ev.project_id)
                      const agrNum = ev.contracts?.agreement_number || getContractAgreement(ev.contract_id)

                      // Calculate Evidence Completeness for this event
                      const linkedEv = evidenceList.filter(e => e.related_contract_event_id === ev.id)
                      const completeness = calculateEvidenceCompleteness(ev.event_type, linkedEv)

                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-slate-900 font-mono">{ev.event_number}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap max-w-[160px]">
                            <p className="font-semibold text-slate-900 truncate">{projName}</p>
                            {agrNum && (
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                                Agr: {agrNum}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="font-semibold text-slate-900 line-clamp-2">{ev.description}</p>
                            {ev.cause && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                                Cause: {ev.cause}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-[10px] text-blue-600 font-mono mt-0.5">
                                Loc: {ev.location}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-medium text-slate-900">
                              {formatDate(ev.start_date)} &rarr; {ev.end_date ? formatDate(ev.end_date) : <span className="text-amber-600 font-semibold">Ongoing</span>}
                            </p>
                            <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                              {delayDays}d delay
                            </p>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <EvidenceCompletenessBadge
                              completeness={completeness}
                              targetTitle={ev.event_number}
                              onAttachEvidence={() => {
                                setQuickTargetEventId(ev.id)
                                setQuickUploadOpen(true)
                              }}
                            />
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {ev.financial_impact > 0 ? (
                              <span className="font-bold text-slate-900 font-mono">
                                {formatINR(ev.financial_impact)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge
                              label={ev.status.replace(/_/g, ' ')}
                              variant={getStatusBadgeVariant(ev.status)}
                            />
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedEventDetail(ev)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              View Details &rarr;
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

      {/* TAB 2: HINDRANCE REGISTER */}
      {activeTab === 'hindrances' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Filter Hindrances:</span>
              <select
                value={hindranceStatusFilter}
                onChange={e => setHindranceStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">All Hindrance Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="UNDER REVIEW">UNDER REVIEW</option>
                <option value="REMOVED">REMOVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DISPUTED">DISPUTED</option>
              </select>
            </div>

            <Button
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setDrawerOpen(true)}
            >
              + Log Site Hindrance
            </Button>
          </div>

          {visibleHindrances.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">No Hindrances Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Log every site impediment—from delayed site possession to utility shifts and drawing approvals in accordance with CPWD Works Manual Appendix 21.
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
                      <th className="px-4 py-3"># &amp; Code</th>
                      <th className="px-4 py-3">Location &amp; Work</th>
                      <th className="px-4 py-3">Nature of Hindrance</th>
                      <th className="px-4 py-3">Dates &amp; Duration</th>
                      <th className="px-4 py-3">Labour / Plant Impact</th>
                      <th className="px-4 py-3">Notice Status</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleHindrances.map(h => {
                      const urgency = getNoticeUrgency(h.start_date, h.notice_served, h.notice_date)
                      const projName = getProjectName(h.project_id)
                      const stdStatus = h.standard_status || (h.status === 'resolved' ? 'RESOLVED' : 'OPEN')

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-slate-900">#{h.hindrance_number}</p>
                            <p className="text-[10px] font-mono text-slate-500">{h.hindrance_code || `HR-${h.hindrance_number}`}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[130px] mt-0.5">{projName}</p>
                          </td>
                          <td className="px-4 py-3.5 max-w-[160px]">
                            {h.location_chainage ? (
                              <p className="font-mono text-blue-600 font-semibold">{h.location_chainage}</p>
                            ) : (
                              <p className="text-slate-400 italic">Site general</p>
                            )}
                            {h.affected_work && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                Work: {h.affected_work}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="font-semibold text-slate-900 line-clamp-2">{h.description}</p>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {HINDRANCE_CATEGORY_LABELS[h.category as HindranceCategory] || h.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-semibold text-slate-900">
                              {formatDate(h.start_date)} &rarr; {h.end_date || h.removal_date ? formatDate(h.end_date || h.removal_date!) : <span className="text-blue-600 font-bold">Ongoing</span>}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              <b className="text-slate-900">{h.net_delay_days || h.duration_days || 0}d Net Delay</b>
                            </p>
                          </td>
                          <td className="px-4 py-3.5 max-w-[140px]">
                            {h.labour_impact && (
                              <p className="text-[11px] text-slate-700 truncate">Labour: {h.labour_impact}</p>
                            )}
                            {h.machinery_impact && (
                              <p className="text-[11px] text-slate-700 truncate">Plant: {h.machinery_impact}</p>
                            )}
                            {!h.labour_impact && !h.machinery_impact && (
                              <span className="text-[11px] text-slate-400">—</span>
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
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setHindranceToUpdate(h)
                                setNewHindranceStatus((h.standard_status as ContractDefenseStatus) || 'OPEN')
                                setHindranceRemovalDate(h.end_date || h.removal_date || '')
                                setStatusUpdateModalOpen(true)
                              }}
                              className="cursor-pointer"
                              title="Click to update status"
                            >
                              <Badge
                                label={stdStatus}
                                variant={getStatusBadgeVariant(stdStatus)}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => handleOpenNoticeModal(h)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Notice Letter
                            </button>
                            <Link
                              href={`/projects/${h.project_id}/hindrances`}
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

      {/* TAB 3: CONTRACT TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Project-Level Chronological Contract Timeline</h3>
            <p className="text-xs text-slate-500">
              Chronological sequence of site handovers, work orders, hindrances, instructions, notices, and variations to defend against liquidated damages and justify time extension.
            </p>
          </div>

          <ContractTimelineView
            timelineNodes={timelineNodes}
            onSelectNode={node => {
              if (node.type === 'event') {
                const ev = contractEvents.find(e => e.id === node.sourceId)
                if (ev) setSelectedEventDetail(ev)
              } else {
                const h = hindrances.find(item => item.id === node.sourceId)
                if (h) handleOpenNoticeModal(h)
              }
            }}
          />
        </div>
      )}

      {/* TAB 4: EOT CLAIMS & FORM 27 ENGINE */}
      {activeTab === 'eot' && (
        <EOTMasterView
          initialCases={eotCasesList}
          projects={projects}
          contracts={contracts}
          contractEvents={contractEvents}
          hindrances={hindrances}
          evidenceList={evidenceList}
          correspondenceList={correspondenceList}
          selectedProjectId={selectedProjectId}
        />
      )}

      {/* TAB 5: EVIDENCE VAULT */}
      {activeTab === 'evidence' && (
        <EvidenceVaultView
          initialEvidence={filteredEvidence}
          projects={projects}
          contracts={contracts}
          boqItems={boqItems}
          contractEvents={contractEvents}
          hindrances={hindrances}
          eotApplications={eotApps}
          selectedProjectId={selectedProjectId}
        />
      )}

      {/* TABS 6 & 7: CORRESPONDENCE VAULT & NOTICES ENGINE */}
      {activeTab === 'correspondence' && (
        <CorrespondenceVaultView
          initialRecords={correspondenceList}
          noticeRules={noticeRules || []}
          projects={projects}
          contracts={contracts}
          boqItems={boqItems}
          contractEvents={contractEvents}
          hindrances={hindrances}
          eotApplications={eotApps}
          selectedProjectId={selectedProjectId}
          initialTab="all"
        />
      )}

      {activeTab === 'notices' && (
        <CorrespondenceVaultView
          initialRecords={correspondenceList}
          noticeRules={noticeRules || []}
          projects={projects}
          contracts={contracts}
          boqItems={boqItems}
          contractEvents={contractEvents}
          hindrances={hindrances}
          eotApplications={eotApps}
          selectedProjectId={selectedProjectId}
          initialTab="notices"
        />
      )}

      {activeTab === 'variations' && (
        <VariationsMasterView
          initialVariations={variationsList}
          projects={projects}
          contracts={contracts}
          boqItems={boqItems}
          selectedProjectId={selectedProjectId}
        />
      )}

      {activeTab === 'claims' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            ⚖️
          </div>
          <h3 className="text-base font-bold text-slate-900">Claims &amp; Escalation (Clause 10CC / Hudson Formula)</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Quantify financial damages for idle machinery, unabsorbed head-office overheads, idle labour, and price escalation during extended periods.
          </p>
          <div className="pt-2">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-mono">
              Total Recorded Exposure: {formatINR(defenseMetrics.totalFinancialExposure)}
            </span>
          </div>
        </div>
      )}

      {/* NEW CONTRACT EVENT MODAL */}
      <NewContractEventModal
        open={newEventModalOpen}
        onClose={() => setNewEventModalOpen(false)}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
        onSuccess={handleEventCreated}
      />

      {/* EVENT DETAIL INSPECTOR MODAL */}
      <Modal
        open={!!selectedEventDetail}
        onClose={() => setSelectedEventDetail(null)}
        title={selectedEventDetail ? `Contract Event: ${selectedEventDetail.event_number}` : 'Event Details'}
      >
        {selectedEventDetail && (() => {
          const detailEvidence = evidenceList.filter(e => e.related_contract_event_id === selectedEventDetail.id)
          const completeness = calculateEvidenceCompleteness(selectedEventDetail.event_type, detailEvidence)

          return (
            <div className="space-y-4 text-left text-xs text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-sm text-slate-900 font-mono">{selectedEventDetail.event_number}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    {EVENT_CATEGORY_CONFIG[selectedEventDetail.event_type as ContractEventCategory]?.label || selectedEventDetail.event_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <EvidenceCompletenessBadge
                    completeness={completeness}
                    targetTitle={selectedEventDetail.event_number}
                    onAttachEvidence={() => {
                      setQuickTargetEventId(selectedEventDetail.id)
                      setQuickUploadOpen(true)
                    }}
                  />
                  <Badge
                    label={selectedEventDetail.status.replace(/_/g, ' ')}
                    variant={getStatusBadgeVariant(selectedEventDetail.status)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <p className="text-slate-500">Project</p>
                  <p className="font-semibold text-slate-900">{getProjectName(selectedEventDetail.project_id)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Contract Agreement</p>
                  <p className="font-semibold text-slate-900 font-mono">
                    {selectedEventDetail.contracts?.agreement_number || getContractAgreement(selectedEventDetail.contract_id) || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Event Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(selectedEventDetail.event_date)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Responsible Party</p>
                  <p className="font-semibold text-slate-900">{selectedEventDetail.responsible_party || 'Department'}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Description</p>
                <p className="text-slate-900 font-semibold mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  {selectedEventDetail.description}
                </p>
              </div>

              {selectedEventDetail.cause && (
                <div>
                  <p className="text-slate-500 font-medium">Neutral Factual Cause</p>
                  <p className="text-slate-800 mt-0.5 italic bg-slate-50 p-2 rounded border border-slate-200">
                    {selectedEventDetail.cause}
                  </p>
                </div>
              )}

              {/* Linked Supporting Evidence Section */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-xs">
                    Supporting Documentary Proofs ({detailEvidence.length} on file)
                  </p>
                  <Button
                    size="sm"
                    className="text-[10px] py-1 px-2.5 h-auto bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setQuickTargetEventId(selectedEventDetail.id)
                      setQuickUploadOpen(true)
                    }}
                  >
                    + Attach Proof
                  </Button>
                </div>

                {detailEvidence.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {detailEvidence.map(ev => (
                      <div key={ev.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{ev.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {ev.evidence_number} &bull; {ev.type} &bull; {formatDate(ev.document_date)}
                          </p>
                        </div>
                        <a
                          href={ev.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View &rarr;
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    No documentary proofs attached yet. Attach letters or site photos to raise completeness.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500">Location</p>
                  <p className="font-semibold text-slate-900">{selectedEventDetail.location || 'Site overall'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Delay Period</p>
                  <p className="font-semibold text-slate-900">
                    {formatDate(selectedEventDetail.start_date)} &rarr; {selectedEventDetail.end_date ? formatDate(selectedEventDetail.end_date) : 'Ongoing'} ({selectedEventDetail.actual_delay_days || selectedEventDetail.estimated_delay_days || 0}d)
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Financial Impact</p>
                  <p className="font-bold text-slate-900 font-mono text-sm">{formatINR(selectedEventDetail.financial_impact)}</p>
                </div>
                <div>
                  <p className="text-slate-500">EOT Clause</p>
                  <p className="font-semibold text-slate-900 font-mono">{selectedEventDetail.eot_clause || 'Clause 5'}</p>
                </div>
              </div>

              {(selectedEventDetail.labour_affected || selectedEventDetail.machinery_affected || selectedEventDetail.material_affected) && (
                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Resource Impacts</p>
                  {selectedEventDetail.labour_affected && (
                    <p className="text-slate-600"><b>Labour:</b> {selectedEventDetail.labour_affected}</p>
                  )}
                  {selectedEventDetail.machinery_affected && (
                    <p className="text-slate-600"><b>Machinery:</b> {selectedEventDetail.machinery_affected}</p>
                  )}
                  {selectedEventDetail.material_affected && (
                    <p className="text-slate-600"><b>Material:</b> {selectedEventDetail.material_affected}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedEventDetail(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* QUICK UPLOAD EVIDENCE MODAL */}
      <UploadEvidenceModal
        open={quickUploadOpen}
        onClose={() => {
          setQuickUploadOpen(false)
          setQuickTargetEventId('')
        }}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotApplications={eotApps}
        defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
        defaultContractEventId={quickTargetEventId}
        onSuccess={newEv => {
          setEvidenceList(prev => [newEv, ...prev])
          setQuickUploadOpen(false)
          setQuickTargetEventId('')
        }}
      />

      {/* DRAWER: LOG HINDRANCE (Appendix 21) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Site Hindrance (Works Manual Appendix 21)"
      >
        <form onSubmit={handleSaveHindrance} className="space-y-4">
          <FieldWrapper label="Target Project" required>
            <select
              value={targetProjectId}
              onChange={e => {
                setTargetProjectId(e.target.value)
                setTargetContractId('')
                setSelectedBoqIds([])
              }}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs font-medium focus:border-blue-600 focus:outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldWrapper>

          {availableContracts.length > 0 && (
            <FieldWrapper label="Associated Contract">
              <select
                value={targetContractId}
                onChange={e => setTargetContractId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              >
                <option value="">No specific contract (Project Level)</option>
                {availableContracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.agreement_number ? `Agr: ${c.agreement_number}` : c.contract_title || c.id}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          )}

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

          <FieldWrapper label="Nature of Hindrance / Description" required>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Electric utility pole at Km 4+200 obstructing culvert excavation; awaiting department shifting."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Location / Chainage (Km)">
              <input
                type="text"
                value={locationChainage}
                onChange={e => setLocationChainage(e.target.value)}
                placeholder="e.g. Km 4+200 to 4+600"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Affected Work / Activity">
              <input
                type="text"
                value={affectedWork}
                onChange={e => setAffectedWork(e.target.value)}
                placeholder="e.g. Subgrade, Culvert No. 2"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          {availableBoqItems.length > 0 && (
            <FieldWrapper label="Affected BOQ Items">
              <select
                multiple
                value={selectedBoqIds}
                onChange={e => {
                  const opts = Array.from(e.target.selectedOptions, o => o.value)
                  setSelectedBoqIds(opts)
                }}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs h-24"
              >
                {availableBoqItems.map(b => (
                  <option key={b.id} value={b.id}>
                    Item {b.item_number}: {b.description.slice(0, 40)}...
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Hold Ctrl (Windows) / Cmd (Mac) to select multiple BOQ items.</p>
            </FieldWrapper>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Date of Occurrence (Start)" required>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Date of Removal (End)">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="Leave blank if ongoing"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FieldWrapper label="Classification" required>
              <select
                value={delayType}
                onChange={e => setDelayType(e.target.value as HindranceDelayType)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 shadow-2xs"
              >
                <option value="compensable">Compensable (Dept)</option>
                <option value="non_compensable">Non-Compensable (Force Majeure)</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Overlapping Days">
              <input
                type="number"
                min="0"
                value={overlappingDays}
                onChange={e => setOverlappingDays(Number(e.target.value))}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Register Status">
              <select
                value={standardStatus}
                onChange={e => setStandardStatus(e.target.value as ContractDefenseStatus)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 shadow-2xs font-semibold"
              >
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="RESOLVED">REMOVED / RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DISPUTED">DISPUTED</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Labour Impact">
              <input
                type="text"
                value={labourImpact}
                onChange={e => setLabourImpact(e.target.value)}
                placeholder="e.g. 15 skilled & 30 helpers idled"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Machinery Impact">
              <input
                type="text"
                value={machineryImpact}
                onChange={e => setMachineryImpact(e.target.value)}
                placeholder="e.g. 1 Hydraulic Excavator idled"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Department Communication">
              <input
                type="text"
                value={deptComm}
                onChange={e => setDeptComm(e.target.value)}
                placeholder="e.g. Letter EE/PWD/2026/89 dt 12/03"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
              />
            </FieldWrapper>

            <FieldWrapper label="Contractor Communication">
              <input
                type="text"
                value={contractorComm}
                onChange={e => setContractorComm(e.target.value)}
                placeholder="e.g. Letter PP/EOT/04 dt 15/03"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
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
                Formal Clause 5 Written Notice Already Dispatched to Department
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
              {submitting ? 'Recording…' : 'Record in Appendix 21 Register'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* QUICK STATUS UPDATE MODAL */}
      <Modal
        open={statusUpdateModalOpen}
        onClose={() => setStatusUpdateModalOpen(false)}
        title={hindranceToUpdate ? `Update Hindrance #${hindranceToUpdate.hindrance_number} Status` : 'Update Status'}
      >
        <div className="space-y-4 text-left text-xs">
          <FieldWrapper label="Select New Status" required>
            <select
              value={newHindranceStatus}
              onChange={e => setNewHindranceStatus(e.target.value as ContractDefenseStatus)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-semibold"
            >
              <option value="OPEN">OPEN (Impediment Active)</option>
              <option value="UNDER_REVIEW">UNDER REVIEW (Dept Inspecting)</option>
              <option value="RESOLVED">REMOVED / RESOLVED (Impediment Cleared)</option>
              <option value="CLOSED">CLOSED (Formally Concluded)</option>
              <option value="DISPUTED">DISPUTED (Contested by Dept)</option>
            </select>
          </FieldWrapper>

          {(newHindranceStatus === 'RESOLVED' || newHindranceStatus === 'CLOSED') && (
            <FieldWrapper label="Removal / Resolution Date" required>
              <input
                type="date"
                required
                value={hindranceRemovalDate}
                onChange={e => setHindranceRemovalDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </FieldWrapper>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatusUpdateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUpdateHindranceStatus}
            >
              {submitting ? 'Saving…' : 'Update Status'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DRAFT EOT APPLICATION */}
      <Modal
        open={eotModalOpen}
        onClose={() => setEotModalOpen(false)}
        title="Draft Extension of Time (EOT) Application (Form 27)"
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

      {/* MODAL: CLAUSE 5 STATUTORY NOTICE */}
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
              Copy Notice Text
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
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: FORM 27 PRINTABLE VIEW */}
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
              Print Form 27
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
