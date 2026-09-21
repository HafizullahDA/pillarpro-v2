'use client'
/* eslint-disable @next/next/no-img-element */

import { formatINR, formatDate } from '@/lib/format'
import { OrganizationProfile } from '@/lib/organization'
import { RetentionRefundClaim } from '@/lib/types/contractorLedger'

interface RetentionClaimLetterPDFProps {
  claim: RetentionRefundClaim
  organization?: OrganizationProfile
}

export function RetentionClaimLetterPDF({
  claim,
  organization,
}: RetentionClaimLetterPDFProps) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="text-slate-900 font-sans leading-relaxed bg-white p-8 max-w-4xl mx-auto border border-slate-300 print:border-0 print:p-0 text-sm">
      {/* Contractor Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 max-w-2xl">
            {organization?.logo_url && (
              <img
                src={organization.logo_url}
                alt="Logo"
                className="h-16 max-w-[140px] object-contain shrink-0 mt-0.5"
              />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                {organization?.name || claim.contractorName || 'Contractor Agency'}
              </h1>
              <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                {organization?.address && <p>{organization.address}</p>}
                <div className="flex gap-x-3 flex-wrap font-mono">
                  {organization?.registration_no && <span>Reg: {organization.registration_no}</span>}
                  {organization?.gstin && <span>GSTIN: {organization.gstin}</span>}
                  {organization?.pan && <span>PAN: {organization.pan}</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p className="font-mono text-slate-700">Ref: RET-REFUND/{claim.finalBillNumber}</p>
            <p className="mt-1"><strong>Date:</strong> {currentDate}</p>
          </div>
        </div>
      </div>

      {/* Addressee */}
      <div className="mb-6 text-xs text-slate-800 space-y-0.5">
        <p className="font-bold">To,</p>
        <p className="font-bold">The Executive Engineer,</p>
        <p>{claim.divisionOffice || 'Public Works Division'},</p>
        <p>{claim.clientDepartment || 'State Department of Public Works'}.</p>
      </div>

      {/* Subject Line */}
      <div className="mb-6 p-3 bg-slate-100 border-l-4 border-slate-900 font-bold text-slate-900 text-xs leading-normal">
        <p>
          SUBJECT: Statutory Application for Refund & Release of Security Deposit (Retention Money)
          amounting to {formatINR(claim.retentionAmountToRelease)} upon Successful Completion of Defect Liability Period (DLP).
        </p>
      </div>

      {/* Reference Line */}
      <div className="mb-6 text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
        <p><strong>Reference / Contract Particulars:</strong></p>
        <p>1. Name of Work: <strong>{claim.projectName}</strong></p>
        <p>2. Work Order / Agreement No.: <strong>{claim.agreementNumber || 'Sanctioned Contract Agreement'}</strong></p>
        <p>3. Final Bill Passed (Form CPWA 27-B): <strong>{claim.finalBillNumber}</strong> (Dated: {formatDate(claim.finalBillDate)})</p>
        <p>4. Actual Date of Physical Completion: <strong>{formatDate(claim.actualCompletionDate)}</strong></p>
        <p>5. Defect Liability Period (DLP): <strong>{claim.dlpMonths} Calendar Months</strong> (Expired on: <strong>{formatDate(claim.dlpExpiryDate)}</strong>)</p>
      </div>

      {/* Body of the Letter */}
      <div className="space-y-3.5 text-xs text-slate-800 leading-relaxed text-justify mb-8">
        <p>Respected Sir / Madam,</p>

        <p>
          With reference to the above-captioned subject and contract agreement, we have the honour to submit that the subject work was successfully executed in strict accordance with the approved specifications and department drawings, and the physical completion was officially taken over on <strong>{formatDate(claim.actualCompletionDate)}</strong>.
        </p>

        <p>
          The final bill for the work was subsequently verified and passed under <strong>Form CPWA 27-B</strong>, wherein an amount of <strong>{formatINR(claim.retentionAmountToRelease)}</strong> was withheld towards contractual Security Deposit / Retention Money, subject to refund upon the successful completion of the {claim.dlpMonths}-month Defect Liability Period.
        </p>

        <p>
          We take pleasure in submitting that the stipulated Defect Liability Period of {claim.dlpMonths} months expired on <strong>{formatDate(claim.dlpExpiryDate)}</strong>. During this period, the executed works have performed with complete satisfaction, and no structural defects, maintenance non-compliances, or departmental notices have been issued or remain outstanding.
        </p>

        <p>
          In accordance with <strong>Rule 10.2.20 of the CPWA Code</strong> and Section 17.4 of the CPWD Works Manual, the Security Deposit withheld against the contract is now legally due and payable in full to the contractor.
        </p>

        <p>
          We, therefore, respectfully request your good office to kindly issue necessary instructions to the Divisional Accountant / Treasury to release and credit the withheld Security Deposit amount of <strong>{formatINR(claim.retentionAmountToRelease)}</strong> into our registered bank account as per details below:
        </p>

        {/* Bank Account Details Table */}
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-1 font-mono">
          <p className="font-bold text-slate-900 font-sans uppercase tracking-wider text-[11px] mb-1">
            Contractor Bank Account for Direct RTGS / PFMS Credit:
          </p>
          <div className="grid grid-cols-2 gap-2 text-slate-800">
            <div>
              <span className="text-slate-500 font-sans text-[10px] block">Account Holder Name:</span>
              <span className="font-bold">{organization?.name || claim.contractorName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[10px] block">Bank Name:</span>
              <span className="font-bold">{claim.bankAccountDetails?.bankName || 'State Bank of India'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[10px] block">Bank Account Number:</span>
              <span className="font-bold text-blue-900">{claim.bankAccountDetails?.accountNumber || 'Provided with Firm Documents'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[10px] block">RTGS / NEFT / IFSC Code:</span>
              <span className="font-bold text-blue-900">{claim.bankAccountDetails?.ifscCode || 'SBIN000000'}</span>
            </div>
          </div>
        </div>

        <p>
          Enclosed herewith are copies of the Final Bill certificate, Completion Certificate, and No Demand Declaration for your kind verification and expeditious release.
        </p>

        <p>Thanking you,</p>
      </div>

      {/* Signature & Seal Block */}
      <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
        <div className="text-slate-500 space-y-1">
          <p><strong>Enclosures:</strong></p>
          <p>1. Copy of Final Bill Form CPWA 27-B</p>
          <p>2. Work Completion Certificate issued by Engineer-in-Charge</p>
          <p>3. Form CPWA 43 Contractor Ledger Extract</p>
          <p>4. Cancelled Cheque for Verified Bank Account</p>
        </div>

        <div className="text-center w-64">
          <div className="h-16 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
            {organization?.signature_url ? (
              <img
                src={organization.signature_url}
                alt="Signature & Seal"
                className="h-14 max-w-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-slate-400 italic">Signature & Company Seal</span>
            )}
          </div>
          <p className="font-bold text-slate-900">For {organization?.name || claim.contractorName}</p>
          <p className="text-[11px] text-slate-500">Authorized Signatory & Seal</p>
        </div>
      </div>
    </div>
  )
}

