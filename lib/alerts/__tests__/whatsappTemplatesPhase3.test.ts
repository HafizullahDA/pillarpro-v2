import { describe, it, expect } from 'vitest'
import {
  generateMissingDPRWhatsAppText,
  generateInventoryReorderWhatsAppText,
  generateMachineryAlertWhatsAppText,
  generateLabourPayoutWhatsAppText,
  generateWhatsAppAlertText,
} from '../../whatsappTemplates'

describe('WhatsApp Templates Phase 3 (Site Operations & Fleet)', () => {
  it('generates high-authority missing DPR alert (8:00 PM cutoff)', () => {
    const text = generateMissingDPRWhatsAppText({
      projectName: 'Highway NH-44 Widening',
      date: '2026-10-05',
      entityId: 'proj-1',
    })

    expect(text).toContain('DAILY PROGRESS REPORT (DPR) MISSING (8:00 PM CHECK)')
    expect(text).toContain('Highway NH-44 Widening')
    expect(text).toContain('CPWD GCC Clause 5.2')
    expect(text).toContain('FIDIC Sub-Clause 20.1')
    expect(text).toContain('DPR-MISS-')
  })

  it('generates critical material reorder alert', () => {
    const text = generateInventoryReorderWhatsAppText({
      itemName: 'UltraTech OPC 43 Cement',
      itemCode: 'MAT-CEM-01',
      projectName: 'Highway NH-44',
      currentStock: 40,
      minimumStock: 200,
      unit: 'bags',
      entityId: 'inv-cement',
    })

    expect(text).toContain('CRITICAL MATERIAL REORDER ALERT')
    expect(text).toContain('UltraTech OPC 43 Cement')
    expect(text).toContain('40 bags')
    expect(text).toContain('200 bags')
    expect(text).toContain('Purchase Order (PO)')
    expect(text).toContain('MAT-LOW-')
  })

  it('generates machinery preventive service and compliance alerts', () => {
    const text = generateMachineryAlertWhatsAppText({
      assetName: 'Tata Hitachi ZX210 Excavator',
      registrationNumber: 'JK02-EX-1001',
      projectName: 'Highway NH-44',
      currentMeter: 1520,
      complianceDocType: 'service',
      hoursSinceLastService: 270,
      serviceIntervalMeter: 250,
      entityId: 'mch-1',
    })

    expect(text).toContain('HEAVY MACHINERY: PREVENTIVE SERVICE DUE')
    expect(text).toContain('Tata Hitachi ZX210 Excavator')
    expect(text).toContain('270 Hrs/Km')
    expect(text).toContain('MCH-ALRT-')
  })

  it('generates Saturday weekly labour payout and 1% BOCW Cess summary', () => {
    const text = generateLabourPayoutWhatsAppText({
      projectName: 'Smart City Road',
      weekStart: '2026-09-29',
      weekEnd: '2026-10-05',
      totalWorkers: 28,
      totalMandays: 154,
      totalOTHours: 42,
      grossWageLiability: 125000,
      regularWages: 115000,
      otWages: 10000,
      bocwCessEstimate: 1250,
      entityId: 'proj-1',
    })

    expect(text).toContain('SATURDAY WAGE PAYOUT & STATUTORY SUMMARY (4:00 PM)')
    expect(text).toContain('Smart City Road')
    expect(text).toContain('28')
    expect(text).toContain('154 days')
    expect(text).toContain('1% BOCW Cess Provision')
    expect(text).toContain('WAGE-SUM-')
  })

  it('routes Phase 3 alert types through generateWhatsAppAlertText master dispatcher', () => {
    const dpr = generateWhatsAppAlertText('dpr_missing', {
      projectName: 'Test Project',
      date: '2026-10-05',
    })
    expect(dpr).toContain('DAILY PROGRESS REPORT (DPR) MISSING')

    const inv = generateWhatsAppAlertText('inventory_reorder', {
      itemName: 'HSD Diesel',
      currentStock: 300,
      minimumStock: 500,
      unit: 'liters',
    })
    expect(inv).toContain('CRITICAL MATERIAL REORDER ALERT')

    const mch = generateWhatsAppAlertText('machinery_alert', {
      assetName: 'JCB 3DX Super',
      complianceDocType: 'insurance',
      targetDate: '2026-10-12',
      daysRemaining: 7,
    })
    expect(mch).toContain('STATUTORY COMPLIANCE EXPIRING')

    const wage = generateWhatsAppAlertText('labour_payout', {
      projectName: 'Test Project',
      grossWageLiability: 50000,
      totalWorkers: 10,
    })
    expect(wage).toContain('SATURDAY WAGE PAYOUT')
  })
})
