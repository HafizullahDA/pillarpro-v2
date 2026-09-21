/**
 * PillarPro Environment-Based Feature Flags
 *
 * Provides typed, centralized control over optional or modular capabilities
 * without requiring commenting/uncommenting code in production components.
 *
 * Each flag defaults to true (enabled) unless explicitly set to 'false' in environment variables.
 */

export const FEATURES = {
  /**
   * Multimodal receipt scanning via PillarVision™ Document Intelligence.
   * Toggle with NEXT_PUBLIC_ENABLE_OCR="false"
   */
  aiReceiptScanner: process.env.NEXT_PUBLIC_ENABLE_OCR !== 'false',

  /**
   * Bank Guarantee, FDR, and EMD tracking with 30-day proactive expiry radar.
   * Toggle with NEXT_PUBLIC_ENABLE_BG !== 'false'
   */
  bankGuarantees: process.env.NEXT_PUBLIC_ENABLE_BG !== 'false',

  /**
   * Daily-wage labor muster roll and wage disbursement ledger.
   * Toggle with NEXT_PUBLIC_ENABLE_WAGES !== 'false'
   */
  wageLedger: process.env.NEXT_PUBLIC_ENABLE_WAGES !== 'false',

  /**
   * Partner capital contributions, site draw accounts, and equity parity tracking.
   * Toggle with NEXT_PUBLIC_ENABLE_PARTNERS !== 'false'
   */
  partnerCapital: process.env.NEXT_PUBLIC_ENABLE_PARTNERS !== 'false',

  /**
   * CPWD Form 26 Cumulative Measurement Book billing mode.
   * Toggle with NEXT_PUBLIC_ENABLE_CUMULATIVE_BILLING !== 'false'
   */
  cumulativeBilling: process.env.NEXT_PUBLIC_ENABLE_CUMULATIVE_BILLING !== 'false',
} as const

export type FeatureFlag = keyof typeof FEATURES

