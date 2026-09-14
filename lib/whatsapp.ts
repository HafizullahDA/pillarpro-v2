import { formatINR, formatDate } from './format'
import { OrganizationProfile } from './organization'

/**
 * Open WhatsApp with pre-filled text, targeting a phone number if provided.
 */
export function openWhatsApp(text: string, phone?: string | null) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : ''
  const encodedText = encodeURIComponent(text)

  let url: string
  if (cleanPhone) {
    // If international code missing (standard 10-digit Indian mobile), prepend 91
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    url = `https://wa.me/${finalPhone}?text=${encodedText}`
  } else {
    url = `https://wa.me/?text=${encodedText}`
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Generates an official WhatsApp message for Running Account (RA) Bills.
 */
export function generateRABillWhatsAppText(
  bill: any,
  organization?: OrganizationProfile
): string {
  const orgName = organization?.name || 'Civil Contractor'
  const projName = bill.projects?.name || 'Civil Works Project'
  const billNo = bill.bill_number || 'RA Bill'
  const billDate = bill.bill_date ? formatDate(bill.bill_date) : 'N/A'

  const isCum = bill.billing_mode === 'cumulative'
  const grossCertified = isCum && bill.this_bill_work_certified != null
    ? Number(bill.this_bill_work_certified)
    : Number(bill.work_certified_amount || 0)

  const retention = Number(bill.retention_amount || 0)
  const itTds = Number(bill.tds_deducted || 0)
  const gstTds = Number(bill.gst_tds_deducted || 0)
  const labourCess = Number(bill.labour_cess_deducted || 0)
  const other = Number(bill.other_deductions || 0)
  const totalDeductions = Number(bill.total_deductions) || (retention + itTds + gstTds + labourCess + other)

  const netPayable = bill.net_payable_this_bill != null
    ? Number(bill.net_payable_this_bill)
    : (Number(bill.net_payable_amount) || Math.max(0, grossCertified - retention))

  const received = Number(bill.amount_received || 0)
  const pending = Math.max(0, netPayable - received)

  const lines = [
    `📄 *RUNNING ACCOUNT (RA) BILL STATEMENT*`,
    `🏢 *Contractor:* ${orgName}`,
    `🏗️ *Project:* ${projName}`,
    `📋 *Bill No:* ${billNo} (${billDate})`,
    `────────────────────────`,
    `*Gross Work Certified:* ${formatINR(grossCertified)}`,
    `*Total Deductions:* -${formatINR(totalDeductions)}`,
  ]

  if (retention > 0) lines.push(`  • Retention (Security): ${formatINR(retention)}`)
  if (itTds > 0) lines.push(`  • Income Tax TDS: ${formatINR(itTds)}`)
  if (gstTds > 0) lines.push(`  • GST TDS (2%): ${formatINR(gstTds)}`)
  if (labourCess > 0) lines.push(`  • Labour Cess (1%): ${formatINR(labourCess)}`)
  if (other > 0) lines.push(`  • Other Deductions: ${formatINR(other)}`)

  lines.push(
    `────────────────────────`,
    `*Net Amount Certified:* ${formatINR(netPayable)}`,
    `*Bank Credit Received:* ${formatINR(received)}`,
    `*Balance Due:* ${formatINR(pending)}`,
    `────────────────────────`,
    `_Generated via PillarPro Civil Contractor ERP_`
  )

  return lines.join('\n')
}

/**
 * Generates an official WhatsApp statement for a Supplier Khata.
 */
export function generateSupplierKhataWhatsAppText(
  supplier: { name: string; contact_number?: string | null },
  totals: { totalProcured: number; totalPaid: number; balanceOwed: number },
  organization?: OrganizationProfile
): string {
  const orgName = organization?.name || 'Civil Contractor'
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return [
    `📋 *SUPPLIER KHATA ACCOUNT STATEMENT*`,
    `🏢 *Firm:* ${orgName}`,
    `🤝 *Supplier:* ${supplier.name}`,
    `📅 *As of:* ${today}`,
    `────────────────────────`,
    `*Total Materials Procured:* ${formatINR(totals.totalProcured)}`,
    `*Total Payments Cleared:* ${formatINR(totals.totalPaid)}`,
    `*Net Balance Due:* ${formatINR(totals.balanceOwed)}`,
    `────────────────────────`,
    `_Please check and confirm with your ledger records._`,
    `_Generated via PillarPro Civil Contractor ERP_`,
  ].join('\n')
}

/**
 * Generates an official WhatsApp daily muster roll report for site attendance.
 */
export function generateMusterRollWhatsAppText(
  dateStr: string,
  projectName: string,
  presentCount: number,
  totalWages: number,
  organization?: OrganizationProfile
): string {
  const orgName = organization?.name || 'Civil Contractor'
  const formattedDate = formatDate(dateStr)

  return [
    `👷 *DAILY SITE MUSTER ROLL REPORT*`,
    `🏢 *Firm:* ${orgName}`,
    `🏗️ *Project:* ${projectName}`,
    `📅 *Date:* ${formattedDate}`,
    `────────────────────────`,
    `*Total Workers Present:* ${presentCount}`,
    `*Total Daily Wage Payable:* ${formatINR(totalWages)}`,
    `────────────────────────`,
    `_Generated via PillarPro Civil Contractor ERP_`,
  ].join('\n')
}

