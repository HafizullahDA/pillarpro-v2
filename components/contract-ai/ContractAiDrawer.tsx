'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { PlanTier } from '@/lib/subscription'

interface Message {
  role: 'user' | 'model'
  content: string
  groundingStatus?: 'VERIFIED' | 'DATA_MISSING' | 'INTERPRETED'
  modelUsed?: string
}

export interface ProjectOption {
  id: string
  name: string
  contract_number?: string | null
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
  'What is delaying this project?',
  'Check 14-day notice compliance for open hindrances',
  'Summarize uncertified RA bills and withheld amounts',
  'Find relevant clauses for price escalation (Clause 10CC)',
  'Identify missing evidence in the delay dossier',
  'Summarize BOQ progress and lagging items',
]

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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
  const displayContractNo = currentProject?.contract_number || initialContractNumber

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!isOpen) return null

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim()
    if (!text || loading) return

    if (!activeProjectId) {
      setErrorMsg('Please select a project to analyze.')
      return
    }

    setInputQuery('')
    setErrorMsg(null)

    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/contract-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          query: text,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.code === 'FEATURE_GATED') {
          setErrorMsg(
            data.error ||
              'Contract Copilot is available on Growth Contractor and Enterprise Infra plans.'
          )
        } else {
          setErrorMsg(data?.error || 'Failed to process contract query. Please try again.')
        }
        setLoading(false)
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
      setErrorMsg(err.message || 'Network error occurred while fetching contract analysis.')
    } finally {
      setLoading(false)
    }
  }

  const formatReportContent = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-2 text-xs text-slate-800 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />

          // [FACT]
          if (line.includes('[FACT]')) {
            return (
              <div key={idx} className="my-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-600 text-white tracking-wider mr-2">
                  FACT
                </span>
                <span className="text-emerald-950 font-medium">
                  {line.replace(/\[FACT\]:?/, '').trim()}
                </span>
              </div>
            )
          }

          // [USER-RECORDED DATA]
          if (line.includes('[USER-RECORDED DATA]')) {
            return (
              <div key={idx} className="my-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-600 text-white tracking-wider mr-2">
                  USER-RECORDED DATA
                </span>
                <span className="text-blue-950 font-medium">
                  {line.replace(/\[USER-RECORDED DATA\]:?/, '').trim()}
                </span>
              </div>
            )
          }

          // [CONTRACT TEXT]
          if (line.includes('[CONTRACT TEXT]')) {
            return (
              <div key={idx} className="my-1.5 p-2.5 rounded-lg bg-purple-50 border border-purple-200 font-serif">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-700 text-white tracking-wider mr-2 font-sans">
                  CONTRACT TEXT
                </span>
                <span className="text-purple-950 font-medium">
                  {line.replace(/\[CONTRACT TEXT\]:?/, '').trim()}
                </span>
              </div>
            )
          }

          // [AI INTERPRETATION]
          if (line.includes('[AI INTERPRETATION]')) {
            return (
              <div key={idx} className="my-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-600 text-white tracking-wider mr-2">
                  AI INTERPRETATION
                </span>
                <span className="text-amber-950 font-medium">
                  {line.replace(/\[AI INTERPRETATION\]:?/, '').trim()}
                </span>
              </div>
            )
          }

          // Section headers
          if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 mt-2 text-xs border-b border-slate-100 pb-1">
                {line.replace(/^###?\s*/, '')}
              </h4>
            )
          }

          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-700">
                {line.replace(/^[-*]\s*/, '')}
              </li>
            )
          }

          return <p key={idx}>{line}</p>
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">Contract Copilot</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-blue-500/30 text-blue-300 border border-blue-400/40">
                  AI • Zero-Hallucination
                </span>
              </div>
              {projects.length > 1 ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <select
                    value={activeProjectId}
                    onChange={(e) => {
                      setActiveProjectId(e.target.value)
                      onSelectProject?.(e.target.value)
                    }}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[240px] truncate"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} {p.contract_number ? `(${p.contract_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-slate-300 truncate max-w-sm mt-0.5">
                  {displayName} {displayContractNo ? `• ${displayContractNo}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMessages([])}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Clear chat history"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close Contract Copilot Drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Verification Guarantee Banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">4-Layer Zero-Hallucination Shield Active</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">CPWD • NHAI • FIDIC Grounded</span>
        </div>

        {/* Body Content */}
        {isBootstrap ? (
          /* Bootstrap Upgrade Lock Screen */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-200/60 text-amber-900 border border-amber-300 mb-2">
              Plan Upgrade Required
            </span>
            <h4 className="text-lg font-bold text-slate-900">Contract Copilot is Locked on Bootstrap</h4>
            <p className="mt-2 text-xs text-slate-600 max-w-md leading-relaxed">
              Automated delay root-cause analysis, contractual clause radar, and CPWD Clause 5 notice audits in <strong>Contract Copilot</strong> are available exclusively on the <strong>Growth Contractor (₹2,499/mo)</strong> and <strong>Enterprise Infra (₹4,599/mo)</strong> plans.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/pricing"
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
              >
                Upgrade to Growth (₹2,499/mo)
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Workspace */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {/* Quick Prompts Strip */}
            <div className="p-3 border-b border-slate-200 bg-white overflow-x-auto whitespace-nowrap scrollbar-thin">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Audit Prompts:</span>
              <div className="inline-flex gap-1.5">
                {QUICK_PROMPTS.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-slate-700 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-slate-600">
                    Ask questions about {displayName}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Try &ldquo;What is delaying this project?&rdquo; or &ldquo;Check 14-day notice compliance for open hindrances&rdquo;.
                  </p>
                </div>
              )}

              {messages.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 ${
                      m.role === 'user'
                        ? 'bg-slate-900 text-white text-xs'
                        : 'bg-white border border-slate-200 shadow-xs'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div>
                        {/* Status Tag */}
                        {m.groundingStatus && (
                          <div className="mb-2 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Grounding: {m.groundingStatus}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 ml-auto">
                              Zero-Hallucination Shield
                            </span>
                          </div>
                        )}
                        {formatReportContent(m.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Inspecting live project records &amp; tender clauses with Zero-Hallucination Shield...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask a question about this contract, open delays, or RA bills..."
                  disabled={loading}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold transition-colors"
                >
                  Send
                </button>
              </form>
              <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <span>Answers cite verified ERP records &amp; tender documents. Not legal advice.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
