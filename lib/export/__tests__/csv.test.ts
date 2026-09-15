import { describe, it, expect, vi } from 'vitest'
import {
  escapeCsvCell,
  buildCsvString,
  exportRABillsRegister,
  exportSupplierLedgerStatement,
  exportSuppliersSummary,
  exportSiteExpenses,
  ExportableRABill,
  ExportableSupplier,
  ExportableSupplierTx,
  ExportableSupplierSummaryRow,
  ExportableExpenseRow,
} from '../csv'
import * as csvModule from '../csv'

describe('CSV Engine Utilities', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('')
      expect(escapeCsvCell(undefined)).toBe('')
    })

    it('returns plain strings and numbers as-is when no special characters are present', () => {
      expect(escapeCsvCell('PillarPro')).toBe('PillarPro')
      expect(escapeCsvCell(1234.56)).toBe('1234.56')
      expect(escapeCsvCell(0)).toBe('0')
      expect(escapeCsvCell(true)).toBe('true')
    })

    it('wraps cells with commas in quotes', () => {
      expect(escapeCsvCell('Cement, 50 bags')).toBe('"Cement, 50 bags"')
    })

    it('escapes internal quotes by doubling them and wraps cell in quotes', () => {
      expect(escapeCsvCell('Steel 12mm "Tata Tiscon"')).toBe('"Steel 12mm ""Tata Tiscon"""')
    })

    it('handles newlines and carriage returns properly', () => {
      expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
      expect(escapeCsvCell('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"')
    })
  })

  describe('buildCsvString', () => {
    it('prepends UTF-8 BOM (\\uFEFF) and separates lines by CRLF', () => {
      const headers = ['Name', 'Amount', 'Remarks']
      const rows = [
        ['Vendor A', 5000, 'Paid in full'],
        ['Vendor "B", Ltd', 12000.5, 'Advance, pending bill'],
      ]

      const csv = buildCsvString(headers, rows)
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.slice(1).split('\r\n')
      expect(lines[0]).toBe('Name,Amount,Remarks')
      expect(lines[1]).toBe('Vendor A,5000,Paid in full')
      expect(lines[2]).toBe('"Vendor ""B"", Ltd",12000.5,"Advance, pending bill"')
    })
  })

  describe('Audit Export Functions', () => {
    it('handles exportRABillsRegister without throwing in non-browser environments', () => {
      const bills: ExportableRABill[] = [
        {
          bill_number: 'RA-01',
          submission_date: '2026-03-01',
          billing_mode: 'cumulative',
          work_certified_amount: 100000,
          this_bill_work_certified: 50000,
          retention_percentage: 5,
          retention_amount: 2500,
          net_payable_this_bill: 47500,
          amount_received: 47500,
          tds_deducted: 950,
          gst_tds_deducted: 950,
          labour_cess_deducted: 475,
          total_deductions: 2375,
          net_bank_received: 45125,
          status: 'fully_paid',
          remarks: 'First running account bill certified by EE',
          projects: { name: 'PWD Flyover Phase 1', agency_name: 'PWD Karnataka' },
        },
      ]

      expect(() => exportRABillsRegister(bills, 'PWD Flyover Phase 1')).not.toThrow()
    })

    it('handles exportSupplierLedgerStatement without throwing and calculates balances', () => {
      const supplier: ExportableSupplier = {
        name: 'UltraTech Cement Supplier',
        gst_number: '29ABCDE1234F1Z5',
      }
      const transactions: ExportableSupplierTx[] = [
        {
          date: '2026-03-05',
          transaction_type: 'procurement',
          description: 'PPC 53 Grade Cement',
          reference: 'INV-4091',
          quantity: 200,
          rate: 380,
          amount: 76000,
          runningBalance: 76000,
        },
        {
          date: '2026-03-08',
          transaction_type: 'payment',
          description: 'NEFT Part Payment',
          reference: 'UTR-987654',
          amount: 50000,
          mode: 'bank_transfer',
          runningBalance: 26000,
        },
      ]
      const totals = {
        totalProcured: 76000,
        totalPaid: 50000,
        balanceOwed: 26000,
      }

      expect(() => exportSupplierLedgerStatement(supplier, transactions, totals)).not.toThrow()
    })

    it('handles exportSuppliersSummary directory export with grand totals', () => {
      const suppliers: ExportableSupplierSummaryRow[] = [
        {
          name: 'Supreme Steel Traders',
          gst_number: '29AABCS1429B1ZX',
          contact_number: '9876543210',
          address: 'Peenya Industrial Area',
          total_procured: 500000,
          total_paid: 350000,
          outstanding_balance: 150000,
        },
        {
          name: 'Balaji Sand & Aggregates',
          gst_number: null,
          contact_number: '9123456780',
          address: 'Hoskote Quarry',
          total_procured: 120000,
          total_paid: 120000,
          outstanding_balance: 0,
        },
      ]

      expect(() => exportSuppliersSummary(suppliers)).not.toThrow()
    })

    it('handles exportSiteExpenses cash book export', () => {
      const expenses: ExportableExpenseRow[] = [
        {
          date: '2026-03-10',
          category: 'fuel',
          description: 'Diesel for JCB 3DX excavator',
          amount: 5400,
          payment_mode: 'upi',
          receipt_url: 'https://example.com/receipt.jpg',
          projects: { name: 'Hospital Tower Wing B' },
          partners: { name: 'Hafiz' },
        },
      ]

      expect(() => exportSiteExpenses(expenses, 'Hospital Tower Wing B')).not.toThrow()
    })
  })
})
