export type LedgerEntryType = 'bill_passed' | 'payment_voucher' | 'advance_adjusted'

export interface LedgerTransaction {
  id: string
  date: string
  type: LedgerEntryType
  voucher_or_bill_number: string
  bill_type?: 'running' | 'first_and_final' | 'final'
  description: string

  // Account I / Value of work done
  gross_work_certified: number

  // Item 2 & 3: Advances
  advance_payments: number

  // Item 5 & 8a/8b: Deductions & Recoveries
  retention_withheld: number
  store_material_recoveries: number
  statutory_taxes: number
  other_deductions: number
  total_deductions: number

  // Cash Payments
  bank_payment_disbursed: number

  // Running Ledger Account Position
  net_payable_effect: number
  running_balance_due: number

  // Audit metadata
  mb_reference?: string | null
  voucher_reference?: string | null
  remarks?: string | null
}

export interface ContractorLedgerSummary {
  totalGrossCertified: number
  totalAdvancesGranted: number
  totalRetentionHeld: number
  totalMaterialRecoveries: number
  totalStatutoryTaxes: number
  totalOtherDeductions: number
  totalAllDeductions: number
  totalBankDisbursed: number
  netBalanceOutstanding: number
  transactions: LedgerTransaction[]
}

export type DLPStatus = 'locked' | 'expiring_soon' | 'refund_due_now' | 'released'

export interface DLPItem {
  billId: string
  billNumber: string
  projectId: string
  projectName: string
  agencyName?: string | null
  actualCompletionDate: string
  dlpMonths: number
  dlpExpiryDate: string
  daysRemaining: number
  retentionAmount: number
  status: DLPStatus
}

export interface RetentionRefundClaim {
  contractorName: string
  contractorAddress?: string | null
  contractorPanGst?: string | null
  clientDepartment: string
  divisionOffice?: string | null
  projectName: string
  agreementNumber?: string | null
  finalBillNumber: string
  finalBillDate: string
  actualCompletionDate: string
  dlpMonths: number
  dlpExpiryDate: string
  retentionAmountToRelease: number
  bankAccountDetails?: {
    accountNumber: string
    ifscCode: string
    bankName: string
    branchName?: string
  }
}
