import { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PillarPro Civil Contractor Financial & Operations ERP.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 14, 2026'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo theme="dark" href="/" size="sm" subtitle="Privacy Policy" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="space-y-4 mb-10 pb-8 border-b border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: <span className="text-slate-300 font-medium">{lastUpdated}</span> • Effective Date: January 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-slate-300 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">1.</span> Introduction & Scope
            </h2>
            <p>
              Welcome to <strong className="text-white">PillarPro</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). PillarPro provides an enterprise multi-tenant financial and operational management software platform built specifically for civil infrastructure contractors, partnership firms, and construction enterprises.
            </p>
            <p>
              This Privacy Policy explains how we collect, store, safeguard, and manage proprietary financial, operational, and organizational data when you access or use our web applications, mobile interfaces, and associated cloud services (&quot;Service&quot;).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">2.</span> Multi-Tenant Data Isolation & Protection
            </h2>
            <p>
              We treat your contracting business&apos;s financial records, tender profit margins, and contractor accounts with extreme confidentiality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">Row Level Security (RLS):</strong> Every piece of data (projects, RA bills, supplier transactions, expenses, muster rolls) is cryptographically bound to your designated Organization ID. No outside contractor or tenant can query or access your records.
              </li>
              <li>
                <strong className="text-white">Role-Based Access Control (RBAC):</strong> Within your firm, access is segregated by user roles. Site supervisors are restricted from viewing overall tender margins, central partner profit splits, or bank treasury ledgers.
              </li>
              <li>
                <strong className="text-white">Zero Data Selling:</strong> We do not sell, rent, monetize, or broker your company&apos;s or workers&apos; information to advertisers or external commercial third parties under any circumstance.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">3.</span> Information We Collect
            </h2>
            <div className="space-y-3">
              <p>To deliver our enterprise ERP functionalities, we process the following categories of information:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h3 className="font-semibold text-white text-sm">A. Account Credentials</h3>
                  <p className="text-xs text-slate-400">
                    Firm name, authorized representative name, business email address, and encrypted passwords.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h3 className="font-semibold text-white text-sm">B. Project & Financial Data</h3>
                  <p className="text-xs text-slate-400">
                    Running Account (RA) bills, statutory deductions (TDS, GST TDS, Cess, Retention), partner equity capital balances, and payment tranches.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h3 className="font-semibold text-white text-sm">C. Supplier & Site Operations</h3>
                  <p className="text-xs text-slate-400">
                    Supplier ledger khatas, material delivery vouchers, site fuel slips, equipment rentals, and project expenses.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h3 className="font-semibold text-white text-sm">D. Manpower Muster Rolls</h3>
                  <p className="text-xs text-slate-400">
                    Worker attendance registers, daily wage rates, advance disbursements, and overtime tracking for job sites.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">4.</span> Camera & Automated Document Scanning
            </h2>
            <p>
              When authorized, PillarPro uses your mobile or tablet camera to capture site fuel receipts, material weighment slips, and physical vouchers:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Images are compressed client-side before transmission to minimize mobile data consumption on job sites.</li>
              <li>Receipt images are processed strictly for Optical Character Recognition (OCR) extraction (date, vendor, amount, GSTIN) and attached to the project expense record.</li>
              <li>Receipt imagery is never used to train public foundation models.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">5.</span> Compliance with DPDP Act, 2023 (India)
            </h2>
            <p>
              In accordance with the <em>Digital Personal Data Protection Act, 2023</em> of India, PillarPro acts as a Data Processor for organizational data provided by our contracting clients. As a customer:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>You have the right to request access to and summary of your firm&apos;s stored data.</li>
              <li>You have the right to correct inaccurate records or worker entries at any time via the ERP interface.</li>
              <li>You have the right to request complete data erasure upon termination of your subscription.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">6.</span> Sub-processors & Infrastructure Partners
            </h2>
            <p>
              We partner with trusted, SOC-2 compliant cloud infrastructure providers to run our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li><strong className="text-white">Database & Authentication:</strong> Supabase Inc. (PostgreSQL database with automated point-in-time recovery and SSL encryption).</li>
              <li><strong className="text-white">Hosting & Edge CDN:</strong> Vercel Inc. (TLS 1.3 encrypted web delivery, edge DDoS protection, and privacy-first cookie-less analytics).</li>
              <li><strong className="text-white">Document & Challan Processing:</strong> Secure cloud optical compute infrastructure (ephemeral document transcription processing, zero data retention).</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">7.</span> Data Retention & Ownership
            </h2>
            <p>
              <strong className="text-white">You own all your data.</strong> All project schedules, RA bill histories, muster rolls, and supplier accounts entered into PillarPro remain the exclusive property of your contracting firm. If you cancel your subscription, you may export your complete ledger records before account deactivation.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">8.</span> Contact for Privacy Inquiries
            </h2>
            <p>
              If you have questions regarding this Privacy Policy or wish to exercise data rights regarding your contracting firm workspace, please contact our data governance team at{' '}
              <a href="mailto:contact@pillarprojk.com" className="text-blue-400 hover:text-blue-300 underline font-medium">
                contact@pillarprojk.com
              </a>.
            </p>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © 2026 PillarPro. Built for Infrastructure Contractors.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

