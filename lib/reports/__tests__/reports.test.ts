import { describe, it, expect } from 'vitest'
import {
  REPORT_REGISTRY,
  ReportKey,
  ReportResult,
} from '../types'
import {
  generateReportCsv,
  formatReportCurrency,
  formatReportNumber,
} from '../reportGenerators'

describe('Professional Reporting Engine', () => {
  it('defines all 24 required standard Indian construction reports in registry', () => {
    const keys = Object.keys(REPORT_REGISTRY) as ReportKey[]
    expect(keys.length).toBe(24)

    const expectedKeys: ReportKey[] = [
      'MEASUREMENT_BOOK',
      'ABSTRACT_OF_MEASUREMENTS',
      'BOQ_PROGRESS',
      'QUANTITY_BALANCE',
      'RA_BILL_ABSTRACT',
      'RA_BILL_REGISTER',
      'PAYMENT_REGISTER',
      'CONTRACT_EVENT_REGISTER',
      'HINDRANCE_REGISTER',
      'CORRESPONDENCE_REGISTER',
      'NOTICE_REGISTER',
      'EOT_REGISTER',
      'VARIATION_REGISTER',
      'EXTRA_ITEM_REGISTER',
      'CLAIM_REGISTER',
      'EVIDENCE_REGISTER',
      'LABOUR_REGISTER',
      'MATERIAL_REGISTER',
      'MACHINERY_LOG',
      'SUPPLIER_STATEMENT',
      'BG_REGISTER',
      'SECURITY_DEPOSIT_REGISTER',
      'PROJECT_COST_REPORT',
      'PROJECT_PROFITABILITY_REPORT',
    ]

    for (const k of expectedKeys) {
      expect(REPORT_REGISTRY[k]).toBeDefined()
      expect(REPORT_REGISTRY[k].key).toBe(k)
      expect(REPORT_REGISTRY[k].title).toBeTruthy()
      expect(REPORT_REGISTRY[k].shortTitle).toBeTruthy()
      expect(REPORT_REGISTRY[k].applicableSignoffs.preparedBy).toBeTruthy()
      expect(REPORT_REGISTRY[k].applicableSignoffs.checkedBy).toBeTruthy()
      expect(REPORT_REGISTRY[k].applicableSignoffs.approvedBy).toBeTruthy()
    }
  })

  it('correctly maps 1-24 numbering across all categories', () => {
    const numbers = Object.values(REPORT_REGISTRY).map(r => r.number).sort((a, b) => a - b)
    expect(numbers).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    ])
  })

  it('formats Indian currency and decimal quantities accurately', () => {
    expect(formatReportCurrency(1000000)).toMatch(/₹\s*10,00,000\.00/)
    expect(formatReportCurrency(0)).toMatch(/₹\s*0\.00/)
    expect(formatReportCurrency(null)).toBe('₹0.00')

    expect(formatReportNumber(1250.555, 3)).toMatch(/1,250\.555/)
    expect(formatReportNumber(0, 2)).toMatch(/0\.00/)
    expect(formatReportNumber(undefined, 3)).toBe('0.000')
  })

  it('generates compliant RFC-4180 CSV with UTF-8 BOM, metadata, and attestation block', () => {
    const mockReport: ReportResult = {
      reportKey: 'HINDRANCE_REGISTER',
      reportTitle: 'Hindrance Register (Delays & Disruptions)',
      category: 'defense',
      orientation: 'landscape',
      metadata: {
        projectId: 'p-100',
        projectName: 'Baramulla-Uri Highway Widening',
        agencyName: 'PWD (R&B) Kashmir',
        contractId: 'c-200',
        agreementNumber: '04/EE/R&B/2025-26',
        employerName: 'Public Works Department',
        division: 'R&B Baramulla Division',
        reportingPeriod: 'From 01 Apr 2026 to 29 Sep 2026',
        generatedAt: '29 Sep 2026, 09:30 PM IST',
        generatedByName: 'Chief Engineer',
        generatedByEmail: 'ce@pwd.gov.in',
        generatedByRole: 'OWNER',
        preparedByTitle: 'Site Engineer (Incharge)',
        checkedByTitle: 'Assistant Engineer / Resident Engineer',
        approvedByTitle: 'Executive Engineer / Project Director',
      },
      columns: [
        { key: 'item_no', label: 'Item No' },
        { key: 'description', label: 'Nature of Hindrance' },
        { key: 'responsible_party', label: 'Responsible Entity' },
        { key: 'net_delay_days', label: 'Net Delay', format: 'number' },
      ],
      rows: [
        {
          item_no: '01',
          description: 'Electric utility poles unshifted at Km 14+200',
          responsible_party: 'PDD / Department',
          net_delay_days: 45,
        },
      ],
      totals: {
        net_delay_days: 45,
      },
      availableStatuses: ['ALL', 'OPEN', 'RESOLVED', 'CLOSED'],
      recordCount: 1,
    }

    const csvOutput = generateReportCsv(mockReport)

    // Verify UTF-8 BOM
    expect(csvOutput.startsWith('\uFEFF')).toBe(true)

    // Verify metadata block
    expect(csvOutput).toContain('REPORT TITLE,Hindrance Register (Delays & Disruptions)')
    expect(csvOutput).toContain('PROJECT,Baramulla-Uri Highway Widening')
    expect(csvOutput).toContain('CONTRACT / AGREEMENT,04/EE/R&B/2025-26')
    expect(csvOutput).toContain('REPORTING PERIOD,From 01 Apr 2026 to 29 Sep 2026')

    // Verify table headers & data
    expect(csvOutput).toContain('Item No,Nature of Hindrance,Responsible Entity,Net Delay')
    expect(csvOutput).toContain('01,Electric utility poles unshifted at Km 14+200,PDD / Department,45.000')

    // Verify totals
    expect(csvOutput).toContain('GRAND TOTAL,,,45.000')

    // Verify attestation signoff
    expect(csvOutput).toContain('ATTESTATION & SIGN-OFF BLOCK')
    expect(csvOutput).toContain('Site Engineer (Incharge)')
    expect(csvOutput).toContain('Assistant Engineer / Resident Engineer')
    expect(csvOutput).toContain('Executive Engineer / Project Director')
  })
})
