'use client'

import Link from 'next/link'

interface WalkthroughModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

const CHAPTERS = [
  { time: '0:00', title: 'Tender BOQ Setup' },
  { time: '0:40', title: 'Offline Digital e-MB' },
  { time: '1:20', title: 'Form 26 RA Bill Auto-Gen' },
  { time: '2:05', title: 'ContractIQ Legal Defense' },
]

export function WalkthroughModal({ isOpen, onClose, videoUrl = '' }: WalkthroughModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full text-white overflow-hidden flex flex-col my-auto">
        {/* ── 1. MODAL HEADER ─────────────────────────────────── */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-600/30">
              ▶
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                PillarPro 3-Minute Product Walkthrough
              </h3>
              <p className="text-[11px] text-slate-400">
                Tender BOQ &rarr; Digital e-MB &rarr; Form 26 RA Bill &rarr; Delay Defense
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── 2. VIDEO DISPLAY AREA (16:9) ────────────────────── */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative flex flex-col items-center justify-center text-center">
            {videoUrl ? (
              videoUrl.endsWith('.mp4') ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <iframe
                  src={videoUrl}
                  title="PillarPro 3-Minute Walkthrough"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div className="p-6 max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg">
                  <svg className="w-8 h-8 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Official 3-Minute Video Walkthrough
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Watch how Indian civil contractors manage sanctioned BOQ rates, record mobile e-MBs offline, and generate statutory CPWD Form 26 bills.
                  </p>
                </div>

                {/* 4 Clean Chapter Milestones */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-left">
                  {CHAPTERS.map((ch) => (
                    <div
                      key={ch.title}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-300 font-medium truncate">{ch.title}</span>
                      <span className="font-mono text-[10px] text-blue-400 shrink-0 ml-1">{ch.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. MODAL FOOTER ─────────────────────────────────── */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            No credit card needed • 7-day free trial on pillarprojk.com
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <Link
              href="/sign-up"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm active:scale-95 transition-all"
            >
              <span>Try Live for Free</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
