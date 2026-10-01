'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ContractAiDrawer, ProjectOption } from './ContractAiDrawer'
import { PlanTier } from '@/lib/subscription'

interface GlobalContractCopilotProps {
  projects: ProjectOption[]
  userPlanTier?: PlanTier
}

export function GlobalContractCopilot({
  projects,
  userPlanTier = 'growth',
}: GlobalContractCopilotProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // If user is currently browsing inside /contract-ai, hide the floating button to avoid redundancy
  if (pathname.startsWith('/contract-ai')) {
    return null
  }

  // Detect if user is currently inside a project route (/projects/[id]/...)
  let activeProjectId: string | undefined = undefined
  const projectMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)/)
  if (projectMatch && projectMatch[1] && projectMatch[1] !== 'new') {
    const matchedId = projectMatch[1]
    const exists = projects.find((p) => p.id === matchedId)
    if (exists) {
      activeProjectId = matchedId
    }
  }

  // If no project from URL, default to the first project in list
  if (!activeProjectId && projects.length > 0) {
    activeProjectId = projects[0].id
  }

  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <>
      {/* Floating Action Button - Compact bottom right corner */}
      {!drawerOpen && (
        <div className="fixed bottom-18 md:bottom-5 right-3.5 md:right-5 z-40 print:hidden animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="group flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-slate-700/90 ring-2 ring-blue-500/20 focus:outline-none"
            aria-label="Open ContractIQ Assistant"
            title="ContractIQ AI Assistant"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600/40 flex items-center justify-center shrink-0">
              <svg
                className="w-3 h-3 text-blue-300 group-hover:rotate-12 transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-tight text-slate-100">ContractIQ</span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30 font-mono">
              AI
            </span>
          </button>
        </div>
      )}

      {/* Global ContractIQ Drawer */}
      <ContractAiDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={activeProjectId}
        projectName={activeProject?.name}
        contractNumber={activeProject?.contract_number || undefined}
        userPlanTier={userPlanTier}
        projects={projects}
        onSelectProject={(newId) => {
          // Keep active project in sync
        }}
      />
    </>
  )
}

