/**
 * PillarPro CSV & Excel Export Engine
 * Generates RFC-4180 compliant CSVs with UTF-8 BOM for seamless opening in Microsoft Excel,
 * Google Sheets, and Tally without character or column formatting issues.
 */

import { roundToTwo } from '../calculations/financial'

export type CsvCellValue = string | number | boolean | null | undefined

/**
 * Escapes a single CSV cell following RFC 4180 rules.
 */
export function escapeCsvCell(val: CsvCellValue): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // If cell contains commas, quotes, carriage returns, or newlines, enclose in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Builds a valid CSV string with UTF-8 BOM.
 */
export function buildCsvString(headers: string[], rows: CsvCellValue[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const dataLines = rows.map(row => row.map(escapeCsvCell).join(','))
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) for Microsoft Excel compatibility
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n')
}

/**
 * Triggers a client-side file download in the browser.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. RA BILL REGISTER EXPORT (FOR PWD/CPWD AUDITS & CHARTERED ACCOUNTANTS)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableRABill {
  bill_number: string
  submission_date: string
  billing_mode?: 'standalone' | 'cumulative' | string
  work_certified_amount: number
  retention_percentage?: number
  retention_amount?: number
  net_payable_amount?: number
  net_payable_this_bill?: number
  this_bill_work_certified?: number
  amount_received: number
  tds_deducted?: number
  gst_tds_deducted?: number
  labour_cess_deducted?: number
  other_deductions?: number
  total_deductions?: number
  net_bank_received?: number
  status: string
  remarks?: string | null
  projects?: { name: string; agency_name?: string | null } | null
}

export function exportRABillsRegister(bills: ExportableRABill[], projectFilterName?: string): void {
  const headers = [
    'Bill Number',
    'Project Name',
    'Government Client / Agency',
    'Billing Mode',
    'Submission Date',
    'Work Certified (INR)',
    'Retention Percentage (%)',
    'Retention Deducted (INR)',
    'Net Payable / Passed (INR)',
    'Gross Released (INR)',
    'IT-TDS 2% Sec 194C (INR)',
    'GST-TDS 2% Sec 51 (INR)',
    'Labour Cess 1% (INR)',
    'Departmental Deductions (INR)',
    'Total Tax Deductions (INR)',
    'Net Bank Credit (INR)',
    'Outstanding Balance (INR)',
    'Payment Status',
    'Measurement / Audit Remarks',
  ]

  const rows: CsvCellValue[][] = bills.map(b => {
    const isCum = b.billing_mode === 'cumulative'
    const grossCertified = isCum && b.this_bill_work_certified != null
      ? roundToTwo(Number(b.this_bill_work_certified))
      : roundToTwo(Number(b.work_certified_amount) || 0)

    const retPct = Number(b.retention_percentage) || 5
    const retDeducted = isCum && b.this_bill_work_certified != null
      ? roundToTwo((Number(b.this_bill_work_certified) * retPct) / 100)
      : roundToTwo(Number(b.retention_amount) || 0)

    const netPassed = b.net_payable_this_bill != null
      ? roundToTwo(Number(b.net_payable_this_bill))
      : roundToTwo(Number(b.net_payable_amount) || (grossCertified - retDeducted))

    const grossReleased = roundToTwo(Number(b.amount_received) || 0)
    const itTds = roundToTwo(Number(b.tds_deducted) || 0)
    const gstTds = roundToTwo(Number(b.gst_tds_deducted) || 0)
    const labourCess = roundToTwo(Number(b.labour_cess_deducted) || 0)
    const otherDeds = roundToTwo(Number(b.other_deductions) || 0)
    const totalDeds = roundToTwo(Number(b.total_deductions) || (itTds + gstTds + labourCess + otherDeds))

    const netBankCash = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
      ? roundToTwo(Number(b.net_bank_received))
      : Math.max(0, roundToTwo(grossReleased - totalDeds))

    const outstanding = Math.max(0, roundToTwo(netPassed - grossReleased))

    const statusLabel = b.status === 'fully_paid'
      ? 'Fully Paid'
      : b.status === 'partially_paid'
      ? 'Partially Paid'
      : 'Submitted (Pending)'

    return [
      b.bill_number,
      b.projects?.name || 'Unassigned Project',
      b.projects?.agency_name || 'N/A',
      isCum ? 'Cumulative (Form 26)' : 'Standalone',
      b.submission_date || 'N/A',
      grossCertified,
      retPct,
      retDeducted,
      netPassed,
      grossReleased,
      itTds,
      gstTds,
      labourCess,
      otherDeds,
      totalDeds,
      netBankCash,
      outstanding,
      statusLabel,
      b.remarks || '',
    ]
  })

  const dateTag = new Date().toISOString().split('T')[0]
  const scopeTag = projectFilterName ? `_${projectFilterName.replace(/[^a-zA-Z0-9]/g, '_')}` : '_All_Projects'
  const filename = `RA_Bills_Register${scopeTag}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUPPLIER KHATA LEDGER STATEMENT EXPORT (CHRONOLOGICAL MATERIAL LEDGER)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableSupplier {
  name: string
  gst_number?: string | null
  contact_number?: string | null
  address?: string | null
}

export interface ExportableSupplierTx {
  date: string
  transaction_type: string // 'procurement' | 'payment'
  description?: string | null
  reference?: string | null
  amount: number
  quantity?: number | null
  rate?: number | null
  unit?: string | null
  mode?: string | null
  runningBalance?: number
  projects?: { name: string } | null
}

export function exportSupplierLedgerStatement(
  supplier: ExportableSupplier,
  transactions: ExportableSupplierTx[],
  totals: { totalProcured: number; totalPaid: number; balanceOwed: number }
): void {
  const headers = [
    'Date',
    'Project / Site',
    'Transaction Type',
    'Material / Item Description',
    'Invoice / Challan No.',
    'Quantity',
    'Unit',
    'Rate per Unit (INR)',
    'Material Procured / Debit (INR)',
    'Payment Made / Credit (INR)',
    'Payment Mode',
    'Running Balance Owed (INR)',
  ]

  const rows: CsvCellValue[][] = transactions.map(t => {
    const isProcurement = t.transaction_type?.toLowerCase() === 'procurement'
    const amt = roundToTwo(Number(t.amount) || 0)
    const debit = isProcurement ? amt : 0
    const credit = !isProcurement ? amt : 0
    const qty = t.quantity != null ? t.quantity : ''
    const rate = t.rate != null ? roundToTwo(Number(t.rate)) : ''

    return [
      t.date || 'N/A',
      t.projects?.name || 'General / Central Yard',
      isProcurement ? 'Material Procurement' : 'Vendor Payment',
      t.description || '',
      t.reference || '',
      qty,
      t.unit || '',
      rate,
      debit,
      credit,
      t.mode ? t.mode.replace(/_/g, ' ').toUpperCase() : '',
      roundToTwo(Number(t.runningBalance) || 0),
    ]
  })

  // Summary row at the bottom for Chartered Accountants
  rows.push([
    'TOTALS',
    '',
    '',
    'Total Summary Statement',
    '',
    '',
    '',
    '',
    roundToTwo(totals.totalProcured),
    roundToTwo(totals.totalPaid),
    '',
    roundToTwo(totals.balanceOwed),
  ])

  const dateTag = new Date().toISOString().split('T')[0]
  const cleanName = supplier.name.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Khata_${cleanName}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ALL SUPPLIERS DIRECTORY SUMMARY EXPORT (FOR GSTR-2B / ANNUAL AUDIT)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableSupplierSummaryRow {
  name: string
  gst_number: string | null
  contact_number: string | null
  address: string | null
  total_procured: number
  total_paid: number
  outstanding_balance: number
}

export function exportSuppliersSummary(suppliers: ExportableSupplierSummaryRow[]): void {
  const headers = [
    'Supplier / Vendor Name',
    'GSTIN',
    'Contact Number',
    'Address / Yard Location',
    'Total Material Procured (INR)',
    'Total Payments Released (INR)',
    'Current Balance Owed (INR)',
    'Account Status',
  ]

  let grandProcured = 0
  let grandPaid = 0
  let grandBalance = 0

  const rows: CsvCellValue[][] = suppliers.map(s => {
    const procured = roundToTwo(Number(s.total_procured) || 0)
    const paid = roundToTwo(Number(s.total_paid) || 0)
    const balance = roundToTwo(Number(s.outstanding_balance) || (procured - paid))

    grandProcured += procured
    grandPaid += paid
    grandBalance += balance

    const status = balance > 0 ? 'Payable Owed' : balance < 0 ? 'Advance Paid' : 'Settled (Nil)'

    return [
      s.name,
      s.gst_number || 'Unregistered',
      s.contact_number || '',
      s.address || '',
      procured,
      paid,
      balance,
      status,
    ]
  })

  // Grand totals row for CA GSTR reconciliation
  rows.push([
    'GRAND TOTALS',
    '',
    '',
    '',
    roundToTwo(grandProcured),
    roundToTwo(grandPaid),
    roundToTwo(grandBalance),
    '',
  ])

  const dateTag = new Date().toISOString().split('T')[0]
  const filename = `Suppliers_Ledger_Summary_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SITE EXPENSES & CASH BOOK EXPORT (FOR SITE COST & AUDIT LOGS)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportableExpenseRow {
  date: string
  description: string | null
  category: string
  amount: number
  payment_mode?: string
  receipt_url?: string | null
  projects?: { name: string } | null
  partners?: { name: string } | null
}

export function exportSiteExpenses(expenses: ExportableExpenseRow[], projectFilterName?: string): void {
  const headers = [
    'Date',
    'Project / Site',
    'Expense Category',
    'Description',
    'Amount (INR)',
    'Payment Mode',
    'Paid By Partner / Custodian',
    'Receipt Document Attached',
  ]

  let grandTotal = 0

  const rows: CsvCellValue[][] = expenses.map(e => {
    const amt = roundToTwo(Number(e.amount) || 0)
    grandTotal += amt

    return [
      e.date || 'N/A',
      e.projects?.name || 'General / Central Office',
      (e.category || 'other').toUpperCase(),
      e.description || '',
      amt,
      e.payment_mode ? e.payment_mode.replace(/_/g, ' ').toUpperCase() : 'CASH',
      e.partners?.name || 'Company Account',
      e.receipt_url ? 'Yes (Attached)' : 'No',
    ]
  })

  rows.push([
    'TOTAL EXPENDITURE',
    '',
    '',
    '',
    roundToTwo(grandTotal),
    '',
    '',
    '',
  ])

  const dateTag = new Date().toISOString().split('T')[0]
  const scopeTag = projectFilterName ? `_${projectFilterName.replace(/[^a-zA-Z0-9]/g, '_')}` : '_All_Projects'
  const filename = `Site_Expenses${scopeTag}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}
