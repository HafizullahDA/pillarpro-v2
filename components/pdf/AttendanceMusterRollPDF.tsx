'use client'

import { formatINR } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'

type Worker = {
  id: string
  name: string
  trade: string | null
  daily_wage_rate: number | null
}

type MonthAttendanceRow = {
  worker_id: string
  date: string
  status: string
}

interface AttendanceMusterRollPDFProps {
  projectName: string
  month: number
  year: number
  monthName: string
  workers: Worker[]
  monthAttendance: MonthAttendanceRow[]
  organization?: OrganizationProfile
}

export function AttendanceMusterRollPDF({
  projectName,
  monthName,
  year,
  workers,
  monthAttendance,
  organization,
}: AttendanceMusterRollPDFProps) {
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  // Calculate worker totals
  let grandTotalDays = 0
  let grandTotalWages = 0

  const workerStats = workers.map(w => {
    const records = monthAttendance.filter(r => r.worker_id === w.id)
    const fullDays = records.filter(r => r.status === 'present').length
    const halfDays = records.filter(r => r.status === 'half_day').length
    const totalDays = fullDays + halfDays * 0.5
    const rate = w.daily_wage_rate ?? 0
    const totalWage = totalDays * rate

    grandTotalDays += totalDays
    grandTotalWages += totalWage

    return {
      ...w,
      fullDays,
      halfDays,
      totalDays,
      totalWage,
    }
  })

  return (
    <div className="text-slate-900 font-sans leading-relaxed">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
              {organization?.name || 'Civil Engineering & Construction'}
            </h1>
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-slate-600 mt-1">
              {organization?.registration_no && (
                <span className="font-semibold text-slate-800">{organization.registration_no}</span>
              )}
              {organization?.gstin && (
                <span>· GSTIN: <strong className="font-mono text-slate-800">{organization.gstin}</strong></span>
              )}
              {organization?.address && (
                <span>· {organization.address}</span>
              )}
            </div>
            <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase mt-2">
              Labor Attendance Muster Roll & Wage Sheet
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p><strong>Month:</strong> {monthName} {year}</p>
            <p><strong>Generated:</strong> {generatedAt}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap justify-between text-xs">
          <div>
            <span className="text-slate-500">Project / Site:</span>{' '}
            <strong className="text-slate-900 font-semibold">{projectName}</strong>
          </div>
          <div>
            <span className="text-slate-500">Period:</span>{' '}
            <strong>01 {monthName} {year} – End of Month</strong>
          </div>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Workforce</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{workers.length} Workers</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Work Days</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{grandTotalDays} Days</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gross Wages Payable</p>
          <p className="text-lg font-black text-blue-700 mt-0.5">{formatINR(grandTotalWages)}</p>
        </div>
      </div>

      {/* Muster Roll Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Worker Name</th>
              <th className="py-2.5 px-3">Trade / Role</th>
              <th className="py-2.5 px-3 text-right">Daily Rate</th>
              <th className="py-2.5 px-2 text-center w-14">Full (P)</th>
              <th className="py-2.5 px-2 text-center w-14">Half (H)</th>
              <th className="py-2.5 px-3 text-center w-20">Days</th>
              <th className="py-2.5 px-3 text-right">Payable</th>
              <th className="py-2.5 px-3 text-center w-36">Signature / Thumb</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {workerStats.map((w, index) => (
              <tr key={w.id} className={index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                <td className="py-2 px-3 text-center font-mono text-slate-500">{index + 1}</td>
                <td className="py-2 px-3 font-semibold text-slate-900">{w.name}</td>
                <td className="py-2 px-3 text-slate-600">{w.trade ?? 'Worker'}</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-700">{formatINR(w.daily_wage_rate)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-slate-700">{w.fullDays}</td>
                <td className="py-2 px-2 text-center tabular-nums text-slate-700">{w.halfDays}</td>
                <td className="py-2 px-3 text-center font-bold text-slate-900 tabular-nums">
                  {w.totalDays}
                </td>
                <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                  {formatINR(w.totalWage)}
                </td>
                <td className="py-2 px-3 border-l border-slate-200 text-center">
                  <div className="h-7 border-b border-dashed border-slate-300 w-full" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
              <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                Consolidated Totals:
              </td>
              <td className="py-2.5 px-3 text-center font-black tabular-nums text-emerald-800">
                {grandTotalDays}
              </td>
              <td className="py-2.5 px-3 text-right font-black tabular-nums text-blue-800">
                {formatINR(grandTotalWages)}
              </td>
              <td className="py-2.5 px-3 border-l border-slate-200" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signature & Sign-off Block */}
      <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">Prepared By</p>
          <p className="text-[11px] text-slate-500">Site Supervisor</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">Verified By</p>
          <p className="text-[11px] text-slate-500">Project Accountant</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 mb-2" />
          <p className="font-bold text-slate-800">Approved By</p>
          <p className="text-[11px] text-slate-500">Project Manager / Owner</p>
        </div>
      </div>

      {/* Document Footer Notice */}
      <div className="mt-8 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        <span>Official wage & attendance record of {organization?.name || 'Contractor'}</span>
        <span>Powered by PillarPro Construction System</span>
      </div>
    </div>
  )
}
