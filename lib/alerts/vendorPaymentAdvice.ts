/**
 * Vendor Payment Advice Dispatcher
 * Dispatches an official WhatsApp Payment Advice receipt to vendors upon payment registration.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { generateVendorPaymentAdviceWhatsAppText } from '@/lib/whatsappTemplates'
import { sendWhatsAppTextMessage } from '@/lib/whatsappCloudApi'
import { recordDispatchLog } from './ledger'

export interface VendorPaymentAdviceParams {
  supplierId: string
  supplierName: string
  recipientPhone: string
  amount: number
  paymentMode?: string
  reference?: string
  date?: string
  projectName?: string
  updatedBalance?: number
  organizationId?: string | null
  projectId?: string | null
}

export async function sendVendorPaymentAdvice(
  supabase: SupabaseClient,
  params: VendorPaymentAdviceParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!params.recipientPhone) {
    return { success: false, error: 'Supplier does not have a contact phone number registered.' }
  }

  const messageText = generateVendorPaymentAdviceWhatsAppText({
    reference: params.reference || `Payment-${params.supplierId.slice(0, 8)}`,
    supplierName: params.supplierName,
    amount: params.amount,
    date: params.date || new Date().toISOString().split('T')[0],
    paymentMode: params.paymentMode,
    projectName: params.projectName,
    updatedBalance: params.updatedBalance,
    entityId: params.supplierId,
  })

  try {
    const result = await sendWhatsAppTextMessage({
      to: params.recipientPhone,
      text: messageText,
    })

    // Record into dispatch ledger
    await recordDispatchLog(supabase, {
      organization_id: params.organizationId,
      project_id: params.projectId,
      entity_type: 'supplier',
      entity_id: params.supplierId,
      entity_reference: params.reference || `PAY-${params.amount}`,
      milestone_key: 'T_0', // Instant transaction trigger
      channel: 'whatsapp',
      recipient_phone: params.recipientPhone,
      status: result.success ? 'dispatched' : 'failed',
      error_message: result.error || null,
      meta_message_id: result.messageId || null,
      payload_snapshot: {
        amount: params.amount,
        paymentMode: params.paymentMode,
        reference: params.reference,
        updatedBalance: params.updatedBalance,
      },
    })

    return result
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment advice dispatch exception' }
  }
}
