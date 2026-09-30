'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { PlanTier } from '@/lib/subscription'
import { formatINR, formatDate } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

export interface ProjectItem {
  id: string
  name: string
  agency_name: string | null
  advertised_cost: number | null
  awarded_amount: number | null
  start_date: string | null
  end_date: string | null
  status: string
}

export interface ContractItem {
  id: string
  project_id: string
  contract_number: string | null
  agreement_number: string | null
  tender_number: string | null
  employer_name: string | null
  stipulated_completion_date: string | null
  extended_completion_date: string | null
}

interface Message {
  role: 'user' | 'model'
  content: string
  groundingStatus?: 'VERIFIED' | 'DATA_MISSING' | 'INTERPRETED'
  modelUsed?: string
}

interface ContractAiClientProps {
  projects: ProjectItem[]
  contracts: ContractItem[]
  userPlanTier?: PlanTier
  userRole: string
}

const QUICK_PROMPTS = [
  {
    title: 'Delay Root-Cause Audit',
    query: 'What is delaying this project?',
    icon: '⏱️',
  },
  {
    title: '14-Day Notice Compliance',
    query: 'Check 14-day notice compliance for open hindrances',
    icon: '📜',
  },
  {
    title: 'Uncertified RA Bills & Withheld',
    query: 'Summarize uncertified RA bills and withheld amounts',
    icon: '💰',
  },
  {
    title: 'Clause 10CC Escalation Radar',
    query: 'Find relevant clauses for price escalation (Clause 10CC)',
    icon: '⚖️',
  },
  {
    title: 'Missing Evidence in Dossier',
    query: 'Identify missing evidence in the delay dossier',
    icon: '📂',
  },
  {
    title: 'BOQ Progress & Lagging Items',
    query: 'Summarize BOQ progress and lagging items',
    icon: '📊',
  },
]

export function ContractAiClient({
  projects,
  contracts,
  userPlanTier = 'growth',
  userRole,
}: ContractAiClientProps) {
  const toast = useToast()
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  )
  const isBootstrap = userPlanTier === 'bootstrap'
  const [messages, setMessages] = useState<Message[]>([])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const selectedContract = contracts.find((c) => c.project_id === selectedProjectId)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim()
    if (!text || loading) return

    if (!selectedProjectId) {
      setErrorMsg('Please select a project from the selector above.')
      return
    }

    setInputQuery('')
    setErrorMsg(null)

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/contract-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
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
              'ContractIQ is an exclusive feature of Growth Contractor and Enterprise Infra plans.'
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
      setErrorMsg(err.message || 'Network error occurred while contacting ContractIQ.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Answer copied to clipboard')
  }

  const formatReportContent = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
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
              <h4 key={idx} className="font-bold text-slate-900 mt-2 text-sm border-b border-slate-100 pb-1">
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
    <div className="flex flex-col min-h-screen bg-slate-100">
      {/* Top Banner / Command Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-5 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-blue-400/40">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  PillarPro ContractIQ
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous Contract Defense, Clause Radar & Claims Intelligence for Indian EPC Contractors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-200">4-Layer Zero-Hallucination Shield</span>
            </div>
            <Link
              href="/pricing"
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Plans & Quotas
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Project Selector & Metadata Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Active Project Under Audit
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value)
                setMessages([])
              }}
              className="w-full sm:w-auto min-w-[280px] max-w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.agency_name ? `(${p.agency_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Employer</p>
                <p className="font-bold text-slate-800 truncate">
                  {selectedContract?.employer_name || selectedProject.agency_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Agreement No.</p>
                <p className="font-bold text-slate-800 truncate">
                  {selectedContract?.agreement_number || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Awarded Value</p>
                <p className="font-bold text-slate-800 tabular-nums">
                  {formatINR(selectedProject.awarded_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Stipulated End</p>
                <p className="font-bold text-slate-800">
                  {formatDate(selectedContract?.stipulated_completion_date || selectedProject.end_date)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gated Lock Screen for Bootstrap */}
        {isBootstrap ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-xs flex flex-col items-center justify-center text-center my-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-200/70 text-amber-900 border border-amber-300 mb-2">
              Growth &amp; Enterprise Feature
            </span>
            <h3 className="text-xl font-bold text-slate-900">ContractIQ is Locked on Bootstrap Plan</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-lg leading-relaxed">
              Automated delay root-cause analysis, contractual clause radar, and CPWD Clause 5 notice audits in <strong>ContractIQ</strong> are available exclusively on the <strong>Growth Contractor (₹2,499/mo)</strong> and <strong>Enterprise Infra (₹4,599/mo)</strong> plans.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
              >
                Upgrade to Growth Contractor (₹2,499/mo)
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Active Chat Workspace */
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-h-[550px]">
            {/* Quick Prompt Carousel */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Instant One-Click Contract Defense Audits
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.query)}
                    disabled={loading}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all text-xs font-medium text-slate-700 group disabled:opacity-50"
                  >
                    <span className="text-base shrink-0">{qp.icon}</span>
                    <span className="truncate group-hover:text-blue-900">{qp.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Transcript Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[60vh] bg-slate-50/40">
              {messages.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Ready to audit {selectedProject?.name || 'this contract'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Click any quick audit chip above or ask a specific question below regarding clauses, uncertified RA bills, open hindrances, or missing evidence.
                  </p>
                </div>
              )}

              {messages.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      m.role === 'user'
                        ? 'bg-slate-900 text-white text-xs sm:text-sm'
                        : 'bg-white border border-slate-200 shadow-xs'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div>
                        {/* Header Tag */}
                        <div className="mb-2 flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              Grounding: {m.groundingStatus || 'VERIFIED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">
                              Zero-Hallucination Shield
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(m.content)}
                              className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                              title="Copy Answer"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        {formatReportContent(m.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 w-fit">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">
                    Inspecting verified project records &amp; tender clauses with Zero-Hallucination Shield...
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
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
                  placeholder="Ask a question about this contract, open hindrances, or RA bills..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  {loading ? 'Auditing...' : 'Ask ContractIQ'}
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="px-3 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                    title="Clear Conversation"
                  >
                    Clear
                  </button>
                )}
              </form>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                PillarPro ContractIQ references live project ERP records and uploaded contract documents. Always verify tender terms before formal submission. Not legal counsel.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

