'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PrintPreviewModal } from '@/components/pdf/PrintPreviewModal'
import { ContractorLedgerPDF } from '@/components/pdf/ContractorLedgerPDF'
import { RetentionClaimLetterPDF } from '@/components/pdf/RetentionClaimLetterPDF'
import { exportContractorLedgerCSV } from '@/lib/export/csv'
import {
  generateContractorLedger,
  calculateDLPSummary,
  RawLedgerBill,
  RawLedgerPayment,
} from '@/lib/calculations/contractorLedger'
import { getClientOrganization, OrganizationProfile, DEFAULT_ORGANIZATION } from '@/lib/organization'
import { DLPItem, RetentionRefundClaim } from '@/lib/types/contractorLedger'

interface ProjectLedgerClientProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount: number
  }
  bills: RawLedgerBill[]
  payments: RawLedgerPayment[]
}

export function ProjectLedgerClient({
  project,
  bills,
  payments,
}: ProjectLedgerClientProps) {
  const [org, setOrg] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION)
  const [filterType, setFilterType] = useState<'all' | 'bills' | 'payments'>('all')
  const [showLedgerPdf, setShowLedgerPdf] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<RetentionRefundClaim | null>(null)

  useEffect(() => {
    getClientOrganization().then(setOrg)
  }, [])

  // Synthesize ledger summary and running balance
  const ledger = useMemo(() => {
    return generateContractorLedger(bills, payments)
  }, [bills, payments])

  // Evaluate DLP milestones for final bills
  const dlpItems: DLPItem[] = useMemo(() => {
    return calculateDLPSummary(bills, {
      projectName: project.name,
      agencyName: project.agency_name,
    })
  }, [bills, project.name, project.agency_name])

  // Filtered transactions for the view
  const filteredTransactions = useMemo(() => {
    if (filterType === 'bills') {
      return ledger.transactions.filter(t => t.type === 'bill_passed')
    }
    if (filterType === 'payments') {
      return ledger.transactions.filter(t => t.type === 'payment_voucher')
    }
    return ledger.transactions
  }, [ledger.transactions, filterType])

  const handleExportCSV = () => {
    exportContractorLedgerCSV(project.name, ledger.transactions, {
      totalGross: ledger.totalGrossCertified,
      totalBank: ledger.totalBankDisbursed,
      totalDeductions: ledger.totalAllDeductions,
      netBalance: ledger.netBalanceOutstanding,
    })
  }

  const handleOpenClaimLetter = (item: DLPItem) => {
    const matchingBill = bills.find(b => b.id === item.billId)
    setSelectedClaim({
      contractorName: org.name || 'Contractor Agency',
      contractorAddress: org.address || null,
      contractorPanGst: org.gstin || org.registration_no || null,
      clientDepartment: project.agency_name || 'State Public Works Department',
      divisionOffice: project.agency_name ? `${project.agency_name} Division` : 'Public Works Division',
      projectName: project.name,
      agreementNumber: 'Sanctioned Contract Agreement',
      finalBillNumber: item.billNumber,
      finalBillDate: matchingBill?.submission_date || item.actualCompletionDate,
      actualCompletionDate: item.actualCompletionDate,
      dlpMonths: item.dlpMonths,
      dlpExpiryDate: item.dlpExpiryDate,
      retentionAmountToRelease: item.retentionAmount,
      bankAccountDetails: {
        accountNumber: 'As on Record with Division',
        ifscCode: 'RTGS / PFMS Registered',
        bankName: 'Scheduled Commercial Bank',
      },
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href={`/projects/${project.id}`} className="hover:text-slate-900 transition-colors">
          ← Back to {project.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Contractor’s Running Ledger</span>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Contractor’s Running Ledger (CPWA Form 43)
            </h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
              P.W.A. 14
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personal ledger account of certified bills, deductions withheld, and realized treasury payment tranches
            {project.agency_name ? ` • Division: ${project.agency_name}` : ''}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={ledger.transactions.length === 0}
            className="text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel (CSV)
          </Button>

          <Button
            size="sm"
            onClick={() => setShowLedgerPdf(true)}
            disabled={ledger.transactions.length === 0}
            className="bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Form 43 PDF
          </Button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Work Certified */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Work Certified</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatINR(ledger.totalGrossCertified)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Account I (Gross Billed)
          </p>
        </div>

        {/* Realized Bank Receipts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Treasury Realized</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
            {formatINR(ledger.totalBankDisbursed)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Net cash credited to bank
          </p>
        </div>

        {/* Locked Retention */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Retention Withheld (DLP)</p>
          <p className="text-xl font-bold text-amber-800 mt-1 tabular-nums">
            {formatINR(ledger.totalRetentionHeld)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Locked Govt Security Deposit
          </p>
        </div>

        {/* Net Outstanding Balance */}
        <div className="bg-white rounded-xl border border-blue-200 border-l-4 border-l-blue-600 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">Net Overdue Balance</p>
          <p className="text-xl font-bold text-blue-800 mt-1 tabular-nums">
            {formatINR(ledger.netBalanceOutstanding)}
          </p>
          <p className="text-[11px] text-blue-600 mt-0.5 font-medium">
            Pending release by division
          </p>
        </div>
      </div>

      {/* DLP & Retention Money Recovery Banner (if Final Bill exists) */}
      {dlpItems.length > 0 && (
        <div className="space-y-3">
          {dlpItems.map((item, idx) => {
            const isDue = item.status === 'refund_due_now'
            const isSoon = item.status === 'expiring_soon'

            return (
              <div
                key={idx}
                className={`rounded-xl border p-4 transition-all ${
                  isDue
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                    : isSoon
                    ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{isDue ? '🎉' : isSoon ? '⏳' : '🔒'}</span>
                      <span className="font-bold text-sm">
                        Defect Liability Period (DLP) Milestone — {item.billNumber}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          isDue
                            ? 'bg-emerald-200 text-emerald-900'
                            : isSoon
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isDue ? 'Retention Refund Due Now' : isSoon ? 'Expiring Soon' : 'Locked Under DLP'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Completed on <strong>{formatDate(item.actualCompletionDate)}</strong> • DLP Duration: <strong>{item.dlpMonths} Months</strong> • Expiry Date: <strong>{formatDate(item.dlpExpiryDate)}</strong>
                    </p>
                    <p className="text-xs font-semibold text-slate-900">
                      Withheld Security Deposit Amount: <span className="font-mono text-emerald-800 text-sm">{formatINR(item.retentionAmount)}</span>
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleOpenClaimLetter(item)}
                      className={`text-xs font-semibold ${
                        isDue
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-slate-900 hover:bg-black text-white'
                      }`}
                    >
                      Generate Refund Claim Letter
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
        <span className="text-slate-500 font-semibold">Filter:</span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-slate-900 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Transactions ({ledger.transactions.length})
        </button>
        <button
          onClick={() => setFilterType('bills')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'bills'
              ? 'bg-slate-900 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Bills Certified ({ledger.transactions.filter(t => t.type === 'bill_passed').length})
        </button>
        <button
          onClick={() => setFilterType('payments')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'payments'
              ? 'bg-slate-900 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Treasury Receipts ({ledger.transactions.filter(t => t.type === 'payment_voucher').length})
        </button>
      </div>

      {/* Ledger Table */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            title="No Ledger Transactions Recorded"
            description="Submit an RA bill or log a treasury payment tranche to start building the official CPWA Form 43 running ledger for this work."
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3">Voucher / Bill Ref</th>
                  <th className="p-3 text-right w-28">Gross Certified</th>
                  <th className="p-3 text-right w-24">Advance</th>
                  <th className="p-3 text-right w-28">Deductions</th>
                  <th className="p-3 text-right w-28">Bank Paid</th>
                  <th className="p-3 text-right w-32">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      tx.type === 'bill_passed' ? 'hover:bg-slate-50' : 'bg-emerald-50/20 hover:bg-emerald-50/40'
                    }`}
                  >
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{tx.voucher_or_bill_number}</span>
                        {tx.bill_type === 'final' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase">
                            Final Bill (27-B)
                          </span>
                        )}
                        {tx.bill_type === 'first_and_final' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold uppercase">
                            1st & Final (24)
                          </span>
                        )}
                        {tx.type === 'payment_voucher' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                            Treasury Credit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tx.description}</p>
                      {tx.mb_reference && (
                        <p className="text-[10px] text-blue-700 font-mono mt-0.5">{tx.mb_reference}</p>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {tx.gross_work_certified > 0 ? formatINR(tx.gross_work_certified) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700 tabular-nums">
                      {tx.advance_payments > 0 ? formatINR(tx.advance_payments) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-red-600 tabular-nums">
                      {tx.total_deductions > 0 ? `(-) ${formatINR(tx.total_deductions)}` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {tx.bank_payment_disbursed > 0 ? formatINR(tx.bank_payment_disbursed) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 tabular-nums">
                      {formatINR(tx.running_balance_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-[10px]">
                    Total Contract Position
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900">
                    {formatINR(ledger.totalGrossCertified)}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    {formatINR(ledger.totalAdvancesGranted)}
                  </td>
                  <td className="p-3 text-right font-mono text-red-600">
                    (-) {formatINR(ledger.totalAllDeductions)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-700">
                    {formatINR(ledger.totalBankDisbursed)}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-blue-800 text-sm">
                    {formatINR(ledger.netBalanceOutstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Print Preview Modal for Form 43 */}
      {showLedgerPdf && (
        <PrintPreviewModal
          open={showLedgerPdf}
          onClose={() => setShowLedgerPdf(false)}
          title={`Contractor’s Running Ledger — ${project.name}`}
          subtitle="Official CPWA Form 43 (P.W.A. 14) Statement of Accounts"
        >
          <ContractorLedgerPDF
            projectName={project.name}
            agencyName={project.agency_name}
            awardedAmount={project.awarded_amount}
            ledger={ledger}
            organization={org}
          />
        </PrintPreviewModal>
      )}

      {/* Print Preview Modal for Retention Refund Claim Letter */}
      {selectedClaim && (
        <PrintPreviewModal
          open={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title={`Retention Refund Claim Letter — ${selectedClaim.finalBillNumber}`}
          subtitle={`Statutory Claim for Release of ${formatINR(selectedClaim.retentionAmountToRelease)}`}
        >
          <RetentionClaimLetterPDF
            claim={selectedClaim}
            organization={org}
          />
        </PrintPreviewModal>
      )}
    </div>
  )
}
