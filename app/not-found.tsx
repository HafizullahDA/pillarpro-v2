import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
        {/* Brand Icon / 404 Indicator */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 text-blue-600 shadow-xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-3 border border-blue-200">
          404 Error
        </span>

        <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The project, bill, record, or route you are attempting to view does not exist, may have been archived, or you may not have authorization to view it.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row w-full gap-3">
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>

          <Link
            href="/projects"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xs"
          >
            <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            All Projects
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center">
          <span className="text-xs text-slate-400 font-medium">
            PillarPro Construction ERP
          </span>
        </div>
      </div>
    </div>
  )
}

