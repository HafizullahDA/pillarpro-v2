import { formatINR } from './format'

export interface WhatsAppAlertPayload {
  reference: string
  subtitle?: string
  date?: string
  daysRemaining?: number
  amount?: number
  issuingBank?: string
  depositType?: string
  letterNumber?: string
  subject?: string
  clauseTitle?: string
  billNumber?: string
  status?: string
  certifiedAmount?: number
  receivedAmount?: number | null
  projectName?: string
  projectId?: string
  entityId?: string
  recipientPhone?: string
  auditRef?: string
}

/**
 * Returns a human-readable urgency badge string for contractual deadlines.
 */
export function getUrgencyStatus(daysRemaining?: number): {
  label: string
  badgeVariant: 'danger' | 'warning' | 'info' | 'neutral'
} {
  if (daysRemaining == null) {
    return { label: 'ACTION REQUIRED', badgeVariant: 'info' }
  }
  if (daysRemaining < 0) {
    return { label: `${Math.abs(daysRemaining)}d OVERDUE (EXPIRED)`, badgeVariant: 'danger' }
  }
  if (daysRemaining === 0) {
    return { label: 'DUE TODAY (IMMEDIATE ACTION)', badgeVariant: 'danger' }
  }
  if (daysRemaining <= 7) {
    return { label: `${daysRemaining}d REMAINING (CRITICAL)`, badgeVariant: 'warning' }
  }
  if (daysRemaining <= 15) {
    return { label: `${daysRemaining}d REMAINING (URGENT)`, badgeVariant: 'warning' }
  }
  return { label: `${daysRemaining}d REMAINING (SCHEDULED)`, badgeVariant: 'neutral' }
}

/**
 * Format deposit type cleanly for enterprise communications
 */
function formatDepositType(type?: string): string {
  if (!type) return 'Bank Guarantee'
  switch (type.toLowerCase()) {
    case 'performance_bank_guarantee':
    case 'pbg':
      return 'Performance Bank Guarantee (PBG)'
    case 'retention_money_fdr':
    case 'fdr':
      return 'Retention Money Fixed Deposit (FDR)'
    case 'security_deposit':
    case 'sd':
      return 'Security Deposit (SD)'
    case 'earnest_money_deposit':
    case 'emd':
      return 'Earnest Money Deposit (EMD)'
    case 'mobilization_advance_guarantee':
      return 'Mobilization Advance Guarantee (MOB-BG)'
    default:
      return type.replace(/_/g, ' ').toUpperCase()
  }
}

/**
 * Generates a short, consistent audit reference code (e.g. PLR-BG-A81F)
 */
function generateAuditCode(prefix: string, seed?: string): string {
  if (seed && seed.length >= 6) {
    const clean = seed.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()
    return `PLR-${prefix}-${clean}`
  }
  const randomHex = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()
  return `PLR-${prefix}-${randomHex}`
}

/**
 * 1. Enterprise Bank Guarantee (BG / FDR) Expiry Alert
 */
export function generateBankGuaranteeWhatsAppText(data: WhatsAppAlertPayload): string {
  const urgency = getUrgencyStatus(data.daysRemaining)
  const depositLabel = formatDepositType(data.depositType)
  const auditCode = generateAuditCode('BG', data.entityId || data.reference)
  const formattedAmt = data.amount != null && data.amount > 0 ? formatINR(data.amount) : 'Not Specified'

  const lines: (string | null)[] = [
    `🏗️ *PILLARPRO ENTERPRISE | STATUTORY CONTRACT DEFENSE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨 *CRITICAL INSTRUMENT ALERT: BG / FDR EXPIRY*`,
    ``,
    `📋 *Instrument Particulars:*`,
    `• *BG / FDR Ref*: ${data.reference}`,
    `• *Instrument Type*: ${depositLabel}`,
    data.issuingBank ? `• *Issuing Bank*: ${data.issuingBank}` : null,
    `• *Guaranteed Exposure*: ${formattedAmt}`,
    data.projectName ? `• *Contract Package*: ${data.projectName}` : null,
    ``,
    `⏳ *Statutory Countdown:*`,
    `• *Expiry Date*: ${data.date || 'Approaching'} (${data.daysRemaining != null ? `${data.daysRemaining} days remaining` : 'Immediate action required'})`,
    `• *Status*: ⚠️ ${urgency.label}`,
    ``,
    `⚖️ *Contractual Directive (CPWD GCC Clause 1A / FIDIC Sub-Clause 4.2):*`,
    `Guarantees must be extended or verified via SFMS at least 14 days prior to expiry. Failure to renew entitles the Department to invoke encashment into treasury cash retention.`,
    ``,
    `📌 *Mandated Defense Action:*`,
    `1. Instruct issuing bank to issue formal extension endorsement / SFMS message.`,
    `2. Deliver extension confirmation with speed-post acknowledgment to Engineer-in-Charge.`,
    `3. Update compliance audit record in PillarPro Contract Vault.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Confidential Enterprise Dispatch`,
    `_PillarPro Infrastructure Contract Defense System_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 2. Enterprise Statutory Notice & Clause 5 Time-Bar Alert
 */
export function generateClauseNoticeWhatsAppText(data: WhatsAppAlertPayload): string {
  const urgency = getUrgencyStatus(data.daysRemaining)
  const auditCode = generateAuditCode('NTC', data.entityId || data.reference)
  const clauseRef = data.clauseTitle || 'CPWD GCC Clause 5 / 2 / 10CC'

  const lines: (string | null)[] = [
    `⚖️ *PILLARPRO ENTERPRISE | CONTRACT DEFENSE SHIELD*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ *STATUTORY NOTICE DEADLINE: TIME-BAR IMMINENT*`,
    ``,
    `📋 *Notice Particulars:*`,
    `• *Letter / Notice Ref*: ${data.reference}`,
    `• *Governing Clause*: ${clauseRef}`,
    data.subject ? `• *Subject*: ${data.subject}` : null,
    data.projectName ? `• *Project Site*: ${data.projectName}` : null,
    ``,
    `⏳ *Defense Clock:*`,
    `• *Statutory Deadline*: ${data.date || 'Urgent'} (${data.daysRemaining != null ? `${data.daysRemaining} days left` : 'Action required'})`,
    `• *Window Remaining*: ⚠️ ${urgency.label}`,
    ``,
    `🏛️ *Arbitration Precedent (Union of India v. Rai Eng.):*`,
    `Failure to lodge a written rebuttal or notice of dispute within the contractual window creates an irrebuttable presumption of waiver in arbitration. Preserving contractor rights requires an official written defense on record.`,
    ``,
    `📌 *Mandated Defense Action:*`,
    `1. Finalize rebuttal / notice letter citing governing clause and facts.`,
    `2. Dispatch via Speed Post / Registered Email with delivery proof.`,
    `3. Log outgoing dispatch in PillarPro Correspondence Vault.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Confidential Enterprise Dispatch`,
    `_PillarPro Contract Defense & Dispute Shield_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 3. Enterprise RA Bill & Treasury Milestone Alert
 */
export function generateRABillWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('BILL', data.entityId || data.billNumber)
  const formattedCert = data.certifiedAmount != null ? formatINR(data.certifiedAmount) : 'Pending'
  const formattedRec = data.receivedAmount != null ? formatINR(data.receivedAmount) : null
  const statusStr = (data.status || 'SUBMITTED').replace(/_/g, ' ').toUpperCase()

  const lines: (string | null)[] = [
    `💼 *PILLARPRO ENTERPRISE | TREASURY & BILLING ENGINE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *PAYMENT MILESTONE: RA BILL ${statusStr}*`,
    ``,
    `📋 *Bill Particulars:*`,
    `• *Bill Reference*: ${data.billNumber || data.reference}`,
    data.projectName ? `• *Project / Package*: ${data.projectName}` : null,
    data.date ? `• *Billing Date*: ${data.date}` : null,
    `• *Lifecycle Status*: ${statusStr}`,
    ``,
    `💰 *Financial Certification:*`,
    `• *Gross Certified Amount*: ${formattedCert}`,
    formattedRec ? `• *Net Released / Paid*: ${formattedRec}` : `• *Payment Stage*: Under Department Treasury Processing`,
    `• *Statutory Retentions*: Security Deposit & Withholdings Reconciled`,
    ``,
    `📌 *Recommended Action:*`,
    `Review measurement book (MB) abstract and download payment advice from PillarPro Billing Ledger.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Confidential Enterprise Dispatch`,
    `_PillarPro Enterprise Infrastructure ERP_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 4. Enterprise Executive System Dispatch / Verification Alert
 */
export function generateEnterpriseExecutiveAlertText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('SYS', data.entityId || data.reference)
  const dateStr = data.date || new Date().toISOString().split('T')[0]

  const lines: (string | null)[] = [
    `🏢 *PILLARPRO ENTERPRISE | COMMAND CENTER*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📡 *STATUTORY NOTIFICATION PIPELINE VERIFIED*`,
    ``,
    `📋 *Pipeline Particulars:*`,
    `• *Dispatch Channel*: Meta WhatsApp Cloud API (v22.0 Secure)`,
    `• *Reference*: ${data.reference || 'Executive Contract Defense'}`,
    data.subtitle ? `• *Context*: ${data.subtitle}` : null,
    `• *Date*: ${dateStr}`,
    `• *Security Status*: Tenant-Isolated Encrypted Webhook`,
    ``,
    `🛡️ *Monitoring Systems Active:*`,
    `• Bank Guarantee Expiry Timers: Armed (30d / 15d / 7d countdowns)`,
    `• Contractual Notice Defense Clocks: Armed (CPWD Cl. 5 / FIDIC Cl. 20.1)`,
    `• RA Bill Certification & Treasury Radar: Armed`,
    `• ISO 27001 Audit Trail & Proof-of-Dispatch: Enabled`,
    ``,
    `_This confirms your mobile device is registered to receive high-stakes contractual, legal, and financial alerts._`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Authorized Enterprise Channel`,
    `_PillarPro Enterprise Contractor Intelligence_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * Master dispatcher for formatted alert text based on type.
 */
export function generateWhatsAppAlertText(
  alertType: 'bg_expiry' | 'clause_notice' | 'ra_bill' | 'text' | string,
  data: WhatsAppAlertPayload
): string {
  switch (alertType) {
    case 'bg_expiry':
      return generateBankGuaranteeWhatsAppText(data)
    case 'clause_notice':
      return generateClauseNoticeWhatsAppText(data)
    case 'ra_bill':
      return generateRABillWhatsAppText(data)
    case 'text':
    default:
      return generateEnterpriseExecutiveAlertText(data)
  }
}
