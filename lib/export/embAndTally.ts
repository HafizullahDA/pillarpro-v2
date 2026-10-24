/**
 * PillarPro Public Works Department Export Engine
 * 1. Electronic Measurement Book (e-MB) Detail & Abstract Register (Excel / CSV)
 * 2. CPWA Form 26 RA Bill Abstract (Account I, II, III Audit Ledger)
 * 3. Tally Prime Accounting Vouchers (Double-entry CSV & XML for CA / ERP Import)
 */

import { roundToTwo, safeAdd, safeSub } from '../calculations/financial'
import { buildCsvString, triggerCsvDownload, CsvCellValue } from './csv'

/**
 * Triggers a client-side XML file download in the browser (for Tally Prime import).
 */
export function triggerXmlDownload(xmlContent: string, filename: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.xml') ? filename : `${filename}.xml`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Formats ISO or arbitrary date strings to Indian PWD standard DD/MM/YYYY.
 */
export function formatIndianDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const parts = String(dateStr).split('T')[0].split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ELECTRONIC MEASUREMENT BOOK (e-MB) DETAIL & ABSTRACT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface EMBExportParams {
  project: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount?: number
  }
  entries: {
    id: string
    entry_number: string
    page_number: number
    measurement_date: string
    location?: string | null
    description: string
    calculation_mode?: string
    number_of_units?: number
    length?: number
    breadth?: number
    depth_height?: number
    calculated_quantity: number
    unit: string
    status: string
    remarks?: string | null
    measurement_book_id?: string | null
    boq_item_id?: string
    measurement_rows?: {
      particulars?: string
      mode?: 'add' | 'deduct'
      nos?: number | null
      length?: number | null
      breadth?: number | null
      depthHeight?: number | null
      quantity: number
    }[] | null
    boq_items?: {
      item_number?: string
      description?: string
      unit?: string
      contract_quantity?: number
      contract_rate?: number
      contract_amount?: number
      awarded_rate?: number
    } | null
  }[]
  books?: {
    id: string
    book_number: string
    title?: string
  }[]
  boqItems?: {
    id: string
    item_number: string
    description: string
    unit: string
    contract_quantity?: number
    contract_rate?: number
    contract_amount?: number
  }[]
  abstractItems?: {
    boq_item_id: string
    item_number: string
    description: string
    unit: string
    contract_quantity: number
    contract_rate: number
    cumulative_quantity: number
    balance_quantity: number
    cumulative_amount: number
    certified_amount: number
    is_exceeded?: boolean
  }[]
}

export function exportEMBExcelCSV({
  project,
  entries,
  books = [],
  boqItems = [],
  abstractItems = [],
}: EMBExportParams): void {
  const headers = [
    'MB Volume No',
    'Page No',
    'Entry No',
    'Date (DD/MM/YYYY)',
    'BOQ Item No & Description',
    'Chainage / Location',
    'Dimensions / Particulars',
    'Nos',
    'Length (m)',
    'Breadth (m)',
    'Depth/Height (m)',
    'Quantity',
    'Unit',
    'Rate (INR)',
    'Amount (INR)',
    'Verification Status',
  ]

  let totalMeasuredQty = 0
  let totalMeasuredAmount = 0

  const rows: CsvCellValue[][] = []

  // Metadata banner
  rows.push(['CENTRAL / STATE PUBLIC WORKS DEPARTMENT - ELECTRONIC MEASUREMENT BOOK (e-MB)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push(['Project / Work Name:', project.name, '', '', 'Executing Agency / Client:', project.agency_name || 'Public Works Department', '', '', '', '', '', '', '', '', '', ''])
  rows.push(['Awarded Amount:', roundToTwo(project.awarded_amount || 0), '', '', 'Export Date:', formatIndianDate(new Date().toISOString()), '', '', '', '', '', '', '', '', '', ''])
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])

  // Detailed measurement rows
  for (const e of entries) {
    const book = books.find(b => b.id === e.measurement_book_id)
    const mbVol = book?.book_number || 'MB Vol-01'
    const pageNo = e.page_number || 1
    const entryNo = e.entry_number || ''
    const dateFormatted = formatIndianDate(e.measurement_date)

    const boqItem = boqItems.find(b => b.id === e.boq_item_id) || e.boq_items
    const itemNum = boqItem?.item_number || ''
    const itemDesc = boqItem?.description || e.description || 'Civil Work Item'
    const itemLabel = itemNum ? `Item ${itemNum}: ${itemDesc}` : itemDesc

    const location = e.location || '—'
    const rate = roundToTwo(Number(boqItem?.contract_rate || (e as any).boq_items?.contract_rate || (e as any).boq_items?.awarded_rate || 0))
    const subRows = Array.isArray(e.measurement_rows) && e.measurement_rows.length > 1 ? e.measurement_rows : null

    if (subRows) {
      const entryAmt = roundToTwo(Number(e.calculated_quantity || 0) * rate)
      totalMeasuredQty = safeAdd(totalMeasuredQty, Number(e.calculated_quantity || 0))
      totalMeasuredAmount = safeAdd(totalMeasuredAmount, entryAmt)

      rows.push([
        mbVol,
        pageNo,
        entryNo,
        dateFormatted,
        itemLabel,
        location,
        'Consolidated Entry Calculation',
        '',
        '',
        '',
        '',
        roundToTwo(e.calculated_quantity),
        e.unit,
        rate,
        entryAmt,
        e.status,
      ])

      subRows.forEach((r, idx) => {
        const sign = r.mode === 'deduct' ? -1 : 1
        const subQty = roundToTwo(Number(r.quantity || 0) * sign)
        const subAmt = roundToTwo(subQty * rate)
        rows.push([
          mbVol,
          pageNo,
          `${entryNo}.${idx + 1}`,
          dateFormatted,
          `  ↳ ${itemNum ? `Item ${itemNum}` : ''}`,
          location,
          `${r.mode === 'deduct' ? '[DEDUCT] ' : '[ADD] '}${r.particulars || 'Dimension measurement'}`,
          r.nos ?? 1,
          r.length ?? '',
          r.breadth ?? '',
          r.depthHeight ?? '',
          subQty,
          e.unit,
          rate,
          subAmt,
          'SUB-ROW',
        ])
      })
    } else {
      const entryAmt = roundToTwo(Number(e.calculated_quantity || 0) * rate)
      totalMeasuredQty = safeAdd(totalMeasuredQty, Number(e.calculated_quantity || 0))
      totalMeasuredAmount = safeAdd(totalMeasuredAmount, entryAmt)

      rows.push([
        mbVol,
        pageNo,
        entryNo,
        dateFormatted,
        itemLabel,
        location,
        e.description || 'Measured physical dimensions',
        e.number_of_units ?? 1,
        e.length ?? '',
        e.breadth ?? '',
        e.depth_height ?? '',
        roundToTwo(e.calculated_quantity),
        e.unit,
        rate,
        entryAmt,
        e.status,
      ])
    }
  }

  // Summary Row
  rows.push([
    'TOTAL MEASURED WORK',
    '',
    '',
    '',
    '',
    '',
    'Cumulative Verified Measurement Entries',
    '',
    '',
    '',
    '',
    roundToTwo(totalMeasuredQty),
    '',
    '',
    roundToTwo(totalMeasuredAmount),
    '',
  ])

  // Abstract Section
  if (abstractItems.length > 0) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
    rows.push(['--- CPWD/PWD ABSTRACT OF MEASUREMENTS & QUANTITY LEDGER ---', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
    rows.push([
      'BOQ Item No',
      'Description of Item of Work',
      'Unit',
      'Contract Qty',
      'Contract Rate (INR)',
      'Cumulative Measured Qty',
      'Balance Qty',
      'Total Measured Amount (INR)',
      'Certified Amount (INR)',
      'Deviation / Overrun Flag',
      '',
      '',
      '',
      '',
      '',
      '',
    ])

    let absTotalMeasured = 0
    let absTotalCertified = 0

    for (const item of abstractItems) {
      absTotalMeasured = safeAdd(absTotalMeasured, item.cumulative_amount || 0)
      absTotalCertified = safeAdd(absTotalCertified, item.certified_amount || 0)

      rows.push([
        item.item_number,
        item.description,
        item.unit,
        roundToTwo(item.contract_quantity),
        roundToTwo(item.contract_rate),
        roundToTwo(item.cumulative_quantity),
        roundToTwo(item.balance_quantity),
        roundToTwo(item.cumulative_amount),
        roundToTwo(item.certified_amount),
        item.is_exceeded ? 'EXCEEDED (Deviation Order Required)' : 'Normal',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
    }

    rows.push([
      'TOTAL ABSTRACT AMOUNT',
      '',
      '',
      '',
      '',
      '',
      '',
      roundToTwo(absTotalMeasured),
      roundToTwo(absTotalCertified),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
  }

  // 4-Tier Statutory Signatures
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push(['--- STATUTORY PUBLIC WORKS SIGN-OFF & CERTIFICATION (CPWD / PWD CODE) ---', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push([
    'Contractor / Site Engineer',
    '',
    '',
    'Junior Engineer (JE)',
    '',
    '',
    'Assistant Engineer (AE)',
    '',
    '',
    'Executive Engineer (EE)',
    '',
    '',
    '',
    '',
    '',
    '',
  ])
  rows.push([
    'Measured & Recorded at Site',
    '',
    '',
    'Checked in e-MB Book',
    '',
    '',
    '50% Value Test-Checked',
    '',
    '',
    '10% Value Certified & Passed',
    '',
    '',
    '',
    '',
    '',
    '',
  ])
  rows.push([
    'Signature: ______________________',
    '',
    '',
    'Signature: ______________________',
    '',
    '',
    'Signature: ______________________',
    '',
    '',
    'Signature: ______________________',
    '',
    '',
    '',
    '',
    '',
    '',
  ])
  rows.push([
    'Date: ___________________________',
    '',
    '',
    'Date: ___________________________',
    '',
    '',
    'Date: ___________________________',
    '',
    '',
    'Date: ___________________________',
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  const dateTag = new Date().toISOString().split('T')[0]
  const cleanName = project.name.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `eMB_Register_${cleanName}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TALLY PRIME ACCOUNTING VOUCHER EXPORT (DOUBLE-ENTRY CSV & XML)
// ─────────────────────────────────────────────────────────────────────────────

export interface TallyRABillInput {
  id: string
  bill_number: string
  submission_date: string
  date_received?: string | null
  billing_mode?: string
  work_certified_amount: number
  this_bill_work_certified?: number
  cumulative_certified_amount?: number
  retention_percentage?: number
  retention_amount?: number
  tds_deducted?: number
  it_tds_percentage?: number
  it_tds_amount?: number
  gst_tds_deducted?: number
  gst_tds_percentage?: number
  gst_tds_amount?: number
  labour_cess_deducted?: number
  labour_cess_percentage?: number
  labour_cess_amount?: number
  royalty_recovery?: number
  mobilization_advance_recovery?: number
  cement_recovery?: number
  steel_recovery?: number
  other_material_recovery?: number
  withheld_amount?: number
  other_deductions?: number
  total_deductions?: number
  net_payable_amount?: number
  net_payable_this_bill?: number
  amount_received?: number
  net_bank_received?: number
  status: string
  projects?: { name: string; agency_name?: string | null } | null
  bill_deductions?: { deduction_label: string; deduction_amount: number }[]
}

export function exportRABillTallyVoucherCSV(bill: TallyRABillInput, companyName?: string): void {
  const isCum = bill.billing_mode === 'cumulative'
  const grossWorkCertified = isCum && bill.this_bill_work_certified != null
    ? roundToTwo(Number(bill.this_bill_work_certified))
    : roundToTwo(Number(bill.work_certified_amount) || 0)

  const retAmt = roundToTwo(Number(bill.retention_amount) || 0)
  const itTds = roundToTwo(Number(bill.it_tds_amount || bill.tds_deducted) || 0)
  const gstTds = roundToTwo(Number(bill.gst_tds_amount || bill.gst_tds_deducted) || 0)
  const labourCess = roundToTwo(Number(bill.labour_cess_amount || bill.labour_cess_deducted) || 0)
  const royalty = roundToTwo(Number(bill.royalty_recovery) || 0)
  const mobAdv = roundToTwo(Number(bill.mobilization_advance_recovery) || 0)
  const cement = roundToTwo(Number(bill.cement_recovery) || 0)
  const steel = roundToTwo(Number(bill.steel_recovery) || 0)
  const otherMat = roundToTwo(Number(bill.other_material_recovery) || 0)
  const withheld = roundToTwo(Number(bill.withheld_amount) || 0)

  const customDeds = (bill.bill_deductions || []).map(d => ({
    label: d.deduction_label || 'Other Department Deduction',
    amount: roundToTwo(Number(d.deduction_amount) || 0),
  }))

  const customDedsTotal = customDeds.reduce((acc, d) => safeAdd(acc, d.amount), 0)

  const totalDeductions = safeAdd(
    retAmt,
    itTds,
    gstTds,
    labourCess,
    royalty,
    mobAdv,
    cement,
    steel,
    otherMat,
    withheld,
    customDedsTotal
  )

  const netReceivable = Math.max(0, safeSub(grossWorkCertified, totalDeductions))
  const clientName = bill.projects?.agency_name || 'Government Client'
  const projectName = bill.projects?.name || 'Project'
  const voucherDate = formatIndianDate(bill.submission_date)

  const headers = [
    'Voucher Date (DD/MM/YYYY)',
    'Voucher Type',
    'Voucher No',
    'Reference / Bill No',
    'Cost Centre / Project',
    'Ledger Name',
    'Dr / Cr',
    'Debit Amount (INR)',
    'Credit Amount (INR)',
    'Narration',
  ]

  const rows: CsvCellValue[][] = []

  // 1. Credit Entry: Revenue
  rows.push([
    voucherDate,
    'Journal',
    bill.bill_number,
    bill.bill_number,
    projectName,
    'Civil Contract Works Revenue',
    'Cr',
    0,
    grossWorkCertified,
    `Gross certified civil work executed under bill ${bill.bill_number} for ${projectName}`,
  ])

  // 2. Debit Entry: Net Bank / Client Receivable
  rows.push([
    voucherDate,
    'Journal',
    bill.bill_number,
    bill.bill_number,
    projectName,
    `Client Receivable - ${clientName}`,
    'Dr',
    netReceivable,
    0,
    `Net passed bill amount receivable from ${clientName} under RA Bill ${bill.bill_number}`,
  ])

  // 3. Retention / Security Deposit Withheld
  if (retAmt > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Retention Money Withheld (Security Deposit Asset)',
      'Dr',
      retAmt,
      0,
      `Security Deposit withheld @ ${bill.retention_percentage || 5}% under CPWD GCC Clause 1A`,
    ])
  }

  // 4. IT-TDS
  if (itTds > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'TDS Receivable u/s 194C (Income Tax)',
      'Dr',
      itTds,
      0,
      `Income Tax TDS deducted @ ${bill.it_tds_percentage || 2}% under Section 194C`,
    ])
  }

  // 5. GST-TDS
  if (gstTds > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'GST-TDS Receivable (CGST 1% + SGST 1%)',
      'Dr',
      gstTds,
      0,
      `GST-TDS deducted @ ${bill.gst_tds_percentage || 2}% under Section 51`,
    ])
  }

  // 6. Labour Cess
  if (labourCess > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'BOCW Labour Welfare Cess Recoverable',
      'Dr',
      labourCess,
      0,
      `Labour Welfare Cess deducted @ ${bill.labour_cess_percentage || 1}%`,
    ])
  }

  // 7. Royalty
  if (royalty > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Royalty Recovery (Mining & Geology Dept)',
      'Dr',
      royalty,
      0,
      'Minor mineral extraction royalty / seigniorage recovery',
    ])
  }

  // 8. Mobilization Advance Recovery
  if (mobAdv > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Mobilization Advance Recovery (CPWD Clause 10B)',
      'Dr',
      mobAdv,
      0,
      'Principal recovery towards mobilization advance',
    ])
  }

  // 9. Departmental Cement Recovery
  if (cement > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Departmental Stores Recovery - Cement (CPWA Form 35-A)',
      'Dr',
      cement,
      0,
      'Recovery for departmental cement issued from stores',
    ])
  }

  // 10. Departmental Steel Recovery
  if (steel > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Departmental Stores Recovery - Steel (CPWA Form 35-A)',
      'Dr',
      steel,
      0,
      'Recovery for departmental steel issued from stores',
    ])
  }

  // 11. Other Material Recovery
  if (otherMat > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Departmental Stores Recovery - Plant & Other Materials',
      'Dr',
      otherMat,
      0,
      'Recovery for plant, equipment hire or departmental materials',
    ])
  }

  // 12. Temporary Withheld
  if (withheld > 0) {
    rows.push([
      voucherDate,
      'Journal',
      bill.bill_number,
      bill.bill_number,
      projectName,
      'Departmental Withheld Amount (Milestone / EOT Hold)',
      'Dr',
      withheld,
      0,
      'Temporary withholding pending milestone verification or EOT sanction',
    ])
  }

  // 13. Custom deductions
  for (const d of customDeds) {
    if (d.amount > 0) {
      rows.push([
        voucherDate,
        'Journal',
        bill.bill_number,
        bill.bill_number,
        projectName,
        d.label,
        'Dr',
        d.amount,
        0,
        `Itemized deduction: ${d.label}`,
      ])
    }
  }

  // Balance Check
  const totalDebit = safeAdd(netReceivable, totalDeductions)
  const totalCredit = grossWorkCertified

  rows.push([
    'TOTAL VOUCHER ENTRY',
    '',
    '',
    '',
    '',
    companyName || 'PillarPro Ledger Balanced Voucher',
    totalDebit === totalCredit ? 'BALANCED' : 'OUT_OF_BALANCE',
    roundToTwo(totalDebit),
    roundToTwo(totalCredit),
    totalDebit === totalCredit ? 'Exact Double-Entry Match (Diff: 0.00)' : `Difference: ${roundToTwo(totalDebit - totalCredit)}`,
  ])

  const dateTag = new Date().toISOString().split('T')[0]
  const cleanBill = bill.bill_number.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Tally_Voucher_${cleanBill}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}

export function exportRABillTallyVoucherXML(bill: TallyRABillInput, companyName?: string): void {
  const isCum = bill.billing_mode === 'cumulative'
  const grossWorkCertified = isCum && bill.this_bill_work_certified != null
    ? roundToTwo(Number(bill.this_bill_work_certified))
    : roundToTwo(Number(bill.work_certified_amount) || 0)

  const retAmt = roundToTwo(Number(bill.retention_amount) || 0)
  const itTds = roundToTwo(Number(bill.it_tds_amount || bill.tds_deducted) || 0)
  const gstTds = roundToTwo(Number(bill.gst_tds_amount || bill.gst_tds_deducted) || 0)
  const labourCess = roundToTwo(Number(bill.labour_cess_amount || bill.labour_cess_deducted) || 0)
  const royalty = roundToTwo(Number(bill.royalty_recovery) || 0)
  const mobAdv = roundToTwo(Number(bill.mobilization_advance_recovery) || 0)
  const cement = roundToTwo(Number(bill.cement_recovery) || 0)
  const steel = roundToTwo(Number(bill.steel_recovery) || 0)
  const otherMat = roundToTwo(Number(bill.other_material_recovery) || 0)
  const withheld = roundToTwo(Number(bill.withheld_amount) || 0)

  const customDeds = (bill.bill_deductions || []).map(d => ({
    label: d.deduction_label || 'Other Department Deduction',
    amount: roundToTwo(Number(d.deduction_amount) || 0),
  }))

  const customDedsTotal = customDeds.reduce((acc, d) => safeAdd(acc, d.amount), 0)

  const totalDeductions = safeAdd(
    retAmt,
    itTds,
    gstTds,
    labourCess,
    royalty,
    mobAdv,
    cement,
    steel,
    otherMat,
    withheld,
    customDedsTotal
  )

  const netReceivable = Math.max(0, safeSub(grossWorkCertified, totalDeductions))
  const clientName = bill.projects?.agency_name || 'Government Client'
  const projectName = bill.projects?.name || 'Site'

  const dateObj = new Date(bill.submission_date || new Date().toISOString())
  const yyyy = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear()
  const mm = String(isNaN(dateObj.getMonth()) ? new Date().getMonth() + 1 : dateObj.getMonth() + 1).padStart(2, '0')
  const dd = String(isNaN(dateObj.getDate()) ? new Date().getDate() : dateObj.getDate()).padStart(2, '0')
  const tallyDate = `${yyyy}${mm}${dd}`

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '&': return '&amp;'
        case '\'': return '&apos;'
        case '"': return '&quot;'
        default: return c
      }
    })
  }

  const debits: { ledger: string; amount: number }[] = [
    { ledger: `Client Receivable - ${clientName}`, amount: netReceivable },
  ]
  if (retAmt > 0) debits.push({ ledger: 'Retention Money Withheld (Security Deposit Asset)', amount: retAmt })
  if (itTds > 0) debits.push({ ledger: 'TDS Receivable u/s 194C (Income Tax)', amount: itTds })
  if (gstTds > 0) debits.push({ ledger: 'GST-TDS Receivable (CGST 1% + SGST 1%)', amount: gstTds })
  if (labourCess > 0) debits.push({ ledger: 'BOCW Labour Welfare Cess Recoverable', amount: labourCess })
  if (royalty > 0) debits.push({ ledger: 'Royalty Recovery (Mining & Geology Dept)', amount: royalty })
  if (mobAdv > 0) debits.push({ ledger: 'Mobilization Advance Recovery (CPWD Clause 10B)', amount: mobAdv })
  if (cement > 0) debits.push({ ledger: 'Departmental Stores Recovery - Cement (CPWA Form 35-A)', amount: cement })
  if (steel > 0) debits.push({ ledger: 'Departmental Stores Recovery - Steel (CPWA Form 35-A)', amount: steel })
  if (otherMat > 0) debits.push({ ledger: 'Departmental Stores Recovery - Plant & Other Materials', amount: otherMat })
  if (withheld > 0) debits.push({ ledger: 'Departmental Withheld Amount (Milestone / EOT Hold)', amount: withheld })
  for (const d of customDeds) {
    if (d.amount > 0) debits.push({ ledger: d.label, amount: d.amount })
  }

  const narration = `RA Bill ${bill.bill_number} for work executed at ${projectName}. Net Passed: INR ${netReceivable}, Deductions: INR ${totalDeductions}`

  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName || 'PillarPro Construction')}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${tallyDate}</DATE>
            <GUID>PP-RABILL-${bill.id}</GUID>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(bill.bill_number)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(bill.bill_number)}</REFERENCE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Civil Contract Works Revenue</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${grossWorkCertified.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
${debits.map(d => `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(d.ledger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${d.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`).join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

  const dateTag = new Date().toISOString().split('T')[0]
  const cleanBill = bill.bill_number.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Tally_Voucher_${cleanBill}_${dateTag}.xml`

  triggerXmlDownload(xmlContent, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CPWA FORM 26 RA BILL ABSTRACT CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function exportForm26AbstractCSV(
  bill: TallyRABillInput,
  items: any[] = [],
  companyName?: string
): void {
  const isCum = bill.billing_mode === 'cumulative'
  const grossWorkCertified = isCum && bill.this_bill_work_certified != null
    ? roundToTwo(Number(bill.this_bill_work_certified))
    : roundToTwo(Number(bill.work_certified_amount) || 0)

  const retAmt = roundToTwo(Number(bill.retention_amount) || 0)
  const itTds = roundToTwo(Number(bill.it_tds_amount || bill.tds_deducted) || 0)
  const gstTds = roundToTwo(Number(bill.gst_tds_amount || bill.gst_tds_deducted) || 0)
  const labourCess = roundToTwo(Number(bill.labour_cess_amount || bill.labour_cess_deducted) || 0)
  const royalty = roundToTwo(Number(bill.royalty_recovery) || 0)
  const mobAdv = roundToTwo(Number(bill.mobilization_advance_recovery) || 0)
  const cement = roundToTwo(Number(bill.cement_recovery) || 0)
  const steel = roundToTwo(Number(bill.steel_recovery) || 0)
  const otherMat = roundToTwo(Number(bill.other_material_recovery) || 0)
  const withheld = roundToTwo(Number(bill.withheld_amount) || 0)

  const totalMat = safeAdd(cement, steel, otherMat)
  const totalTaxes = safeAdd(itTds, gstTds, labourCess)
  const totalOther = safeAdd(royalty, mobAdv, withheld)
  const totalAllDeductions = safeAdd(retAmt, totalMat, totalTaxes, totalOther)
  const netPassed = Math.max(0, safeSub(grossWorkCertified, totalAllDeductions))

  const headers = [
    'Item No',
    'Particulars / Account Description',
    'Unit',
    'Rate (INR)',
    'Previous Qty',
    'Current Qty',
    'Cumulative Qty',
    'Current Amount (INR)',
    'Cumulative Amount (INR)',
    'Remarks / Statutory Basis',
  ]

  const rows: CsvCellValue[][] = []

  rows.push(['FORM CPWA 26 - RUNNING ACCOUNT BILL ABSTRACT & MEMORANDUM OF PAYMENTS', '', '', '', '', '', '', '', '', ''])
  rows.push(['Bill Number:', bill.bill_number, 'Submission Date:', formatIndianDate(bill.submission_date), 'Project:', bill.projects?.name || 'Project Site', '', '', '', ''])
  rows.push(['Client / Department:', bill.projects?.agency_name || 'Public Works Department', 'Contractor:', companyName || 'Agency', '', '', '', '', '', '', ''])
  rows.push(['', '', '', '', '', '', '', '', '', ''])

  // Account I
  rows.push(['ACCOUNT I — ITEMS OF WORK EXECUTED (SCHEDULE OF RATES & QUANTITIES)', '', '', '', '', '', '', '', '', ''])
  if (items.length > 0) {
    items.forEach((it, idx) => {
      const boqNum = it.boq_items?.item_number || `${idx + 1}`
      const desc = it.boq_items?.description || it.description || 'Contract work'
      const unit = it.boq_items?.unit || it.unit || 'Nos'
      const rate = roundToTwo(Number(it.rate || it.boq_items?.awarded_rate || 0))
      const prevQty = roundToTwo(Number(it.previous_quantity || 0))
      const currQty = roundToTwo(Number(it.current_quantity || 0))
      const cumQty = roundToTwo(Number(it.cumulative_quantity || prevQty + currQty))
      const currAmt = roundToTwo(Number(it.current_amount || currQty * rate))
      const cumAmt = roundToTwo(Number(it.cumulative_amount || cumQty * rate))

      rows.push([
        boqNum,
        desc,
        unit,
        rate,
        prevQty,
        currQty,
        cumQty,
        currAmt,
        cumAmt,
        it.remarks || '',
      ])
    })
  } else {
    rows.push([
      '1',
      `Gross Certified Work as per sanction under Bill ${bill.bill_number}`,
      'LS',
      grossWorkCertified,
      0,
      1,
      1,
      grossWorkCertified,
      grossWorkCertified,
      'Consolidated e-MB Sanction',
    ])
  }

  rows.push(['', '', '', '', '', '', '', '', '', ''])
  // Account III
  rows.push(['ACCOUNT III — MEMORANDUM OF PAYMENTS (CPWA FORM 26 AUDIT)', '', '', '', '', '', '', '', '', ''])
  rows.push(['Item 1', 'Total value of work actually measured up to date (Gross Certified)', '', '', '', '', '', '', grossWorkCertified, 'Account I Entry A'])
  rows.push(['Item 5', `Deduct: Security Deposit / Retention Money Withheld (${bill.retention_percentage || 5}%)`, '', '', '', '', '', '', `(-) ${retAmt}`, 'CPWD GCC Clause 1A'])
  if (cement > 0) rows.push(['Item 8(a)', 'Deduct: Departmental Cement Recovery', '', '', '', '', '', '', `(-) ${cement}`, 'CPWA Form 35-A Store Issue'])
  if (steel > 0) rows.push(['Item 8(a)', 'Deduct: Departmental Steel Recovery', '', '', '', '', '', '', `(-) ${steel}`, 'CPWA Form 35-A Store Issue'])
  if (otherMat > 0) rows.push(['Item 8(a)', 'Deduct: Other Materials / Equipment Recovery', '', '', '', '', '', '', `(-) ${otherMat}`, 'Store & Plant hire credit'])
  if (itTds > 0) rows.push(['Item 8(b)', `Deduct: Income Tax TDS (${bill.it_tds_percentage || 2}%)`, '', '', '', '', '', '', `(-) ${itTds}`, 'Income Tax Act Sec 194C'])
  if (gstTds > 0) rows.push(['Item 8(b)', `Deduct: GST-TDS (${bill.gst_tds_percentage || 2}%)`, '', '', '', '', '', '', `(-) ${gstTds}`, 'CGST / SGST Act Sec 51'])
  if (labourCess > 0) rows.push(['Item 8(b)', `Deduct: BOCW Labour Welfare Cess (${bill.labour_cess_percentage || 1}%)`, '', '', '', '', '', '', `(-) ${labourCess}`, 'Building & Other Const. Cess Act'])
  if (royalty > 0) rows.push(['Item 8(b)', 'Deduct: Royalty / Minor Mineral Recovery', '', '', '', '', '', '', `(-) ${royalty}`, 'Department of Mining & Geology'])
  if (mobAdv > 0) rows.push(['Item 8(b)', 'Deduct: Mobilization Advance Recovery', '', '', '', '', '', '', `(-) ${mobAdv}`, 'CPWD GCC Clause 10B'])
  if (withheld > 0) rows.push(['Item 8(b)', 'Deduct: Departmental Withheld Amount', '', '', '', '', '', '', `(-) ${withheld}`, 'QC / Milestone / EOT hold'])
  rows.push(['Total Ded.', 'Total Deductions & Recoveries (Item 5 + 8a + 8b)', '', '', '', '', '', '', `(-) ${totalAllDeductions}`, 'Total Recoveries'])
  rows.push(['Item 8(c)', 'NET PASSED FOR PAYMENT (Payable by Cheque / RTGS)', '', '', '', '', '', '', roundToTwo(netPassed), 'Passed for Payment'])

  // Signatures
  rows.push(['', '', '', '', '', '', '', '', '', ''])
  rows.push(['STATUTORY SIGN-OFF BLOCKS (4-TIER AUDIT)', '', '', '', '', '', '', '', '', ''])
  rows.push(['Contractor / Authorized Signatory', '', 'Junior Engineer (JE)', '', 'Assistant Engineer (AE)', '', 'Executive Engineer (EE)', '', '', ''])
  rows.push(['Signature: ______________________', '', 'Signature: ______________________', '', 'Signature: ______________________', '', 'Signature: ______________________', '', '', ''])
  rows.push(['Date: ___________________________', '', 'Date: ___________________________', '', 'Date: ___________________________', '', 'Date: ___________________________', '', '', ''])

  const dateTag = new Date().toISOString().split('T')[0]
  const cleanBill = bill.bill_number.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `CPWA_Form26_Abstract_${cleanBill}_${dateTag}.csv`

  const csv = buildCsvString(headers, rows)
  triggerCsvDownload(csv, filename)
}
