import { describe, it, expect } from 'vitest'
import {
  generateDelayedRABillWhatsAppText,
  generateSupplierCreditLimitWhatsAppText,
  generateVendorPaymentAdviceWhatsAppText,
  generateWhatsAppAlertText,
} from '../../whatsappTemplates'

describe('Phase 2 WhatsApp Templates', () => {
  it('formats Delayed RA Bill text with CPWD and MSME statutory citations', () => {
    const text30 = generateDelayedRABillWhatsAppText({
      reference: 'RA Bill #03',
      billNumber: 'RA Bill #03',
      projectName: 'Four Lane Bypass',
      date: '2026-09-01',
      daysDelayed: 35,
      workCertifiedAmount: 5000000,
      netPayableAmount: 4750000,
      outstandingBalance: 4750000,
    })

    expect(text30).toContain('RA BILL PAYMENT OVERDUE')
    expect(text30).toContain('35 days elapsed')
    expect(text30).toContain('CPWD GCC Clause 7')
    expect(text30).toContain('₹47,50,000')

    const text45 = generateDelayedRABillWhatsAppText({
      reference: 'RA Bill #01',
      billNumber: 'RA Bill #01',
      projectName: 'Medical College Wing',
      date: '2026-08-15',
      daysDelayed: 51,
      workCertifiedAmount: 10000000,
      netPayableAmount: 9500000,
      outstandingBalance: 9500000,
    })

    expect(text45).toContain('51 days elapsed')
    expect(text45).toContain('MSMED Act 2006 (Sec 15 & 16)')
    expect(text45).toContain('3x RBI Bank Rate')
  })

  it('formats Supplier Credit Limit warning text correctly', () => {
    const text = generateSupplierCreditLimitWhatsAppText({
      reference: 'Kashmir Aggregates Quarry',
      supplierName: 'Kashmir Aggregates Quarry',
      projectName: 'Flyover Package 1',
      creditLimit: 1500000,
      outstandingBalance: 1350000,
      creditUtilizationPercent: 90,
    })

    expect(text).toContain('SUPPLIER CREDIT LIMIT')
    expect(text).toContain('Kashmir Aggregates Quarry')
    expect(text).toContain('₹15,00,000')
    expect(text).toContain('₹13,50,000')
    expect(text).toContain('90.0%')
    expect(text).toContain('material dispatch hold')
  })

  it('formats Vendor Payment Advice receipt correctly', () => {
    const text = generateVendorPaymentAdviceWhatsAppText({
      reference: 'UTR99882211',
      supplierName: 'ABC Cements Ltd',
      amount: 450000,
      paymentMode: 'bank_transfer',
      date: '2026-10-05',
      projectName: 'Bypass Section 2',
      updatedBalance: 120000,
    })

    expect(text).toContain('OFFICIAL PAYMENT ADVICE')
    expect(text).toContain('ABC Cements Ltd')
    expect(text).toContain('₹4,50,000')
    expect(text).toContain('BANK TRANSFER')
    expect(text).toContain('UTR99882211')
    expect(text).toContain('₹1,20,000')
  })

  it('master generator routes Phase 2 alert types correctly', () => {
    const delayed = generateWhatsAppAlertText('ra_bill_delayed', {
      reference: 'RA-02',
      daysDelayed: 40,
    })
    expect(delayed).toContain('RA BILL PAYMENT OVERDUE')

    const credit = generateWhatsAppAlertText('supplier_credit', {
      reference: 'Steel Depot',
      creditLimit: 1000000,
    })
    expect(credit).toContain('SUPPLIER CREDIT LIMIT')

    const advice = generateWhatsAppAlertText('payment_advice', {
      reference: 'CHQ-123',
      amount: 50000,
    })
    expect(advice).toContain('OFFICIAL PAYMENT ADVICE')
  })
})
