import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendBankGuaranteeExpiryAlert,
  sendClauseNoticeDeadlineAlert,
  sendRABillStatusAlert,
  sendWhatsAppTextMessage,
  normalizeWhatsAppNumber,
} from '@/lib/whatsappCloudApi'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // User profile & org
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, display_name, email')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const { alertType, recipientPhone, payload } = body

    // Determine target recipient number
    const targetPhone =
      recipientPhone ||
      process.env.WHATSAPP_ALERT_RECIPIENT_PHONE ||
      ''

    if (!targetPhone) {
      return NextResponse.json(
        {
          error:
            'No recipient phone number provided. Please enter a verified phone number or set WHATSAPP_ALERT_RECIPIENT_PHONE in environment.',
        },
        { status: 400 }
      )
    }

    let result: { success: boolean; messageId?: string; error?: string }

    switch (alertType) {
      case 'bg_expiry':
        result = await sendBankGuaranteeExpiryAlert({
          to: targetPhone,
          bgReference: payload.bgReference || 'BG Deposit',
          depositType: payload.depositType || 'performance_bank_guarantee',
          amount: Number(payload.amount) || 0,
          issuingBank: payload.issuingBank,
          expiryDate: payload.expiryDate,
          daysRemaining: Number(payload.daysRemaining) || 0,
          projectName: payload.projectName,
        })
        break

      case 'clause_notice':
        result = await sendClauseNoticeDeadlineAlert({
          to: targetPhone,
          letterNumber: payload.letterNumber || 'Letter Notice',
          subject: payload.subject || 'Contractual Notice',
          deadlineDate: payload.deadlineDate,
          daysRemaining: Number(payload.daysRemaining) || 0,
          clauseTitle: payload.clauseTitle,
          projectName: payload.projectName,
        })
        break

      case 'ra_bill':
        result = await sendRABillStatusAlert({
          to: targetPhone,
          billNumber: payload.billNumber,
          status: payload.status || 'submitted',
          certifiedAmount: Number(payload.certifiedAmount) || 0,
          receivedAmount: payload.receivedAmount != null ? Number(payload.receivedAmount) : null,
          projectName: payload.projectName,
          date: payload.date,
        })
        break

      case 'text':
      default:
        result = await sendWhatsAppTextMessage({
          to: targetPhone,
          text: payload.text || 'Test alert from PillarPro Enterprise Command Center.',
        })
        break
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 422 }
      )
    }

    // Record immutable audit trail row
    if (profile?.organization_id) {
      await logAuditEvent(supabase, {
        organizationId: profile.organization_id,
        projectId: payload.projectId || null,
        userId: user.id,
        userEmail: profile.email || user.email,
        userName: profile.display_name,
        action: 'WHATSAPP_ALERT_SENT',
        entityType: alertType === 'bg_expiry' ? 'security_deposits' : alertType === 'ra_bill' ? 'ra_bills' : 'contract_notices',
        entityId: payload.entityId || result.messageId || 'alert',
        entityIdentifier: `${alertType.toUpperCase()} Alert to +${normalizeWhatsAppNumber(targetPhone)}`,
        diffSummary: {
          alertType,
          recipient: normalizeWhatsAppNumber(targetPhone),
          messageId: result.messageId,
        },
        notes: `Automated WhatsApp push alert dispatched via Meta Cloud API (Message ID: ${result.messageId}).`,
      })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipient: normalizeWhatsAppNumber(targetPhone),
    })
  } catch (err: any) {
    console.error('[WHATSAPP DISPATCH ROUTE ERROR]', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error while dispatching WhatsApp notification.' },
      { status: 500 }
    )
  }
}

