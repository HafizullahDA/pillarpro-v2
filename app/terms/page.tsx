import { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service and Customer Agreement for PillarPro Construction ERP.',
}

export default function TermsOfServicePage() {
  const lastUpdated = 'September 14, 2026'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo theme="dark" href="/" size="sm" subtitle="Terms of Service" />
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
            Customer Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: <span className="text-slate-300 font-medium">{lastUpdated}</span> • Effective Date: January 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-slate-300 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">1.</span> Agreement to Terms
            </h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;Customer,&quot; &quot;Contractor,&quot; or &quot;User&quot;) and <strong className="text-white">PillarPro</strong> (&quot;Company,&quot; &quot;we,&quot; or &quot;us&quot;). By creating an account, accessing, or using the PillarPro ERP platform, mobile interfaces, or related services, you acknowledge that you have read, understood, and agreed to be bound by these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">2.</span> Account Registration & Firm Administration
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">Eligibility:</strong> You represent that you are authorized to bind your contracting enterprise, partnership firm, or corporate entity to these Terms.
              </li>
              <li>
                <strong className="text-white">Workspace Security:</strong> The account administrator is responsible for configuring appropriate user roles (Owner, Partner, Project Engineer, Site Supervisor) and maintaining credential confidentiality.
              </li>
              <li>
                <strong className="text-white">Account Accuracy:</strong> You agree to provide accurate, current, and complete organizational registration details.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">3.</span> Customer Data & Intellectual Property
            </h2>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="font-semibold text-white text-sm">Customer Ownership Guarantee</h3>
              <p className="text-xs text-slate-300">
                You retain all right, title, and interest in and to all proprietary information entered into your PillarPro workspace, including but not limited to tender contracts, Running Account (RA) bills, muster roll wage ledgers, partner capital balances, and supplier invoices. PillarPro claims zero ownership over your company records.
              </p>
            </div>
            <p>
              PillarPro and its licensors retain all proprietary rights, copyright, and trademarks in the PillarPro software, platform code, interface designs, algorithms, and documentation.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">4.</span> RA Billing & Statutory Calculations Disclaimer
            </h2>
            <p>
              PillarPro provides automated mathematical calculations for civil construction contracts, including Running Account (RA) bill gross/net amounts, statutory deductions (Income Tax TDS, GST TDS, Labour Welfare Cess), security deposits, and retention money:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                These calculations are provided as administrative tools based on user inputs and standard statutory deduction formulas.
              </li>
              <li>
                You remain solely responsible for verifying final figures before submitting claims to principal employers, PWD, CPWD, NHAI, state departments, or tax authorities.
              </li>
              <li>
                PillarPro does not act as a licensed chartered accountant, tax advisory firm, or legal counsel.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">5.</span> Subscription, Billing & Cancellations
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">Free Trials:</strong> Free trial periods provide full operational access without requiring upfront credit card details.
              </li>
              <li>
                <strong className="text-white">Payment Terms:</strong> Fees are charged on a monthly or annual subscription cadence based on selected tier and project volume.
              </li>
              <li>
                <strong className="text-white">Cancellation & Exports:</strong> You may cancel your subscription at any time. Upon cancellation, you will retain read and data export access through the end of your billing cycle.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">6.</span> Acceptable Use Policy
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Reverse engineer, decompile, or attempt to derive source code from the Service.</li>
              <li>Interfere with platform operations or attempt to breach tenant Row Level Security (RLS).</li>
              <li>Transmit automated spam, viruses, or unauthorized scrapers.</li>
              <li>Use the Service for any unlawful purpose or in violation of applicable labor regulations.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">7.</span> Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, PillarPro shall not be liable for any indirect, incidental, punitive, or consequential damages, including loss of profits, tender disqualifications, work site delays, or data corruption, resulting from the use or inability to use the Service. In all cases, our aggregate liability is limited to the subscription fees paid by you in the 12 months preceding the claim.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-500">8.</span> Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any legal dispute or proceeding arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © 2026 PillarPro. Built for Infrastructure Contractors.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

