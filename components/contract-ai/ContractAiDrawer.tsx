'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PlanTier } from '@/lib/subscription'

export interface ProjectOption {
  id: string
  name: string
  contract_number?: string | null
}

interface Message {
  role: 'user' | 'model'
  content: string
  groundingStatus?: 'VERIFIED' | 'DATA_MISSING' | 'INTERPRETED'
  modelUsed?: string
  isError?: boolean
  lastQuery?: string
}

interface ContractAiDrawerProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  projectName?: string
  contractNumber?: string
  userPlanTier?: PlanTier
  projects?: ProjectOption[]
  onSelectProject?: (projectId: string) => void
}

const QUICK_PROMPTS = [
  {
    label: 'Delay Root-Cause Audit',
    query: 'What is delaying this project?',
    icon: '⏱️',
  },
  {
    label: '14-Day Notice Compliance',
    query: 'Check 14-day notice compliance for open hindrances',
    icon: '📜',
  },
  {
    label: 'Uncertified RA Bills & Withheld',
    query: 'Summarize uncertified RA bills and withheld amounts',
    icon: '💰',
  },
  {
    label: 'Clause 10CC Escalation Radar',
    query: 'Find relevant clauses for price escalation (Clause 10CC)',
    icon: '⚖️',
  },
  {
    label: 'Missing Evidence Dossier',
    query: 'Identify missing evidence in the delay dossier',
    icon: '📂',
  },
  {
    label: 'BOQ Progress & Lagging Items',
    query: 'Summarize BOQ progress and lagging items',
    icon: '📊',
  },
]

function cleanClientErrorMessage(errorText: string): string {
  if (!errorText) {
    return 'The ContractIQ service is temporarily unavailable. Please click Retry below in a few moments.'
  }

  try {
    const jsonMatch = errorText.match(/\{[\s\S]*"error"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const msg = parsed?.error?.message || parsed?.message
      if (typeof msg === 'string') {
        const msgLower = msg.toLowerCase()
        if (
          msgLower.includes('high demand') ||
          msgLower.includes('unavailable') ||
          parsed?.error?.status === 'UNAVAILABLE' ||
          parsed?.error?.code === 503
        ) {
          return 'The AI engine is temporarily experiencing high server demand. We automatically retried backup models. Please click Retry below in a few moments.'
        }
        if (msgLower.includes('quota') || parsed?.error?.code === 429) {
          return 'AI query rate limit temporarily reached. Please wait a moment and click Retry.'
        }
        if (msg.trim().length > 0) return msg.trim()
      }
    }
  } catch {
    // ignore json parse error
  }

  const lower = errorText.toLowerCase()
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return 'The AI engine is temporarily experiencing high server demand. We automatically retried backup models. Please click Retry below in a few moments.'
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
    return 'AI query rate limit temporarily reached. Please wait a moment and click Retry.'
  }
  if (lower.includes('aborterror') || lower.includes('timeout') || lower.includes('aborted')) {
    return 'ContractIQ request timed out while inspecting large ERP records. Please click Retry below.'
  }

  const stripped = errorText.replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '').trim()
  return (
    stripped ||
    'The ContractIQ service is temporarily busy. Please click Retry below in a few moments.'
  )
}

export function ContractAiDrawer({
  isOpen,
  onClose,
  projectId: initialProjectId,
  projectName: initialProjectName = 'Current Project',
  contractNumber: initialContractNumber,
  userPlanTier = 'growth',
  projects = [],
  onSelectProject,
}: ContractAiDrawerProps) {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  )
  const isBootstrap = userPlanTier === 'bootstrap'
  const [messages, setMessages] = useState<Message[]>([])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialProjectId && initialProjectId !== activeProjectId) {
      setActiveProjectId(initialProjectId)
    } else if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id)
    }
  }, [initialProjectId, projects, activeProjectId])

  const currentProject = projects.find((p) => p.id === activeProjectId)
  const displayName = currentProject?.name || initialProjectName
  const contractNum = currentProject?.contract_number || initialContractNumber

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!isOpen) return null

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim()
    if (!text || loading) return

    if (!activeProjectId) {
      setValidationError('Please select an active project to analyze.')
      return
    }

    setInputQuery('')
    setValidationError(null)

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    // 25-second timeout via AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const res = await fetch('/api/contract-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          projectId: activeProjectId,
          query: text,
          conversationHistory: messages
            .filter((m) => !m.isError)
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      })

      clearTimeout(timeoutId)

      let data: any
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        const rawErr =
          data?.code === 'FEATURE_GATED'
            ? data?.error || 'ContractIQ is available on Growth Contractor and Enterprise Infra plans.'
            : data?.error || `Error ${res.status}: Failed to process contract query.`

        const cleanMsg = cleanClientErrorMessage(rawErr)

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: cleanMsg,
            isError: true,
            lastQuery: text,
          },
        ])
        return
      }

      if (!data?.answer) {
        const fallbackText = data?.error || 'No response received from ContractIQ. Please try again.'
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: cleanClientErrorMessage(fallbackText),
            isError: true,
            lastQuery: text,
          },
        ])
        return
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: data.answer,
          groundingStatus: data.groundingStatus,
          modelUsed: data.modelUsed,
        },
      ])
    } catch (err: any) {
      clearTimeout(timeoutId)
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted')
      const message = isTimeout
        ? 'ContractIQ request timed out after 25 seconds. The server might be inspecting large ERP measurement records or experiencing network latency.'
        : err?.message || 'Network error occurred while fetching contract analysis.'

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: cleanClientErrorMessage(message),
          isError: true,
          lastQuery: text,
        },
      ])
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const formatReportContent = (content: string) => {
    // Split into lines for structured enterprise taxonomy rendering
    const lines = content.split('\n')
    let inDisclaimer = false

    return (
      <div className="space-y-2 text-xs text-slate-800 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={idx} className="h-1" />

          // Disclaimer block detection
          if (trimmed.includes('Statutory Disclaimer') || inDisclaimer) {
            inDisclaimer = true
            return (
              <div
                key={idx}
                className="mt-3 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 text-[10.5px] text-slate-600 italic leading-relaxed"
              >
                <div className="flex items-start gap-1.5 not-italic font-semibold text-slate-700 text-[11px] mb-0.5">
                  <svg className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Statutory Contractual Notice
                </div>
                {line.replace(/^>\s*\*\*Statutory Disclaimer\*\*:?\s*\*?/, '').replace(/\*$/, '').trim()}
              </div>
            )
          }

          // [FACT]
          if (line.includes('[FACT]')) {
            return (
              <div key={idx} className="my-1.5 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-emerald-600 text-white tracking-wider">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    VERIFIED FACT
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">ERP Immutable Database Record</span>
                </div>
                <div className="text-emerald-950 font-medium text-[11.5px] leading-relaxed">
                  {line.replace(/\[FACT\]:?/, '').trim()}
                </div>
              </div>
            )
          }

          // [USER-RECORDED DATA]
          if (line.includes('[USER-RECORDED DATA]')) {
            return (
              <div key={idx} className="my-1.5 p-2.5 rounded-xl bg-sky-50/90 border border-sky-200 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-sky-600 text-white tracking-wider">
                    USER RECORD
                  </span>
                  <span className="text-[10px] text-sky-700 font-medium">Site Engineer Entry (Pending Dept Sanction)</span>
                </div>
                <div className="text-sky-950 font-medium text-[11.5px] leading-relaxed">
                  {line.replace(/\[USER-RECORDED DATA\]:?/, '').trim()}
                </div>
              </div>
            )
          }

          // [CONTRACT TEXT]
          if (line.includes('[CONTRACT TEXT]')) {
            return (
              <div key={idx} className="my-1.5 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/90 font-serif shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1 font-sans">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-indigo-700 text-white tracking-wider">
                    CONTRACT CLAUSE
                  </span>
                  <span className="text-[10px] text-indigo-700 font-medium">Agreement / GCC Citation</span>
                </div>
                <div className="text-indigo-950 font-medium text-[12px] leading-relaxed italic">
                  {line.replace(/\[CONTRACT TEXT\]:?/, '').trim()}
                </div>
              </div>
            )
          }

          // [AI INTERPRETATION]
          if (line.includes('[AI INTERPRETATION]')) {
            return (
              <div key={idx} className="my-1.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-amber-600 text-white tracking-wider">
                    AI INTERPRETATION
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Analytical Risk &amp; Timeline Correlation</span>
                </div>
                <div className="text-amber-950 font-medium text-[11.5px] leading-relaxed">
                  {line.replace(/\[AI INTERPRETATION\]:?/, '').trim()}
                </div>
              </div>
            )
          }

          // Section headers
          if (
            line.startsWith('### ') ||
            line.startsWith('## ') ||
            line.startsWith('1. ') ||
            line.startsWith('2. ') ||
            line.startsWith('3. ') ||
            line.startsWith('4. ') ||
            line.startsWith('5. ')
          ) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 mt-2.5 pt-1.5 text-xs sm:text-[12.5px] border-b border-slate-200/80 pb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {line.replace(/^###?\s*/, '')}
              </h4>
            )
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-1 text-slate-700 text-[11.5px]">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span className="flex-1">{trimmed.replace(/^[-*]\s*/, '')}</span>
              </div>
            )
          }

          return <p key={idx} className="text-[11.5px] text-slate-700 leading-relaxed">{line}</p>
        })}
      </div>
    )
  }

  return (
    <>
      {/* Mobile-only backdrop for easy tap-away dismissal */}
      <div
        className="sm:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Canvas: Anchored bottom-right with instant Expand / Collapse toggle */}
      <div
        className={cn(
          'fixed z-50 bg-white shadow-2xl border border-slate-200/90 rounded-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/10 transition-all duration-300 ease-in-out',
          // Mobile responsive: sits neatly above nav bar
          'bottom-16 sm:bottom-6 left-2.5 right-2.5 sm:left-auto sm:right-6',
          // Desktop compact vs expanded enterprise view
          isExpanded
            ? 'sm:w-[740px] md:w-[860px] lg:w-[960px] h-[580px] sm:h-[720px] max-h-[calc(100vh-3.5rem)]'
            : 'sm:w-[440px] md:w-[470px] h-[520px] sm:h-[580px] max-h-[calc(100vh-4.5rem)]'
        )}
        role="dialog"
        aria-label="ContractIQ Enterprise AI Assistant"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enterprise Copilot Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-[13px] font-bold tracking-tight text-white flex items-center gap-1.5">
                  ContractIQ
                </h3>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-2xs font-mono">
                  PRO AI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ERP Grounded
                </span>
              </div>

              {projects.length > 1 ? (
                <div className="mt-0.5">
                  <select
                    value={activeProjectId}
                    onChange={(e) => {
                      setActiveProjectId(e.target.value)
                      onSelectProject?.(e.target.value)
                      setValidationError(null)
                    }}
                    className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[220px] sm:max-w-[280px] truncate cursor-pointer transition-colors"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} {p.contract_number ? `(${p.contract_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[10px] text-slate-300 truncate max-w-[200px] sm:max-w-[280px]">
                  {displayName} {contractNum ? `• ${contractNum}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="px-2 py-1 text-[10.5px] font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                title="Clear conversation history"
              >
                Clear
              </button>
            )}

            {/* Expand / Collapse Canvas Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="hidden sm:flex p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label={isExpanded ? 'Contract to standard widget' : 'Expand canvas to wide view'}
              title={isExpanded ? 'Contract canvas' : 'Expand canvas to enterprise view'}
            >
              {isExpanded ? (
                /* Minimize icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5m-5 0v5m11 11l5 5m0 0h-5m5 0v-5m-5-6l5-5m0 0v5m0-5h-5M4 20l5-5m0 0H4m5 0v5" />
                </svg>
              ) : (
                /* Maximize icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Close ContractIQ Assistant"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body Content */}
        {isBootstrap ? (
          /* Bootstrap Upgrade Lock Screen */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50 overflow-y-auto">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mb-3 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200/70 text-amber-900 border border-amber-300 mb-1.5">
              Plan Upgrade Required
            </span>
            <h4 className="text-sm font-bold text-slate-900">ContractIQ Locked</h4>
            <p className="mt-1 text-[11px] text-slate-600 max-w-xs leading-relaxed">
              Delay root-cause analysis, statutory notice audits, and clause radars in{' '}
              <strong>ContractIQ</strong> require the <strong>Growth Contractor (₹2,499/mo)</strong> plan.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
              >
                Upgrade Plan
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Workspace */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {/* Quick Prompts Strip - Completely free of default Windows scrollbars! */}
            <div className="px-3 py-2 border-b border-slate-200/80 bg-white/90 overflow-x-auto whitespace-nowrap no-scrollbar shrink-0 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Quick Audits:
              </span>
              {QUICK_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSend(prompt.query)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200/80 text-slate-700 transition-all shrink-0 disabled:opacity-50 shadow-2xs active:scale-95 cursor-pointer"
                >
                  <span className="text-xs">{prompt.icon}</span>
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>

            {/* Messages Scroll Area with custom sleek scrollbar */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-10 px-4 text-slate-400">
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Ask questions about {displayName}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    ContractIQ cross-references your recorded Hindrance Registers, e-MB measurements,
                    unpaid RA Bills, and tender clauses in real-time.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSend('What is delaying this project?')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                      ⏱️ Delay Root-Cause
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend('Check 14-day notice compliance for open hindrances')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                    >
                      📜 14-Day Notice Audit
                    </button>
                  </div>
                </div>
              )}

              {messages.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={cn(
                      'rounded-2xl transition-all',
                      m.role === 'user'
                        ? 'max-w-[85%] p-3 bg-slate-900 text-white text-xs shadow-sm ml-auto'
                        : 'w-full max-w-[96%] p-3.5 bg-white border border-slate-200/90 shadow-2xs text-xs'
                    )}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : m.isError ? (
                      /* Enterprise Error Card with Interactive Retry */
                      <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-rose-900 text-xs mb-1">
                              Analysis Temporarily Interrupted
                            </div>
                            <p className="text-rose-800 leading-relaxed text-[11.5px]">
                              {m.content}
                            </p>
                            {m.lastQuery && (
                              <div className="mt-3 pt-2.5 border-t border-rose-200/80 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleSend(m.lastQuery)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Retry Analysis
                                </button>
                                <span className="text-[10px] text-rose-700 font-medium">
                                  Automatically retries with secondary model
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Enterprise AI Audit Response */
                      <div>
                        {/* Status Header Strip */}
                        <div className="mb-2 flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-900 text-white font-mono">
                              {m.modelUsed || 'Gemini 3.6 Flash'}
                            </span>
                            {m.groundingStatus === 'VERIFIED' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                100% ERP Grounded
                              </span>
                            )}
                            {m.groundingStatus === 'INTERPRETED' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                Clause Interpretation
                              </span>
                            )}
                            {m.groundingStatus === 'DATA_MISSING' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                                Record Gap Identified
                              </span>
                            )}
                          </div>

                          {/* Copy Action */}
                          <button
                            type="button"
                            onClick={() => handleCopy(m.content, mIdx)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Copy answer to clipboard"
                          >
                            {copiedIndex === mIdx ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-emerald-700 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {formatReportContent(m.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2.5 p-3 text-xs text-slate-600 bg-white rounded-xl border border-slate-200/90 shadow-2xs w-fit">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <span className="font-semibold text-slate-800">ContractIQ Analyzing...</span>
                    <span className="block text-[10.5px] text-slate-500">
                      Scanning ERP measurements, hindrances &amp; contract clauses
                    </span>
                  </div>
                </div>
              )}

              {validationError && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {validationError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Compact Input Form */}
            <div className="p-2.5 border-t border-slate-200 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => {
                    setInputQuery(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  placeholder="Ask a question about this contract, delays, bills, clauses..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white shrink-0 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  title="Send query"
                  aria-label="Send query"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  )}
                </button>
              </form>
              <div className="mt-1 text-[9px] text-slate-400 text-center flex items-center justify-center gap-1">
                <span>References verified ERP database records.</span>
                <span>•</span>
                <span>Not formal legal representation.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
