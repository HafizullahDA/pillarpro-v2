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

    // 1. Verify caller organization from verified session
    const { data: orgId } = await supabase.rpc('get_user_organization_id')
    if (!orgId) {
      return NextResponse.json(
        { error: 'Forbidden: User is not associated with an active organization.' },
        { status: 403 }
      )
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
      projectId,
    } = body

    if (!supplierId || !amount) {
      return NextResponse.json(
        { error: 'supplierId and amount are required to dispatch payment advice.' },
        { status: 400 }
      )
    }

    // 2. Ownership verification: Verify supplier belongs to caller's organization
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, phone, organization_id')
      .eq('id', supplierId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Forbidden: Supplier not found or does not belong to your organization.' },
        { status: 403 }
      )
    }

    const targetPhone =
      recipientPhone ||
      supplier.phone ||
      process.env.WHATSAPP_ALERT_RECIPIENT_PHONE ||
      ''

    const result = await sendVendorPaymentAdvice(supabase, {
      supplierId,
      supplierName: supplierName || supplier.name || 'Supplier',
      recipientPhone: targetPhone,
      amount: Number(amount),
      paymentMode,
      reference,
      date,
      projectName,
      updatedBalance: updatedBalance != null ? Number(updatedBalance) : undefined,
      organizationId: orgId, // Always bind to verified caller org, never from client body
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
