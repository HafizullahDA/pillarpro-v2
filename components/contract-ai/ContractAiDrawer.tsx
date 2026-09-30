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

interface ContractAiDrawerProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName?: string
  contractNumber?: string
  userPlanTier?: PlanTier
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
  projectId,
  projectName = 'Current Project',
  contractNumber,
  userPlanTier = 'growth',
}: ContractAiDrawerProps) {
  const isBootstrap = userPlanTier === 'bootstrap'
  const [messages, setMessages] = useState<Message[]>([])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!isOpen) return null

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim()
    if (!text || loading) return

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
          projectId,
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
              'Contract AI is available on Growth Contractor and Enterprise Infra plans.'
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
      setErrorMsg(err?.message || 'Network error communicating with Contract AI service.')
    } finally {
      setLoading(false)
    }
  }

  // Renders the 4-tier taxonomy tags with distinctive visual pills
  const formatReportContent = (text: string) => {
    const paragraphs = text.split('\n')

    return (
      <div className="space-y-2 text-xs leading-relaxed text-slate-800">
        {paragraphs.map((p, idx) => {
          const line = p.trim()
          if (!line) return <div key={idx} className="h-1.5" />

          if (line.startsWith('#')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1 border-b border-slate-200 pb-1">
                {line.replace(/^#+\s*/, '')}
              </h4>
            )
          }

          // Taxonomies
          const isFact = line.includes('[FACT]')
          const isUserLogged = line.includes('[USER-RECORDED DATA]')
          const isContractText = line.includes('[CONTRACT TEXT]')
          const isAiInterp = line.includes('[AI INTERPRETATION]')

          if (isFact || isUserLogged || isContractText || isAiInterp) {
            let badgeClass = ''
            let badgeLabel = ''
            let cleanLine = line

            if (isFact) {
              badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
              badgeLabel = 'FACT'
              cleanLine = cleanLine.replace(/\[FACT\]:?/g, '').trim()
            } else if (isUserLogged) {
              badgeClass = 'bg-amber-100 text-amber-900 border-amber-300'
              badgeLabel = 'USER-RECORDED DATA'
              cleanLine = cleanLine.replace(/\[USER-RECORDED DATA\]:?/g, '').trim()
            } else if (isContractText) {
              badgeClass = 'bg-blue-100 text-blue-900 border-blue-300'
              badgeLabel = 'CONTRACT TEXT'
              cleanLine = cleanLine.replace(/\[CONTRACT TEXT\]:?/g, '').trim()
            } else if (isAiInterp) {
              badgeClass = 'bg-purple-100 text-purple-900 border-purple-300'
              badgeLabel = 'AI INTERPRETATION'
              cleanLine = cleanLine.replace(/\[AI INTERPRETATION\]:?/g, '').trim()
            }

            return (
              <div key={idx} className="my-1.5 p-2 rounded-lg bg-slate-50/80 border border-slate-200">
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded border tracking-wide mr-1.5 ${badgeClass}`}>
                  {badgeLabel}
                </span>
                <span className="text-slate-800 font-medium">{cleanLine}</span>
              </div>
            )
          }

          if (line.startsWith('>') || line.toLowerCase().includes('statutory disclaimer')) {
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] italic my-2">
                {line.replace(/^>\s*/, '')}
              </div>
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
                <h3 className="text-sm font-bold tracking-tight text-white">PillarPro Contract AI</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 1.5 Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate max-w-sm mt-0.5">
                {projectName} {contractNumber ? `• ${contractNumber}` : ''}
              </p>
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
              aria-label="Close Contract AI Drawer"
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
            <h4 className="text-lg font-bold text-slate-900">Contract AI is Locked on Bootstrap</h4>
            <p className="mt-2 text-xs text-slate-600 max-w-md leading-relaxed">
              Automated delay root-cause analysis, contractual clause radar, and CPWD Clause 5 notice audits powered by <strong>Gemini 1.5 Pro</strong> are available exclusively on the <strong>Growth Contractor (₹2,499/mo)</strong> and <strong>Enterprise Infra (₹4,599/mo)</strong> plans.
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Interface */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="py-6 text-center">
                  <div className="h-10 w-10 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Ask any question about this contract</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                    Operates strictly on your verified project data and uploaded tender clauses. Zero guessing.
                  </p>

                  {/* Pre-built Prompt Chips */}
                  <div className="mt-5 grid grid-cols-1 gap-2 text-left max-w-md mx-auto">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Recommended Audit Queries:
                    </p>
                    {QUICK_PROMPTS.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="text-left px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 text-slate-700 text-xs font-medium transition-colors flex items-center justify-between"
                      >
                        <span>{prompt}</span>
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Messages */}
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
                            {m.modelUsed && (
                              <span className="text-[10px] font-mono text-slate-400 ml-auto">
                                {m.modelUsed}
                              </span>
                            )}
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
                  <span>Inspecting live PostgreSQL project records & tender clauses with Gemini 1.5 Pro...</span>
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
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-sm shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
