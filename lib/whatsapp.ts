import { formatINR } from './format'

/**
 * Encodes text and generates a WhatsApp Web / App share URL.
 * If phone is provided, formats with international dialing code (defaulting to +91 India).
 */
export function getWhatsAppUrl(text: string, phone?: string | null): string {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone
  }

  const encoded = encodeURIComponent(text)
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`
  }
  return `https://api.whatsapp.com/send?text=${encoded}`
}

export function shareOnWhatsApp(text: string, phone?: string | null): void {
  const url = getWhatsAppUrl(text, phone)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// Backward-compatible alias
export const openWhatsApp = shareOnWhatsApp

/**
 * Format Daily Progress Report (DPR) summary for WhatsApp
 */
export function formatDPRWhatsAppMessage(params: {
  projectName: string
  reportDate: string
  weather: string
  workCompletedNotes: string
  manpowerTotal: number
  masons: number
  labourers: number
  machineryCount: number
  impediments?: string | null
  submittedBy?: string | null
}): string {
  const lines = [
    `*DAILY PROGRESS REPORT (DPR)*`,
    `*Project:* ${params.projectName}`,
    `*Date:* ${params.reportDate}`,
    `*Weather:* ${params.weather.replace(/_/g, ' ').toUpperCase()}`,
    `--------------------------------`,
    `*Site Manpower:*`,
    `• Total Workers: ${params.manpowerTotal}`,
    `• Masons: ${params.masons} | Labourers: ${params.labourers}`,
    `• Active Machinery: ${params.machineryCount} units`,
    `--------------------------------`,
    `*Work Executed Today:*`,
    params.workCompletedNotes,
  ]

  if (params.impediments && params.impediments.trim()) {
    lines.push(`--------------------------------`)
    lines.push(`*Site Impediments / Delays:*`)
    lines.push(params.impediments)
  }

  lines.push(`--------------------------------`)
  lines.push(`_Generated via PillarPro Construction ERP_`)

  return lines.join('\n')
}

/**
 * Format Supplier Khata Balance Confirmation for WhatsApp
 */
export function formatSupplierKhataWhatsAppMessage(params: {
  supplierName: string
  firmName?: string
  totalProcured: number
  totalPaid: number
  balanceOwed: number
  asOfDate?: string
}): string {
  const dateStr = params.asOfDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const firm = params.firmName || 'Our Firm'

  return [
    `*LEDGER BALANCE CONFIRMATION*`,
    `*To:* ${params.supplierName}`,
    `*From:* ${firm}`,
    `*As of Date:* ${dateStr}`,
    `--------------------------------`,
    `• Total Materials Procured: ${formatINR(params.totalProcured)}`,
    `• Total Payments Released: ${formatINR(params.totalPaid)}`,
    `• *Net Balance Outstanding: ${formatINR(params.balanceOwed)}*`,
    `--------------------------------`,
    `Please verify against your records. For queries, contact account department.`,
    `_PillarPro Civil Contractor Operating System_`,
  ].join('\n')
}

// Backward-compatible helper for SupplierStatementButton
export function generateSupplierKhataWhatsAppText(
  supplier: { name: string; contact_number?: string | null },
  totals: { totalProcured: number; totalPaid: number; balanceOwed: number },
  org?: { name?: string }
): string {
  return formatSupplierKhataWhatsAppMessage({
    supplierName: supplier.name,
    firmName: org?.name,
    totalProcured: totals.totalProcured,
    totalPaid: totals.totalPaid,
    balanceOwed: totals.balanceOwed,
  })
}

/**
 * Format Running Account (RA) Bill status for WhatsApp
 */
export function formatRABillWhatsAppMessage(params: {
  projectName: string
  billNumber: string
  submissionDate: string
  workCertified: number
  statutoryDeductions: number
  netPassed: number
  receivedAmount: number
  balanceReceivable: number
}): string {
  return [
    `*RUNNING ACCOUNT (RA) BILL UPDATE*`,
    `*Project:* ${params.projectName}`,
    `*Bill No:* ${params.billNumber}`,
    `*Submission Date:* ${params.submissionDate}`,
    `--------------------------------`,
    `• Gross Work Certified: ${formatINR(params.workCertified)}`,
    `• Statutory Deductions (TDS/Retention): ${formatINR(params.statutoryDeductions)}`,
    `• Net Sanctioned Payable: ${formatINR(params.netPassed)}`,
    `• Realized Bank Receipts: ${formatINR(params.receivedAmount)}`,
    `• *Pending Balance Receivable: ${formatINR(params.balanceReceivable)}*`,
    `--------------------------------`,
    `_PillarPro Treasury & RA Billing Engine_`,
  ].join('\n')
}

// Backward-compatible helper for RABillsClient
export function generateRABillWhatsAppText(bill: any, org?: any): string {
  const isCum = bill.billing_mode === 'cumulative'
  const workCertified = isCum && bill.this_bill_work_certified != null
    ? Number(bill.this_bill_work_certified)
    : Number(bill.work_certified_amount)
  const retention = Number(bill.retention_amount) || 0
  const tds = Number(bill.tds_deducted) || 0
  const gstTds = Number(bill.gst_tds_deducted) || 0
  const cess = Number(bill.labour_cess_deducted) || 0
  const other = Number(bill.other_deductions) || 0
  const totalDeductions = Number(bill.total_deductions) || (retention + tds + gstTds + cess + other)
  const netPassed = bill.net_payable_this_bill != null
    ? Number(bill.net_payable_this_bill)
    : (Number(bill.net_payable_amount) || (workCertified - retention))
  const received = Number(bill.amount_received) || 0
  const balance = Math.max(0, netPassed - received)

  return formatRABillWhatsAppMessage({
    projectName: bill.projects?.name || 'Civil Project',
    billNumber: bill.bill_number,
    submissionDate: bill.submission_date,
    workCertified,
    statutoryDeductions: totalDeductions,
    netPassed,
    receivedAmount: received,
    balanceReceivable: balance,
  })
}

// Backward-compatible helper for AttendanceClient
export function generateMusterRollWhatsAppText(
  dateStr: string,
  projectName: string,
  onSiteCount: number,
  dayCost: number,
  org?: { name?: string }
): string {
  const firm = org?.name || 'Our Firm'
  return [
    `*DAILY MUSTER ROLL & LABOR DEPLOYMENT*`,
    `*Firm:* ${firm}`,
    `*Project:* ${projectName}`,
    `*Date:* ${dateStr}`,
    `--------------------------------`,
    `• Workers on Site: ${onSiteCount}`,
    `• Estimated Daily Wage Accrual: ${formatINR(dayCost)}`,
    `--------------------------------`,
    `_PillarPro Civil Contractor Operating System_`,
  ].join('\n')
}
