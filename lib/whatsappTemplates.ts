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
  // Phase 2 Cash Flow & Vendor fields:
  daysDelayed?: number
  workCertifiedAmount?: number
  netPayableAmount?: number
  outstandingBalance?: number
  creditLimit?: number
  creditUtilizationPercent?: number
  supplierName?: string
  paymentMode?: string
  updatedBalance?: number
  // Phase 3 Site Operations & Fleet fields:
  itemName?: string
  itemCode?: string
  currentStock?: number
  minimumStock?: number
  unit?: string
  assetName?: string
  registrationNumber?: string
  currentMeter?: number
  lastServiceMeter?: number
  serviceIntervalMeter?: number
  hoursSinceLastService?: number
  complianceDocType?: 'insurance' | 'fitness' | 'puc' | 'service'
  totalWorkers?: number
  totalMandays?: number
  totalOTHours?: number
  regularWages?: number
  otWages?: number
  grossWageLiability?: number
  bocwCessEstimate?: number
  weekStart?: string
  weekEnd?: string
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
 * 5. Enterprise Delayed RA Bill Payment & Statutory Interest Alert
 */
export function generateDelayedRABillWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('RAB-DLY', data.entityId || data.billNumber || data.reference)
  const daysDelayed = data.daysDelayed != null ? Math.abs(data.daysDelayed) : Math.abs(data.daysRemaining || 0)
  const isMsmeEligible = daysDelayed >= 45

  const grossStr = data.workCertifiedAmount != null ? formatINR(data.workCertifiedAmount) : 'Pending'
  const netStr = data.netPayableAmount != null ? formatINR(data.netPayableAmount) : 'Pending'
  const outstandingStr = data.outstandingBalance != null ? formatINR(data.outstandingBalance) : netStr

  const lines: (string | null)[] = [
    `💼 *PILLARPRO ENTERPRISE | CASH FLOW RADAR*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ *RA BILL PAYMENT OVERDUE: STATUTORY THRESHOLD EXCEEDED*`,
    ``,
    `📋 *Bill Particulars:*`,
    `• *Bill Reference*: ${data.billNumber || data.reference}`,
    data.projectName ? `• *Project / Package*: ${data.projectName}` : null,
    data.date ? `• *Submission Date*: ${data.date}` : null,
    `• *Aging*: 🚨 *${daysDelayed} days elapsed* since submission`,
    ``,
    `💰 *Financial Balance Owed:*`,
    `• *Gross Certified Amount*: ${grossStr}`,
    `• *Net Certified Payable*: ${netStr}`,
    `• *Outstanding Department Debt*: *${outstandingStr}*`,
    ``,
    `⚖️ *Governing Statutory Basis:*`,
    isMsmeEligible
      ? `• *MSMED Act 2006 (Sec 15 & 16)*: Statutory 45-day payment window exceeded. Department is liable to pay compound interest with monthly rests at *3x RBI Bank Rate*.`
      : `• *CPWD GCC Clause 7*: Interim RA bill certification & payment mandated within 30 days of submission.`,
    ``,
    `📌 *Mandated Recovery Action:*`,
    `1. Issue formal reminder letter citing CPWD Clause 7 to Executive Engineer.`,
    isMsmeEligible
      ? `2. File formal statutory interest notice under Section 16 of MSMED Act 2006.`
      : `2. Follow up with Divisional Accounts Officer (DAO) for treasury token generation.`,
    `3. Track recovery status in PillarPro RA Bill Ledger.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Confidential Financial Escalation`,
    `_PillarPro Treasury & Cash Flow Engine_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 6. Enterprise Supplier Credit Limit Threshold Alert
 */
export function generateSupplierCreditLimitWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('VEN-CR', data.entityId || data.supplierName || data.reference)
  const limitStr = data.creditLimit != null ? formatINR(data.creditLimit) : 'N/A'
  const balanceStr = data.outstandingBalance != null ? formatINR(data.outstandingBalance) : 'N/A'
  const utilStr = data.creditUtilizationPercent != null ? `${data.creditUtilizationPercent.toFixed(1)}%` : 'Critical'

  const lines: (string | null)[] = [
    `🏗️ *PILLARPRO ENTERPRISE | PROCUREMENT RISK SHIELD*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨 *SUPPLIER CREDIT LIMIT: CRITICAL UTILIZATION WARNING*`,
    ``,
    `📋 *Supplier Particulars:*`,
    `• *Supplier / Vendor*: ${data.supplierName || data.reference}`,
    data.projectName ? `• *Site Allocation*: ${data.projectName}` : null,
    ``,
    `📊 *Credit Utilization Breakdown:*`,
    `• *Agreed Credit Limit*: ${limitStr}`,
    `• *Current Balance Owed*: *${balanceStr}*`,
    `• *Utilization Threshold*: ⚠️ *${utilStr}*`,
    ``,
    `⚠️ *Operational Risk Assessment:*`,
    `Exceeding vendor credit threshold will trigger an immediate material dispatch hold (cement/RMC/steel), creating severe structural delay or machine idling on active sites.`,
    ``,
    `📌 *Recommended Procurement Action:*`,
    `1. Authorize partial payment via NEFT/RTGS to vendor account.`,
    `2. Negotiate temporary limit enhancement for ongoing casting schedules.`,
    `3. Log payment advice in PillarPro Supplier Khata.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Authorized Procurement Channel`,
    `_PillarPro Vendor Management & Supply Chain Shield_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 7. Enterprise Vendor Payment Advice Receipt
 */
export function generateVendorPaymentAdviceWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('PAY-ADV', data.entityId || data.reference)
  const amountStr = data.amount != null ? formatINR(data.amount) : '0.00'
  const balanceStr = data.updatedBalance != null ? formatINR(data.updatedBalance) : null
  const dateStr = data.date || new Date().toISOString().split('T')[0]

  const lines: (string | null)[] = [
    `✅ *PILLARPRO ENTERPRISE | OFFICIAL PAYMENT ADVICE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Dear ${data.supplierName || 'Valued Supplier / Partner'},`,
    ``,
    `Please be advised that an official vendor payment has been authorized and dispatched by the contractor accounts desk:`,
    ``,
    `💰 *Transaction Particulars:*`,
    `• *Payment Amount*: *${amountStr}*`,
    `• *Disbursed Date*: ${dateStr}`,
    `• *Payment Mode*: ${data.paymentMode ? data.paymentMode.replace(/_/g, ' ').toUpperCase() : 'BANK TRANSFER'}`,
    data.reference ? `• *Bank Ref / UTR / Cheque*: ${data.reference}` : null,
    data.projectName ? `• *Project Allocation*: ${data.projectName}` : null,
    balanceStr ? `• *Updated Ledger Balance Owed*: ${balanceStr}` : null,
    ``,
    `📌 *Verification Note:*`,
    `Please reconcile your accounts ledger. If you have any discrepancy, please contact our accounts department with the audit code below.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Official Accounts Advice`,
    `_PillarPro Accounts & Khata Automation_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 8. Enterprise Missing Daily Progress Report (DPR) Alert (8:00 PM Closeout)
 */
export function generateMissingDPRWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('DPR-MISS', data.entityId || data.projectName || data.reference)
  const dateStr = data.date || new Date().toISOString().split('T')[0]

  const lines: (string | null)[] = [
    `🏗️ *PILLARPRO ENTERPRISE | SITE REPORTING DISCIPLINE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨 *DAILY PROGRESS REPORT (DPR) MISSING (8:00 PM CHECK)*`,
    ``,
    `📋 *Site Particulars:*`,
    `• *Project / Package*: *${data.projectName || data.reference || 'Active Site Package'}*`,
    `• *Log Date*: ${dateStr}`,
    `• *Status*: ⚠️ *No DPR Logged as of 8:00 PM Cutoff*`,
    ``,
    `⚖️ *Contractual & Legal Risk:*`,
    `Contemporaneous site records are mandatory under CPWD GCC Clause 5.2 and FIDIC Sub-Clause 20.1. Failure to log daily activities, impediments, and idle machinery prevents valid Extension of Time (EOT) and financial claims.`,
    ``,
    `📌 *Mandated Immediate Action:*`,
    `1. Site Engineer / Supervisor must log today's progress notes & photos immediately in PillarPro.`,
    `2. Record any weather halts, right-of-way hindrances, or machine idle hours.`,
    `3. Verify daily labour muster roll attendance before shift closeout.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Site Operations Discipline`,
    `_PillarPro Site Operations & Project Shield_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 9. Enterprise Critical Material Reorder Level Alert
 */
export function generateInventoryReorderWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('MAT-LOW', data.entityId || data.itemName || data.reference)
  const currentStockStr = data.currentStock != null ? `${data.currentStock} ${data.unit || 'units'}` : 'Depleted'
  const minStockStr = data.minimumStock != null ? `${data.minimumStock} ${data.unit || 'units'}` : 'Threshold'

  const lines: (string | null)[] = [
    `📦 *PILLARPRO ENTERPRISE | SITE STORE & SUPPLY CHAIN*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨 *CRITICAL MATERIAL REORDER ALERT: SAFETY BUFFER BREACHED*`,
    ``,
    `📋 *Material Details:*`,
    `• *Item Description*: *${data.itemName || data.reference || 'Site Material'}*`,
    data.itemCode ? `• *Material Code*: ${data.itemCode}` : null,
    data.projectName ? `• *Site Location*: ${data.projectName}` : null,
    ``,
    `📊 *Inventory Status:*`,
    `• *Current On-Hand Stock*: ⚠️ *${currentStockStr}*`,
    `• *Safety Reorder Threshold*: ${minStockStr}`,
    ``,
    `⚠️ *Execution Impact Assessment:*`,
    `Exhaustion of this critical material will halt active structural execution (casting/pouring/reinforcement), idling skilled labour and heavy machinery.`,
    ``,
    `📌 *Recommended Procurement Action:*`,
    `1. Issue immediate Purchase Order (PO) to approved vendor in Supplier Khata.`,
    `2. Expedite gate entry / Goods Received Note (GRN) for incoming transit dumpers.`,
    `3. Update site store ledger in PillarPro Store Management.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Store & Supply Shield`,
    `_PillarPro Store & Inventory Automation_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 10. Enterprise Heavy Plant & Machinery Maintenance / Compliance Alert
 */
export function generateMachineryAlertWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('MCH-ALRT', data.entityId || data.assetName || data.reference)
  const meterStr = data.currentMeter != null ? `${data.currentMeter}` : 'N/A'

  const isServiceAlert = data.complianceDocType === 'service' || (data.hoursSinceLastService != null && data.hoursSinceLastService > 0)
  const docTypeLabel =
    data.complianceDocType === 'insurance'
      ? 'Vehicle Insurance Expiry'
      : data.complianceDocType === 'fitness'
      ? 'Fitness Certificate Expiry'
      : data.complianceDocType === 'puc'
      ? 'Pollution Under Control (PUC) Expiry'
      : 'Preventive Engine Service Interval'

  const lines: (string | null)[] = [
    `🚜 *PILLARPRO ENTERPRISE | PLANT & FLEET SHIELD*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ *HEAVY MACHINERY: ${isServiceAlert ? 'PREVENTIVE SERVICE DUE' : 'STATUTORY COMPLIANCE EXPIRING'}*`,
    ``,
    `📋 *Equipment Particulars:*`,
    `• *Asset / Machinery*: *${data.assetName || data.reference || 'Fleet Asset'}*`,
    data.registrationNumber ? `• *Registration / Fleet No*: ${data.registrationNumber}` : null,
    data.projectName ? `• *Assigned Site*: ${data.projectName}` : null,
    `• *Current Meter Reading*: ${meterStr} (Hrs/Km)`,
    ``,
    `🚨 *Alert Specifics:*`,
    `• *Type*: *${docTypeLabel}*`,
    data.targetDate ? `• *Expiration Date*: ⚠️ *${data.targetDate}* (${data.daysRemaining != null ? `${data.daysRemaining} days left` : 'Due'})` : null,
    data.hoursSinceLastService != null ? `• *Run Since Last Service*: ⚠️ *${data.hoursSinceLastService} Hrs/Km* (Interval: ${data.serviceIntervalMeter || 250})` : null,
    ``,
    `⚠️ *Operational & Legal Risk:*`,
    isServiceAlert
      ? `Overdue engine service causes severe hydraulic failure, turbocharger seizure, and catastrophic downtime on active highway/building projects.`
      : `Operating commercial construction vehicles with expired documentation invites heavy RTO penalties, seizure under Motor Vehicles Act, and denial of third-party insurance claims.`,
    ``,
    `📌 *Mandated Fleet Action:*`,
    isServiceAlert
      ? `1. Schedule immediate 250h/500h preventive oil, fuel filter & lube service.`
      : `1. Initiate commercial insurance / fitness certificate / PUC renewal immediately.`,
    `2. Update machinery maintenance log in PillarPro Fleet Tracker.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Fleet Compliance Channel`,
    `_PillarPro Fleet & Plant Management_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * 11. Enterprise Saturday Labour Payout Summary (4:00 PM IST)
 */
export function generateLabourPayoutWhatsAppText(data: WhatsAppAlertPayload): string {
  const auditCode = generateAuditCode('WAGE-SUM', data.entityId || data.projectName || data.reference)
  const totalWagesStr = data.grossWageLiability != null ? formatINR(data.grossWageLiability) : 'N/A'
  const regularWagesStr = data.regularWages != null ? formatINR(data.regularWages) : 'N/A'
  const otWagesStr = data.otWages != null ? formatINR(data.otWages) : '₹0.00'
  const cessStr = data.bocwCessEstimate != null ? formatINR(data.bocwCessEstimate) : '₹0.00'

  const lines: (string | null)[] = [
    `👷 *PILLARPRO ENTERPRISE | WEEKLY LABOUR MUSTER ROLL*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💼 *SATURDAY WAGE PAYOUT & STATUTORY SUMMARY (4:00 PM)*`,
    ``,
    `📋 *Deployment Particulars:*`,
    `• *Site / Project*: *${data.projectName || data.reference || 'Active Site'}*`,
    data.weekStart && data.weekEnd ? `• *Billing Period*: ${data.weekStart} to ${data.weekEnd}` : null,
    `• *Active Workers Logged*: ${data.totalWorkers ?? 0}`,
    `• *Total Shift Mandays*: ${data.totalMandays ?? 0} days`,
    `• *Overtime (OT) Hours*: ${data.totalOTHours ?? 0} hrs`,
    ``,
    `💰 *Disbursement Liability Breakdown:*`,
    `• *Regular Wage Liability*: ${regularWagesStr}`,
    `• *Overtime Wage Accrual*: ${otWagesStr}`,
    `• *Total Weekly Cash Payout*: *${totalWagesStr}*`,
    `• *1% BOCW Cess Provision*: ${cessStr}`,
    ``,
    `📌 *Site Payout Protocol:*`,
    `1. Disburse cash/UPI wages to labour gangs against muster roll signatures.`,
    `2. Retain 1% BOCW Cess compliance record for government audit.`,
    `3. Log wage payment disbursement vouchers in PillarPro Daily-Wage Ledger.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 *Audit Code*: ${auditCode} • Authorized Payroll Summary`,
    `_PillarPro Labour Attendance & Wage Engine_`,
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * Master dispatcher for formatted alert text based on type.
 */
export function generateWhatsAppAlertText(
  alertType:
    | 'bg_expiry'
    | 'clause_notice'
    | 'ra_bill'
    | 'ra_bill_delayed'
    | 'supplier_credit'
    | 'payment_advice'
    | 'dpr_missing'
    | 'inventory_reorder'
    | 'machinery_alert'
    | 'labour_payout'
    | 'text'
    | string,
  data: WhatsAppAlertPayload
): string {
  switch (alertType) {
    case 'bg_expiry':
      return generateBankGuaranteeWhatsAppText(data)
    case 'clause_notice':
      return generateClauseNoticeWhatsAppText(data)
    case 'ra_bill':
      return generateRABillWhatsAppText(data)
    case 'ra_bill_delayed':
      return generateDelayedRABillWhatsAppText(data)
    case 'supplier_credit':
      return generateSupplierCreditLimitWhatsAppText(data)
    case 'payment_advice':
      return generateVendorPaymentAdviceWhatsAppText(data)
    case 'dpr_missing':
      return generateMissingDPRWhatsAppText(data)
    case 'inventory_reorder':
      return generateInventoryReorderWhatsAppText(data)
    case 'machinery_alert':
      return generateMachineryAlertWhatsAppText(data)
    case 'labour_payout':
      return generateLabourPayoutWhatsAppText(data)
    case 'text':
    default:
      return generateEnterpriseExecutiveAlertText(data)
  }
}

