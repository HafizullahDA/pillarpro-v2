'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface WalkthroughChapter {
  id: string
  label: string
  timeRange: string
  durationSec: number
  startSec: number
  title: string
  subtitle: string
  badge: string
  stats: { label: string; value: string }[]
  speechText: string
  url: string
}

const CHAPTERS: WalkthroughChapter[] = [
  {
    id: 'boq',
    label: '1. Tender BOQ',
    timeRange: '0:00 - 0:45',
    startSec: 0,
    durationSec: 45,
    title: 'Tender BOQ Setup & Work Front Creation',
    subtitle: 'Upload Schedule of Rates (SOR) and index items by chainages before ground breaks.',
    badge: 'SOR 2024 Indexed',
    stats: [
      { label: 'Sanctioned Value', value: '₹48.20 Cr' },
      { label: 'BOQ Line Items', value: '184 Items' },
      { label: 'Specification Match', value: '100% CPWD DSR' },
    ],
    speechText:
      'Welcome to PillarPro. In under three minutes, discover how modern civil contractors run their sites without billing leaks. First, import your tender BOQ with CPWD Schedule of Rates. PillarPro automatically organizes quantities by chainages and structures, giving your team complete financial control from day one.',
    url: 'app.pillarpro.in/contracts/nhai-pkg-04/boq',
  },
  {
    id: 'emb',
    label: '2. Digital e-MB',
    timeRange: '0:45 - 1:30',
    startSec: 45,
    durationSec: 45,
    title: 'Offline Digital Measurement Book (e-MB)',
    subtitle: 'Field engineers record L × B × D measurements on mobile with geotagged site photos.',
    badge: 'Offline Sync Engine Active',
    stats: [
      { label: 'Work Front', value: 'Ch 18+250 Culvert' },
      { label: 'Offline Sync Queue', value: 'Zero Data Loss' },
      { label: 'Tamper Protection', value: 'GPS & Time Locked' },
    ],
    speechText:
      'Next, on-site execution. Field engineers record measurements directly into the digital e-MB on their phones. Enter length, breadth, and depth. Geotag photos of reinforcement and concrete pours. Even in remote highway trenches with zero internet, data saves locally and syncs automatically when back online.',
    url: 'app.pillarpro.in/field/e-mb/entry-18250',
  },
  {
    id: 'rabill',
    label: '3. Form 26 RA Bill',
    timeRange: '1:30 - 2:15',
    startSec: 90,
    durationSec: 45,
    title: '1-Click CPWD Form 26 RA Bill Auto-Gen',
    subtitle: 'Convert verified site measurements into statutory RA bills with retention and GST.',
    badge: 'CPWD Form 26 Statutory',
    stats: [
      { label: 'Reconciliation Delay', value: '0 Days (Instant)' },
      { label: 'Retention & Advance', value: 'Auto-Deducted' },
      { label: 'Net Payable Certified', value: '₹3,43,82,840' },
    ],
    speechText:
      'Billing day no longer takes two weeks of stressful reconciliation. Certified e-MB quantities flow directly into statutory CPWD Form 26. Deductions for 5% retention, mobilization advances, and 18% GST are calculated automatically. Export an audit-ready certified PDF ready for Executive Engineer signature.',
    url: 'app.pillarpro.in/billing/ra-bills/bill-04/preview',
  },
  {
    id: 'contractiq',
    label: '4. ContractIQ & Claims',
    timeRange: '2:15 - 3:00',
    startSec: 135,
    durationSec: 45,
    title: 'ContractIQ GCC Defense & Price Escalation',
    subtitle: 'Draft Extension of Time notices, track Clause 10CC inflation, and protect margins.',
    badge: 'GCC Legal Defense AI',
    stats: [
      { label: 'GCC Clauses Indexed', value: 'CPWD & NHAI EPC' },
      { label: 'EOT Notice Drafts', value: '< 60 Seconds' },
      { label: 'Clause 10CC Escalation', value: '₹24.60 Lakhs Live' },
    ],
    speechText:
      'Finally, protect your firm profit margins. When government departments delay site possession or drawings, ContractIQ drafts Extension of Time notices citing standard GCC clauses. Track statutory price escalation under Clause 10CC and monitor bank guarantees in real time.',
    url: 'app.pillarpro.in/contract-iq/defense-copilot',
  },
]

const TOTAL_DURATION_SEC = 180

interface WalkthroughModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

export function WalkthroughModal({ isOpen, onClose, videoUrl = '' }: WalkthroughModalProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5>(1)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false)
  const [showVideoEmbed, setShowVideoEmbed] = useState(Boolean(videoUrl))

  const activeChapter = CHAPTERS[activeChapterIndex] || CHAPTERS[0]
  const lastSpokenChapterRef = useRef<number | null>(null)

  // Check speech synthesis support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setHasSpeechSupport(true)
    }
  }, [])

  // Stop speech when modal closes or unmounts
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      lastSpokenChapterRef.current = null
    }
  }, [isOpen])

  // Reset to chapter 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveChapterIndex(0)
      setCurrentTimeSec(0)
      setIsPlaying(true)
      lastSpokenChapterRef.current = null
    }
  }, [isOpen])

  // Handle Speech Narration
  const speakChapterNarration = useCallback((chapterIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const textToSpeak = CHAPTERS[chapterIndex]?.speechText
    if (!textToSpeak) return

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = playbackSpeed === 1.5 ? 1.2 : 1.02
    utterance.pitch = 1.0

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find((v) => v.lang === 'en-IN' || v.name.includes('India')) ||
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
      voices.find((v) => v.lang.startsWith('en'))
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
    lastSpokenChapterRef.current = chapterIndex
  }, [playbackSpeed])

  // Trigger narration when active chapter changes (if voice is enabled)
  useEffect(() => {
    if (!isOpen) return
    if (voiceEnabled) {
      if (lastSpokenChapterRef.current !== activeChapterIndex) {
        speakChapterNarration(activeChapterIndex)
      }
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      lastSpokenChapterRef.current = null
    }
  }, [voiceEnabled, activeChapterIndex, isOpen, speakChapterNarration])

  // Playback Timer Loop
  useEffect(() => {
    if (!isOpen || !isPlaying || showVideoEmbed) return

    const intervalMs = 250
    const stepSec = (intervalMs / 1000) * playbackSpeed

    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + stepSec
        if (next >= TOTAL_DURATION_SEC) {
          setIsPlaying(false)
          return TOTAL_DURATION_SEC
        }

        // Check if we advanced to next chapter
        const newIndex = CHAPTERS.findIndex(
          (c) => next >= c.startSec && next < c.startSec + c.durationSec
        )
        if (newIndex !== -1 && newIndex !== activeChapterIndex) {
          setActiveChapterIndex(newIndex)
        }

        return next
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [isOpen, isPlaying, playbackSpeed, activeChapterIndex, showVideoEmbed])

  // Jump to Chapter
  const jumpToChapter = (index: number) => {
    const target = CHAPTERS[index]
    if (!target) return
    setActiveChapterIndex(index)
    setCurrentTimeSec(target.startSec)
    setIsPlaying(true)
    if (voiceEnabled) {
      speakChapterNarration(index)
    }
  }

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-5xl w-full text-white overflow-hidden flex flex-col my-auto transition-all">
        {/* ── 1. MODAL TOP BAR ─────────────────────────────────── */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-600/30">
              ▶
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  PillarPro 3-Minute Walkthrough
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Interactive Live Tour
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                End-to-End Civil ERP Simulation: Tender BOQ &rarr; Digital e-MB &rarr; Form 26 RA Bill &rarr; ContractIQ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Real Video vs Simulation if videoUrl is configured */}
            {videoUrl && (
              <button
                type="button"
                onClick={() => setShowVideoEmbed(!showVideoEmbed)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {showVideoEmbed ? 'Switch to Interactive Tour' : 'Watch Video Embed'}
              </button>
            )}

            {/* Voice Narration Toggle */}
            {!showVideoEmbed && hasSpeechSupport && (
              <button
                type="button"
                onClick={() => {
                  const nextState = !voiceEnabled
                  setVoiceEnabled(nextState)
                  if (nextState) {
                    speakChapterNarration(activeChapterIndex)
                  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel()
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  voiceEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
                title={voiceEnabled ? 'Mute AI voiceover' : 'Enable voiceover narration'}
              >
                {voiceEnabled ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Voice Narration: ON</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                    <span>Turn On Voice</span>
                  </>
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close Walkthrough"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 2. REAL VIDEO EMBED (IF ACTIVATED) ────────────────── */}
        {showVideoEmbed ? (
          <div className="aspect-video bg-black w-full flex items-center justify-center">
            {videoUrl.endsWith('.mp4') ? (
              <video src={videoUrl} controls autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <iframe
                src={videoUrl}
                title="PillarPro 3-Minute Walkthrough"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ) : (
          <>
            {/* ── 3. CHAPTER NAVIGATION TABS ─────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-950 border-b border-slate-800 text-xs">
              {CHAPTERS.map((ch, idx) => {
                const isActive = activeChapterIndex === idx
                // Calculate chapter progress
                let chapterProgress = 0
                if (currentTimeSec >= ch.startSec + ch.durationSec) {
                  chapterProgress = 100
                } else if (currentTimeSec > ch.startSec) {
                  chapterProgress = ((currentTimeSec - ch.startSec) / ch.durationSec) * 100
                }

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => jumpToChapter(idx)}
                    className={`relative p-3 text-left transition-all border-r border-slate-800/80 last:border-r-0 hover:bg-slate-900/60 ${
                      isActive ? 'bg-slate-900/90 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`font-bold text-[11px] truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                        {ch.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{ch.timeRange}</span>
                    </div>

                    {/* Mini Progress Bar for Chapter */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all duration-200 ${
                          isActive ? 'bg-blue-500' : chapterProgress === 100 ? 'bg-emerald-500/70' : 'bg-transparent'
                        }`}
                        style={{ width: `${chapterProgress}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ── 4. STAGE CONTENT & SIMULATED BROWSER ─────────────── */}
            <div className="p-4 sm:p-6 bg-slate-900/90 flex-1 space-y-4">
              {/* Simulated Browser Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] font-mono text-slate-400 max-w-sm w-full text-center truncate">
                    {activeChapter.url}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{activeChapter.badge}</span>
                  </div>
                </div>

                {/* Stage Main Body: Interactive UI Simulation */}
                <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-[300px] flex flex-col justify-between gap-4">
                  {/* Scene Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>{activeChapter.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{activeChapter.subtitle}</p>
                    </div>

                    {/* Key Stats Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeChapter.stats.map((s) => (
                        <div
                          key={s.label}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-right"
                        >
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{s.label}</p>
                          <p className="text-[11px] font-bold text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scene Simulation Content By Chapter */}
                  <div className="flex-1 py-1">
                    {/* CHAPTER 0: TENDER BOQ SETUP */}
                    {activeChapterIndex === 0 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">
                            Package: NHAI Four-Laning (Ch. 12+000 to 48+500) • CPWD SOR Index
                          </span>
                          <span className="text-emerald-400 text-[11px] font-mono">Status: Sanctioned &amp; Verified</span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-800">
                              <tr>
                                <th className="p-2.5">Item Code</th>
                                <th className="p-2.5">Description of Item</th>
                                <th className="p-2.5 text-right">Sanctioned Qty</th>
                                <th className="p-2.5 text-right">Tender Rate</th>
                                <th className="p-2.5 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-[11px]">
                              <tr className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-mono text-blue-400 font-bold">2.01</td>
                                <td className="p-2.5 text-slate-300">Earthwork excavation in all soils for roadbed</td>
                                <td className="p-2.5 text-right font-mono">1,20,000 cu.m</td>
                                <td className="p-2.5 text-right font-mono">₹185.00</td>
                                <td className="p-2.5 text-right font-mono font-bold text-white">₹2,22,00,000</td>
                              </tr>
                              <tr className="hover:bg-slate-800/40 bg-blue-500/5">
                                <td className="p-2.5 font-mono text-blue-400 font-bold">3.12</td>
                                <td className="p-2.5 text-slate-300">Reinforced cement concrete (M25) in substructure</td>
                                <td className="p-2.5 text-right font-mono">8,450 cu.m</td>
                                <td className="p-2.5 text-right font-mono">₹6,400.00</td>
                                <td className="p-2.5 text-right font-mono font-bold text-white">₹5,40,80,000</td>
                              </tr>
                              <tr className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-mono text-blue-400 font-bold">4.08</td>
                                <td className="p-2.5 text-slate-300">High strength deformed steel bars (Fe500D)</td>
                                <td className="p-2.5 text-right font-mono">1,250 MT</td>
                                <td className="p-2.5 text-right font-mono">₹68,500.00</td>
                                <td className="p-2.5 text-right font-mono font-bold text-white">₹8,56,25,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            ✓ Auto-matches CPWD DSR codes
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            ✓ Assigns Chainages &amp; Sub-structures
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            ✓ Prevents over-execution past 125% limit
                          </span>
                        </div>
                      </div>
                    )}

                    {/* CHAPTER 1: DIGITAL E-MB ON SITE */}
                    {activeChapterIndex === 1 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="grid sm:grid-cols-3 gap-3">
                          {/* Live Measurement Card */}
                          <div className="sm:col-span-2 p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                Live Field Entry: Culvert Barrel Raft (Ch 18+250)
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                ✓ Offline Saved
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Nos</span>
                                <span className="font-mono font-bold text-white text-sm">1</span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Length (L)</span>
                                <span className="font-mono font-bold text-white text-sm">14.50 m</span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Breadth (B)</span>
                                <span className="font-mono font-bold text-white text-sm">2.40 m</span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Depth (D)</span>
                                <span className="font-mono font-bold text-white text-sm">0.35 m</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                              <span className="text-slate-400 text-[11px]">Calculated Quantity:</span>
                              <span className="font-mono font-black text-emerald-400 text-sm">
                                12.18 cu.m (M25 Concrete)
                              </span>
                            </div>
                          </div>

                          {/* Geotag & Audit Info */}
                          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between text-xs space-y-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                GPS Verification
                              </p>
                              <p className="font-mono text-[11px] text-slate-200 mt-1">28.3670° N, 79.4304° E</p>
                              <p className="text-[10px] text-slate-400">Accuracy &plusmn;2.4m • Timestamped</p>
                            </div>
                            <div className="pt-2 border-t border-slate-800">
                              <p className="text-[10px] text-slate-400">Site Engineer</p>
                              <p className="text-xs font-bold text-white">Rohit Sharma, JE</p>
                              <span className="text-[10px] text-emerald-400 font-medium">Ready for AE Scrutiny</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Works in offline caching mode. As soon as the engineer returns to site camp Wi-Fi or 4G, all entries sync directly into the Master Project e-MB with zero duplicate data entry.
                        </p>
                      </div>
                    )}

                    {/* CHAPTER 2: FORM 26 RA BILL GENERATION */}
                    {activeChapterIndex === 2 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="grid sm:grid-cols-2 gap-3">
                          {/* Financial Summary */}
                          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="font-bold text-slate-200">Statutory Deductions &amp; Taxes</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                                RA Bill #04
                              </span>
                            </div>
                            <div className="space-y-1.5 text-[11px] divide-y divide-slate-800/40">
                              <div className="flex justify-between pt-1">
                                <span className="text-slate-400">Gross Value of Work Executed:</span>
                                <span className="font-mono font-bold text-white">₹3,42,80,000</span>
                              </div>
                              <div className="flex justify-between pt-1 text-rose-400">
                                <span>Less 5% Retention Money:</span>
                                <span className="font-mono">- ₹17,14,000</span>
                              </div>
                              <div className="flex justify-between pt-1 text-rose-400">
                                <span>Less Mobilization Advance Recovery (10%):</span>
                                <span className="font-mono">- ₹34,28,000</span>
                              </div>
                              <div className="flex justify-between pt-1 text-emerald-400">
                                <span>Add GST @ 18% (CGST + SGST):</span>
                                <span className="font-mono">+ ₹52,44,840</span>
                              </div>
                              <div className="flex justify-between pt-1.5 font-bold text-white text-xs border-t border-slate-700">
                                <span>Net Amount Payable:</span>
                                <span className="font-mono text-emerald-400 text-sm">₹3,43,82,840</span>
                              </div>
                            </div>
                          </div>

                          {/* 1-Click Export Actions */}
                          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                <span>✓ CPWD Form 26 Auto-Populated</span>
                              </div>
                              <h5 className="text-sm font-bold text-white mt-2">Zero Reconciliation Discrepancies</h5>
                              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                                Form 26 is automatically generated with cross-referenced e-MB page numbers and item SOR codes. Prevents accounts audit objections before submission.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download Form 26 PDF</span>
                              </button>
                              <span className="text-[10px] text-slate-400">Audit-ready format</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CHAPTER 3: CONTRACTIQ & LEGAL DEFENSE */}
                    {activeChapterIndex === 3 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                AI
                              </div>
                              <span className="text-xs font-bold text-indigo-200">
                                ContractIQ GCC Dispute Defense Engine
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-300">
                              Citing CPWD GCC Clause 8.4 &amp; 10CC
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                Issue Logged at Site
                              </p>
                              <p className="text-[11px]">
                                Department failed to clear 42-day forest clearance at Ch 24+000, issuing delay notice against contractor.
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-indigo-900/40 border border-indigo-600/40 text-slate-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                  Generated Defense Letter (EOT Claim)
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                  Liquidated Damages Shielded
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed italic text-indigo-100">
                                &quot;Pursuant to GCC Clause 8.4 (Right of Way), unhindered possession of Chainage 24+000 was delivered with 42 days delay. The critical path was obstructed by department actions. Contractor hereby claims 30 calendar days Extension of Time without penalty.&quot;
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>Clause 10CC Escalation Rate: Bitumen Index +14.2%</span>
                          <span className="font-semibold text-emerald-400">Escalation Claim: ₹24,60,000 Verified</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 5. SUBTITLE & VOICE CAPTION TICKER ─────────────── */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  CC
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Narration Transcript (Chapter {activeChapterIndex + 1} of 4)
                  </p>
                  <p className="text-slate-200 text-xs sm:text-[13px] leading-relaxed mt-0.5 font-medium">
                    &ldquo;{activeChapter.speechText}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* ── 6. TIMELINE SCRUBBER & PLAYBACK CONTROLS ─────────── */}
            <div className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-3.5 space-y-3">
              {/* Timeline Track */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{formatTime(currentTimeSec)}</span>
                  <span className="text-slate-500 font-sans text-[10px]">
                    3-Minute Complete Walkthrough ({Math.round((currentTimeSec / TOTAL_DURATION_SEC) * 100)}%)
                  </span>
                  <span>{formatTime(TOTAL_DURATION_SEC)}</span>
                </div>
                <div
                  className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const pct = Math.max(0, Math.min(1, clickX / rect.width))
                    const targetSec = pct * TOTAL_DURATION_SEC
                    setCurrentTimeSec(targetSec)
                    const newIndex = CHAPTERS.findIndex(
                      (c) => targetSec >= c.startSec && targetSec < c.startSec + c.durationSec
                    )
                    if (newIndex !== -1) {
                      setActiveChapterIndex(newIndex)
                      if (voiceEnabled) speakChapterNarration(newIndex)
                    }
                  }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-100"
                    style={{ width: `${(currentTimeSec / TOTAL_DURATION_SEC) * 100}%` }}
                  />
                </div>
              </div>

              {/* Controls & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Media Buttons */}
                <div className="flex items-center gap-2">
                  {/* Prev Chapter */}
                  <button
                    type="button"
                    onClick={() => jumpToChapter(Math.max(0, activeChapterIndex - 1))}
                    disabled={activeChapterIndex === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                    title="Previous Chapter"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Play / Pause */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlaying && currentTimeSec >= TOTAL_DURATION_SEC) {
                        jumpToChapter(0)
                      } else {
                        setIsPlaying(!isPlaying)
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <span>⏸</span>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span>
                        <span>{currentTimeSec >= TOTAL_DURATION_SEC ? 'Replay' : 'Play'}</span>
                      </>
                    )}
                  </button>

                  {/* Next Chapter */}
                  <button
                    type="button"
                    onClick={() => jumpToChapter(Math.min(CHAPTERS.length - 1, activeChapterIndex + 1))}
                    disabled={activeChapterIndex === CHAPTERS.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                    title="Next Chapter"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Speed Switcher */}
                  <button
                    type="button"
                    onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : 1)}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                    title="Toggle Playback Speed"
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                {/* Conversion Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    href="/sign-up"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 transition-all"
                  >
                    <span>Start 7-Day Free Trial</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

