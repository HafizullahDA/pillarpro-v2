'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { formatINR } from '@/lib/format'
import {
  SecurityDepositItem,
  ContractItem,
  CorrespondenceSummary,
  EOTCaseSummary,
} from './types'
import { SendWhatsAppModal, WhatsAppAlertData } from '@/components/alerts/SendWhatsAppModal'

interface DeadlinesClockProps {
  securityDeposits: SecurityDepositItem[]
  contracts: ContractItem[]
  correspondence: CorrespondenceSummary[]
  eotCases: EOTCaseSummary[]
}

interface DeadlineItem {
  id: string
  title: string
  subtitle: string
  date: string
  category: 'BG' | 'COMPLETION' | 'DLP' | 'NOTICE' | 'EOT'
  href: string
  metaAmount?: number | null
  rawBg?: SecurityDepositItem
  rawNotice?: CorrespondenceSummary
}

export function DeadlinesClockSection({
  securityDeposits,
  contracts,
  correspondence,
  eotCases,
}: DeadlinesClockProps) {
  const [filter, setFilter] = useState<'all' | 'bg' | 'contract' | 'dlp' | 'notice'>('all')
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean
    alertType: 'bg_expiry' | 'clause_notice' | 'text' | 'template'
    title: string
    data: WhatsAppAlertData
  } | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayTimestamp = new Date(todayStr).getTime()

  // Compile all real deadline items
  const items: DeadlineItem[] = []

  // 1. BG Expiries
  for (const bg of securityDeposits) {
    if (bg.status === 'active' && bg.expiry_date) {
      items.push({
        id: `bg-${bg.id}`,
        title: `BG / FDR Expiry: ${bg.reference_number || 'Deposit'}`,
        subtitle: `${bg.issuing_bank ? bg.issuing_bank + ' • ' : ''}${bg.deposit_type.replace(/_/g, ' ').toUpperCase()}`,
        date: bg.expiry_date,
        category: 'BG',
        href: '/contracts',
        metaAmount: bg.amount,
        rawBg: bg,
      })
    }
  }

  // 2. Contract Completion Deadlines
  for (const c of contracts) {
    if (c.status === 'active') {
      const compDate = c.current_completion_date || c.original_completion_date
      if (compDate) {
        items.push({
          id: `contract-${c.id}`,
          title: `Contract Completion: ${c.agreement_number}`,
          subtitle: c.contract_title || 'Stipulated Completion Milestone',
          date: compDate,
          category: 'COMPLETION',
          href: '/contracts',
          metaAmount: c.awarded_amount,
        })
      }
    }
  }

  // 3. DLP Expiries
  for (const c of contracts) {
    if (c.dlp_end_date) {
      items.push({
        id: `dlp-${c.id}`,
        title: `DLP Expiry: ${c.agreement_number}`,
        subtitle: `Defect Liability Period End Date (Security Deposit Release)`,
        date: c.dlp_end_date,
        category: 'DLP',
        href: '/contracts',
      })
    }
  }

  // 4. Notice Response Deadlines
  for (const corr of correspondence) {
    if (corr.response_required && !corr.responded_date && corr.status !== 'CLOSED' && corr.response_deadline) {
      items.push({
        id: `notice-${corr.id}`,
        title: `Notice Deadline: ${corr.letter_number || corr.reference_number}`,
        subtitle: `${corr.direction} • ${corr.subject}`,
        date: corr.response_deadline,
        category: 'NOTICE',
        href: '/correspondence',
        rawNotice: corr,
      })
    }
  }

  // 5. EOT Deadlines
  for (const eot of eotCases) {
    if (eot.department_response_date && ['SUBMITTED', 'UNDER_REVIEW', 'PREPARING'].includes(eot.status)) {
      items.push({
        id: `eot-${eot.id}`,
        title: `EOT Response Expected: ${eot.eot_reference}`,
        subtitle: `${eot.claimed_days} days claimed • ${eot.cause}`,
        date: eot.department_response_date,
        category: 'EOT',
        href: '/eot',
      })
    }
  }

  // Sort by date ascending (soonest first)
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Filter
  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    if (filter === 'bg') return item.category === 'BG'
    if (filter === 'contract') return item.category === 'COMPLETION'
    if (filter === 'dlp') return item.category === 'DLP'
    if (filter === 'notice') return item.category === 'NOTICE' || item.category === 'EOT'
    return true
  })

  const handleTriggerWhatsApp = (item: DeadlineItem, diffDays: number) => {
    if (item.category === 'BG' && item.rawBg) {
      setWhatsAppModalState({
        isOpen: true,
        alertType: 'bg_expiry',
        title: `Bank Guarantee Expiry Alert: ${item.rawBg.reference_number || 'Deposit'}`,
        data: {
          reference: item.rawBg.reference_number || 'Deposit',
          depositType: item.rawBg.deposit_type,
          amount: item.rawBg.amount,
          issuingBank: item.rawBg.issuing_bank || undefined,
          date: item.date,
          daysRemaining: diffDays,
          entityId: item.rawBg.id,
          projectId: item.rawBg.project_id,
        },
      })
    } else if (item.category === 'NOTICE' && item.rawNotice) {
      setWhatsAppModalState({
        isOpen: true,
        alertType: 'clause_notice',
        title: `Notice Deadline Alert: ${item.rawNotice.letter_number || item.rawNotice.reference_number}`,
        data: {
          reference: item.rawNotice.letter_number || item.rawNotice.reference_number,
          subject: item.rawNotice.subject,
          date: item.date,
          daysRemaining: diffDays,
          entityId: item.rawNotice.id,
          projectId: item.rawNotice.project_id,
        },
      })
    } else {
      setWhatsAppModalState({
        isOpen: true,
        alertType: 'text',
        title: item.title,
        data: {
          reference: item.title,
          subtitle: item.subtitle,
          date: item.date,
          daysRemaining: diffDays,
        },
      })
    }
  }

  return (
    <div id="deadlines" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-rose-500 inline-block" />
            <h2 className="text-base font-bold text-slate-900">6. Statutory &amp; Contractual Deadlines Clock</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Contractual Timers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Real-time countdown for BG renewals, completion milestones, DLP expiries, and statutory notice periods
          </p>
        </div>

        {/* Filter Pills & WhatsApp Test Action */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setWhatsAppModalState({
                isOpen: true,
                alertType: 'template',
                title: 'PillarPro WhatsApp Cloud API Live Test',
                data: {
                  reference: 'Meta Pre-Approved Template (hello_world)',
                  subtitle: 'Meta Cloud API v22.0 Push Pipeline',
                  date: todayStr,
                  daysRemaining: 0,
                },
              })
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors mr-1 cursor-pointer"
            title="Dispatch a live test alert to your WhatsApp number"
          >
            <span>💬</span>
            <span>Test WhatsApp</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('bg')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === 'bg' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            BGs ({items.filter(i => i.category === 'BG').length})
          </button>
          <button
            onClick={() => setFilter('contract')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === 'contract' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Completion ({items.filter(i => i.category === 'COMPLETION').length})
          </button>
          <button
            onClick={() => setFilter('dlp')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === 'dlp' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            DLP ({items.filter(i => i.category === 'DLP').length})
          </button>
          <button
            onClick={() => setFilter('notice')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === 'notice' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Notices &amp; EOT ({items.filter(i => i.category === 'NOTICE' || i.category === 'EOT').length})
          </button>
        </div>
      </div>

      {/* Deadlines List / Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm font-medium text-slate-600">No active deadlines recorded in this category</p>
          <p className="text-xs text-slate-400 mt-1">
            Deadlines will automatically populate from registered Bank Guarantees, Contract completion dates, and Notices
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(item => {
            const diffDays = Math.ceil((new Date(item.date).getTime() - todayTimestamp) / 86400000)
            const isOverdue = diffDays < 0
            const isDueToday = diffDays === 0
            const isUrgent = diffDays > 0 && diffDays <= 7

            return (
              <div
                key={item.id}
                className={`group flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/50 hover:bg-white hover:border-red-500 hover:shadow-xs'
                    : isDueToday
                    ? 'border-amber-300 bg-amber-50/50 hover:bg-white hover:border-amber-500 hover:shadow-xs'
                    : isUrgent
                    ? 'border-orange-200 bg-orange-50/30 hover:bg-white hover:border-orange-400 hover:shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-1.5 ${
                          item.category === 'BG'
                            ? 'bg-indigo-100 text-indigo-800'
                            : item.category === 'COMPLETION'
                            ? 'bg-blue-100 text-blue-800'
                            : item.category === 'DLP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.category === 'NOTICE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.category === 'COMPLETION' ? 'Milestone' : item.category}
                      </span>
                      <Link
                        href={item.href}
                        className="block text-xs font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Countdown Badge */}
                    <div className="shrink-0 text-right">
                      {isOverdue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          {Math.abs(diffDays)}d overdue
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          Due Today
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                          In {diffDays}d
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          In {diffDays}d
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer with Amount & WhatsApp Action */}
                <div className="border-t border-slate-100/90 pt-2.5 mt-3 flex items-center justify-between text-[11px] gap-2">
                  {item.metaAmount != null && item.metaAmount > 0 ? (
                    <div className="min-w-0">
                      <span className="text-slate-400 text-[10px] block leading-none mb-0.5">Amount</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{formatINR(item.metaAmount)}</span>
                    </div>
                  ) : (
                    <Link href={item.href} className="text-slate-400 hover:text-slate-600 text-[11px] font-medium">
                      View Details →
                    </Link>
                  )}

                  {(item.category === 'BG' || item.category === 'NOTICE') && (
                    <button
                      type="button"
                      onClick={() => handleTriggerWhatsApp(item, diffDays)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                      title="Dispatch real WhatsApp push alert to mobile"
                    >
                      <span>💬</span>
                      <span>WhatsApp Alert</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* WhatsApp Dispatch Modal */}
      {whatsAppModalState && (
        <SendWhatsAppModal
          isOpen={whatsAppModalState.isOpen}
          onClose={() => setWhatsAppModalState(null)}
          alertType={whatsAppModalState.alertType}
          title={whatsAppModalState.title}
          data={whatsAppModalState.data}
        />
      )}
    </div>
  )
}
