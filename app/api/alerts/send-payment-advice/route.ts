import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendVendorPaymentAdvice } from '@/lib/alerts/vendorPaymentAdvice'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      supplierId,
      supplierName,
      recipientPhone,
      amount,
      paymentMode,
      reference,
      date,
      projectName,
      updatedBalance,
      organizationId,
      projectId,
    } = body

    if (!supplierId || !amount) {
      return NextResponse.json(
        { error: 'supplierId and amount are required to dispatch payment advice.' },
        { status: 400 }
      )
    }

    const result = await sendVendorPaymentAdvice(supabase, {
      supplierId,
      supplierName: supplierName || 'Supplier',
      recipientPhone: recipientPhone || process.env.WHATSAPP_ALERT_RECIPIENT_PHONE || '',
      amount: Number(amount),
      paymentMode,
      reference,
      date,
      projectName,
      updatedBalance: updatedBalance != null ? Number(updatedBalance) : undefined,
      organizationId,
      projectId,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch payment advice' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp payment advice dispatched successfully.',
      messageId: result.messageId,
    })
  } catch (err: any) {
    console.error('[SEND PAYMENT ADVICE ERROR]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error dispatching payment advice' },
      { status: 500 }
    )
  }
}
