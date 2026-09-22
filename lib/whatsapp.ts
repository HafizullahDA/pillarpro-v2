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
  billType?: string
  mbNumber?: string | null
  mbPageRange?: string | null
  submissionDate: string
  workCertified: number
  statutoryDeductions: number
  netPassed: number
  receivedAmount: number
  balanceReceivable: number
}): string {
  const isFinal = params.billType === 'final'
  const isFirstAndFinal = params.billType === 'first_and_final'
  const billTitle = isFinal
    ? '*FINAL BILL (FORM CPWA 27-B)*'
    : isFirstAndFinal
    ? '*FIRST & FINAL BILL (FORM CPWA 24)*'
    : '*RUNNING ACCOUNT (RA) BILL UPDATE*'

  const lines = [
    billTitle,
    `*Project:* ${params.projectName}`,
    `*Bill No:* ${params.billNumber}`,
  ]

  if (params.mbNumber) {
    lines.push(`*e-MB Ref:* MB #${params.mbNumber}${params.mbPageRange ? ` (${params.mbPageRange})` : ''}`)
  }

  lines.push(
    `*Submission Date:* ${params.submissionDate}`,
    `--------------------------------`,
    `• Gross Work Certified: ${formatINR(params.workCertified)}`,
    `• Statutory Deductions & Recoveries: ${formatINR(params.statutoryDeductions)}`,
    `• Net Sanctioned Payable: ${formatINR(params.netPassed)}`,
    `• Realized Bank Receipts: ${formatINR(params.receivedAmount)}`,
    `• *Pending Balance Receivable: ${formatINR(params.balanceReceivable)}*`,
    `--------------------------------`,
    `_PillarPro Treasury & RA Billing Engine_`
  )

  return lines.join('\n')
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
  const cement = Number(bill.cement_recovery) || 0
  const steel = Number(bill.steel_recovery) || 0
  const otherMat = Number(bill.other_material_recovery) || 0
  const totalDeductions = Number(bill.total_deductions) || (retention + tds + gstTds + cess + other + cement + steel + otherMat)
  const netPassed = bill.net_payable_this_bill != null
    ? Number(bill.net_payable_this_bill)
    : (Number(bill.net_payable_amount) || (workCertified - retention - cement - steel - otherMat))
  const received = Number(bill.amount_received) || 0
  const balance = Math.max(0, netPassed - received)

  const mbPageRange = bill.mb_page_start
    ? `Pages ${bill.mb_page_start} to ${bill.mb_page_end || bill.mb_page_start}`
    : null

  return formatRABillWhatsAppMessage({
    projectName: bill.projects?.name || 'Civil Project',
    billNumber: bill.bill_number,
    billType: bill.bill_type,
    mbNumber: bill.mb_number,
    mbPageRange,
    submissionDate: bill.submission_date,
    workCertified,
    statutoryDeductions: totalDeductions,
    netPassed,
    receivedAmount: received,
    balanceReceivable: balance,
  })
}

export interface MonthlyMusterRollWorkerEntry {
  name: string
  trade?: string | null
  daily_wage_rate?: number | null
  fullDays?: number
  halfDays?: number
  overtimeHours?: number
  totalDays: number
  totalWage: number
}

/**
 * Format Monthly Labor Muster Roll & Wage Sheet for WhatsApp
 */
export function generateMonthlyMusterRollWhatsAppText(params: {
  monthName: string
  year: number
  projectName: string
  org?: { name?: string | null; legal_name?: string | null } | null
  workers: MonthlyMusterRollWorkerEntry[]
  totalDays: number
  totalWages: number
}): string {
  const firm = params.org?.name || params.org?.legal_name || 'Our Firm'
  const lines = [
    `*MONTHLY LABOR MUSTER ROLL & WAGE SHEET*`,
    `*Firm:* ${firm}`,
    `*Project:* ${params.projectName}`,
    `*Period:* ${params.monthName} ${params.year}`,
    `--------------------------------`,
    `*Total Workforce:* ${params.workers.length} Workers`,
    `*Total Work Days:* ${params.totalDays} Days`,
    `*Gross Wages Payable:* ${formatINR(params.totalWages)}`,
    `--------------------------------`,
    `*WORKER BREAKDOWN:*`,
  ]

  if (params.workers.length === 0) {
    lines.push(`(No worker records recorded for this period)`)
  } else {
    params.workers.forEach((w, idx) => {
      const trade = w.trade ? ` (${w.trade})` : ''
      const parts: string[] = []
      if (w.fullDays != null && w.fullDays > 0) parts.push(`${w.fullDays}P`)
      if (w.halfDays != null && w.halfDays > 0) parts.push(`${w.halfDays}H`)
      if (w.overtimeHours != null && w.overtimeHours > 0) parts.push(`${w.overtimeHours}h OT`)
      const breakdownStr = parts.length > 0 ? ` (${parts.join(', ')})` : ''
      const daysDesc = `Days: ${w.totalDays}${breakdownStr}`
      const rate = formatINR(w.daily_wage_rate ?? 0)
      const payable = formatINR(w.totalWage)
      lines.push(`${idx + 1}. *${w.name}*${trade}`)
      lines.push(`   • ${daysDesc} | Rate: ${rate} | Payable: ${payable}`)
    })
  }

  lines.push(`--------------------------------`)
  lines.push(`*CONSOLIDATED TOTAL:* ${params.totalDays} Days | ${formatINR(params.totalWages)}`)
  lines.push(`_PillarPro Civil Contractor Operating System_`)

  return lines.join('\n')
}

// Backward-compatible helper for AttendanceClient
export function generateMusterRollWhatsAppText(
  dateStr: string,
  projectName: string,
  onSiteCount: number,
  dayCost: number,
  org?: { name?: string | null; legal_name?: string | null } | null,
  activeWorkers?: Array<{ name: string; trade?: string | null; status: string; daily_wage_rate?: number | null; overtimeHours?: number }>
): string {
  const firm = org?.name || org?.legal_name || 'Our Firm'
  const lines = [
    `*DAILY MUSTER ROLL & LABOR DEPLOYMENT*`,
    `*Firm:* ${firm}`,
    `*Project:* ${projectName}`,
    `*Date:* ${dateStr}`,
    `--------------------------------`,
    `• Workers on Site: ${onSiteCount}`,
    `• Estimated Daily Wage Accrual: ${formatINR(dayCost)}`,
  ]

  if (activeWorkers && activeWorkers.length > 0) {
    lines.push(`--------------------------------`)
    lines.push(`*ON-SITE WORKERS:*`)
    activeWorkers.forEach((w, i) => {
      const tag = w.status === 'half_day' ? 'Half Day' : w.status === 'overtime' ? 'Overtime' : 'Present'
      const otTag = w.overtimeHours && w.overtimeHours > 0 ? ` (+${w.overtimeHours}h OT)` : ''
      lines.push(`${i + 1}. *${w.name}* (${w.trade || 'Worker'}) — ${tag}${otTag}`)
    })
  }

  lines.push(`--------------------------------`)
  lines.push(`_PillarPro Civil Contractor Operating System_`)

  return lines.join('\n')
}

