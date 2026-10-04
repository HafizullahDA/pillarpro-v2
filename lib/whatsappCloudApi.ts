/**
 * Meta WhatsApp Cloud API Client for PillarPro Enterprise.
 * Dispatches real-time automated push notifications for:
 * - Bank Guarantee (BG/FDR) expiry warnings (30/15/7 days)
 * - Clause 5 / statutory 14-day notice deadlines
 * - RA Bill status updates and treasury disbursements
 */

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  recipientPhone?: string
  error?: string
}

/**
 * Normalizes Indian and international phone numbers into Meta E.164 format (without '+').
 * Examples:
 *   "+91 98765 43210" -> "919876543210"
 *   "09876543210"     -> "919876543210"
 *   "9876543210"      -> "919876543210"
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return ''
  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '')

  // If starts with 0 (Indian local prefix) and is 11 digits, strip 0 and prepend 91
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '91' + digits.slice(1)
  }

  // If 10 digits (standard Indian mobile without country code), prepend 91
  if (digits.length === 10) {
    digits = '91' + digits
  }

  return digits
}

/**
 * Low-level Meta Graph API caller.
 */
export async function sendRawWhatsAppPayload(payload: Record<string, any>): Promise<WhatsAppSendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiToken = process.env.WHATSAPP_API_TOKEN

  if (!phoneId || !apiToken) {
    console.warn('[WHATSAPP CLOUD API] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_API_TOKEN in environment.')
    return {
      success: false,
      error: 'WhatsApp Cloud API credentials not configured in environment variables.',
    }
  }

  const endpoint = `https://graph.facebook.com/v22.0/${phoneId}/messages`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error?.error_user_msg || `Meta API HTTP ${res.status}`
      console.error('[WHATSAPP CLOUD API ERROR]', errMsg, JSON.stringify(data))
      return {
        success: false,
        error: errMsg,
      }
    }

    const messageId = data?.messages?.[0]?.id

    return {
      success: true,
      messageId,
      recipientPhone: payload.to,
    }
  } catch (err: any) {
    console.error('[WHATSAPP CLOUD API EXCEPTION]', err)
    return {
      success: false,
      error: err?.message || 'Network exception while connecting to Meta WhatsApp Cloud API.',
    }
  }
}

/**
 * Sends a standard formatted text message to a verified recipient.
 */
export async function sendWhatsAppTextMessage(params: {
  to: string
  text: string
}): Promise<WhatsAppSendResult> {
  const cleanTo = normalizeWhatsAppNumber(params.to)
  if (!cleanTo) {
    return { success: false, error: 'Invalid or missing recipient phone number.' }
  }

  return sendRawWhatsAppPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: false,
      body: params.text,
    },
  })
}

/**
 * Sends a pre-approved template message (required for initial outbound business conversations).
 */
export async function sendWhatsAppTemplateMessage(params: {
  to: string
  templateName: string
  languageCode?: string
  components?: any[]
}): Promise<WhatsAppSendResult> {
  const cleanTo = normalizeWhatsAppNumber(params.to)
  if (!cleanTo) {
    return { success: false, error: 'Invalid or missing recipient phone number.' }
  }

  return sendRawWhatsAppPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: params.templateName,
      language: {
        code: params.languageCode || 'en_US',
      },
      components: params.components || [],
    },
  })
}

// ==============================================================================
// DOMAIN-SPECIFIC HIGH-STAKES CONTRACTOR ALERT DISPATCHERS
// ==============================================================================

/**
 * Dispatch Bank Guarantee (BG / FDR) Expiry Warning.
 */
export async function sendBankGuaranteeExpiryAlert(params: {
  to: string
  bgReference: string
  depositType: string
  amount: number
  issuingBank?: string | null
  expiryDate: string
  daysRemaining: number
  projectName?: string | null
}): Promise<WhatsAppSendResult> {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(params.amount)

  const text = [
    `🚨 *PILLARPRO CRITICAL ALERT: BANK GUARANTEE EXPIRING*`,
    ``,
    `• *Reference / BG No.*: ${params.bgReference}`,
    `• *Deposit Type*: ${params.depositType.replace(/_/g, ' ').toUpperCase()}`,
    `• *Pledged Amount*: ${formattedAmount}`,
    params.issuingBank ? `• *Issuing Bank*: ${params.issuingBank}` : null,
    params.projectName ? `• *Project Site*: ${params.projectName}` : null,
    `• *Expiry Date*: ${params.expiryDate} (*${params.daysRemaining} days remaining*)`,
    ``,
    `⚠️ *Legal Directive*: Under CPWD GCC Clause 1A / FIDIC Sub-Clause 4.2, guarantees must be extended at least 14 days prior to expiry. Failure to renew entitles the Engineer-in-Charge to encash the guarantee into treasury cash retention.`,
    ``,
    `_Sent automatically from your PillarPro Enterprise Command Center._`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppTextMessage({
    to: params.to,
    text,
  })
}

/**
 * Dispatch Clause 5 / Statutory Notice Deadline Approaching Alert.
 */
export async function sendClauseNoticeDeadlineAlert(params: {
  to: string
  letterNumber: string
  subject: string
  deadlineDate: string
  daysRemaining: number
  clauseTitle?: string | null
  projectName?: string | null
}): Promise<WhatsAppSendResult> {
  const text = [
    `⏱️ *PILLARPRO LEGAL NOTICE ALERT: TIME-BAR APPROACHING*`,
    ``,
    `• *Letter Ref*: ${params.letterNumber}`,
    params.clauseTitle ? `• *Contract Clause*: ${params.clauseTitle}` : null,
    params.projectName ? `• *Project*: ${params.projectName}` : null,
    `• *Subject*: ${params.subject}`,
    `• *Reply Deadline*: ${params.deadlineDate} (*${params.daysRemaining} days left*)`,
    ``,
    `⚠️ *Statutory Risk*: In contemporary Indian construction arbitration (Union of India v. Rai Engineering), failure to lodge written notices within the stipulated window creates an irrebuttable presumption of waiver. Submit your response letter before the deadline.`,
    ``,
    `_Sent automatically from your PillarPro Enterprise Command Center._`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppTextMessage({
    to: params.to,
    text,
  })
}

/**
 * Dispatch RA Bill Status Update Alert.
 */
export async function sendRABillStatusAlert(params: {
  to: string
  billNumber: string
  status: string
  certifiedAmount: number
  receivedAmount?: number | null
  projectName?: string | null
  date?: string | null
}): Promise<WhatsAppSendResult> {
  const formatCur = (v: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(v)

  const text = [
    `📄 *PILLARPRO FINANCIAL UPDATE: RA BILL ${params.status.toUpperCase()}*`,
    ``,
    `• *Bill Number*: ${params.billNumber}`,
    params.projectName ? `• *Project*: ${params.projectName}` : null,
    `• *Work Certified*: ${formatCur(params.certifiedAmount)}`,
    params.receivedAmount != null ? `• *Gross Released*: ${formatCur(params.receivedAmount)}` : null,
    params.date ? `• *Date*: ${params.date}` : null,
    `• *Current Status*: ${params.status.replace(/_/g, ' ').toUpperCase()}`,
    ``,
    `_Sent from your PillarPro Enterprise Account._`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppTextMessage({
    to: params.to,
    text,
  })
}

