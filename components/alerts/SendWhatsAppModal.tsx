'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/components/ui/Toast'
import { formatINR } from '@/lib/format'
import {
  generateWhatsAppAlertText,
  getUrgencyStatus,
  WhatsAppAlertPayload,
} from '@/lib/whatsappTemplates'

export interface WhatsAppAlertData extends WhatsAppAlertPayload {}

interface SendWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  alertType: 'bg_expiry' | 'clause_notice' | 'ra_bill' | 'text'
  title: string
  data: WhatsAppAlertData
  onSuccess?: (messageId: string) => void
}

export function SendWhatsAppModal({
  isOpen,
  onClose,
  alertType,
  title,
  data,
  onSuccess,
}: SendWhatsAppModalProps) {
  const toast = useToast()
  const [recipientPhone, setRecipientPhone] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [sentMessageId, setSentMessageId] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen) {
      setSentMessageId(null)
      setErrorDetails(null)
      setCopied(false)
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pillarpro_whatsapp_recipient') : null
      if (saved) {
        setRecipientPhone(saved)
      }
    }
  }, [isOpen])

  // Compute enterprise formatted text
  const previewText = useMemo(() => {
    return generateWhatsAppAlertText(alertType, data)
  }, [alertType, data])

  const urgency = useMemo(() => {
    return getUrgencyStatus(data.daysRemaining)
  }, [data.daysRemaining])

  if (!isOpen) return null

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      toast.success('Formatted alert text copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Failed to copy to clipboard.')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number with country code (e.g. +91 98765 43210).')
      return
    }

    setIsSending(true)
    setErrorDetails(null)

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pillarpro_whatsapp_recipient', recipientPhone)
      }

      const res = await fetch('/api/alerts/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType,
          recipientPhone,
          payload: {
            reference: data.reference,
            bgReference: data.reference,
            depositType: data.depositType,
            amount: data.amount,
            issuingBank: data.issuingBank,
            expiryDate: data.date,
            date: data.date,
            daysRemaining: data.daysRemaining,
            letterNumber: data.reference,
            subject: data.subject,
            deadlineDate: data.date,
            clauseTitle: data.clauseTitle,
            billNumber: data.billNumber || data.reference,
            certifiedAmount: data.certifiedAmount,
            receivedAmount: data.receivedAmount,
            projectName: data.projectName,
            projectId: data.projectId,
            entityId: data.entityId,
            formattedText: previewText,
          },
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        const errMsg = json.error || 'Failed to dispatch WhatsApp message.'
        setErrorDetails(errMsg)
        toast.error(`WhatsApp dispatch failed: ${errMsg}`)
        return
      }

      setSentMessageId(json.messageId)
      toast.success(`WhatsApp alert dispatched successfully to +${json.recipient}!`)
      onSuccess?.(json.messageId)
    } catch (err: any) {
      const errMsg = err?.message || 'Network error while contacting WhatsApp API.'
      setErrorDetails(errMsg)
      toast.error(errMsg)
    } finally {
      setIsSending(false)
    }
  }

  const getCategoryBadge = () => {
    switch (alertType) {
      case 'bg_expiry':
        return { label: 'Bank Guarantee Expiry Defense', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      case 'clause_notice':
        return { label: 'Statutory Notice Time-Bar Defense', color: 'bg-amber-100 text-amber-800 border-amber-200' }
      case 'ra_bill':
        return { label: 'RA Bill Treasury Milestone', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
      case 'text':
      default:
        return { label: 'Executive Contract Alert', color: 'bg-blue-100 text-blue-800 border-blue-200' }
    }
  }

  const categoryBadge = getCategoryBadge()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Clean Header - NO Meta or API subtitle */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
              💬
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">WhatsApp Push Alert</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {sentMessageId ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-xs animate-in zoom-in-90 duration-300">
                ✓
              </div>
              <h4 className="text-lg font-bold text-slate-900">Alert Dispatched Successfully!</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                The critical deadline notification was pushed directly to the recipient&apos;s verified WhatsApp number.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left font-mono text-[11px] text-slate-700 break-all space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans text-[10px] uppercase font-bold tracking-wider">
                    Dispatch Reference ID
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    DELIVERED
                  </span>
                </div>
                <div className="text-slate-800 font-bold">{sentMessageId}</div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Alert Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${categoryBadge.color}`}>
                    {categoryBadge.label}
                  </span>

                  {data.daysRemaining != null ? (
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        data.daysRemaining < 0
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : data.daysRemaining === 0
                          ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                          : data.daysRemaining <= 7
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {data.daysRemaining < 0
                        ? `${Math.abs(data.daysRemaining)}d Overdue`
                        : data.daysRemaining === 0
                        ? 'Due Today'
                        : `${data.daysRemaining}d remaining`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Defense
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-slate-200/60">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-slate-500 font-medium">Instrument / Notice Ref:</span>
                    <span className="font-bold text-slate-900 font-mono text-right">{data.reference}</span>
                  </div>

                  {data.amount != null && data.amount > 0 && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-500 font-medium">Guaranteed Exposure:</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatINR(data.amount)}</span>
                    </div>
                  )}

                  {data.issuingBank && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-500 font-medium">Issuing Bank:</span>
                      <span className="font-semibold text-slate-800">{data.issuingBank}</span>
                    </div>
                  )}

                  {data.date && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-500 font-medium">Statutory Target Date:</span>
                      <span className="font-mono font-semibold text-slate-800">{data.date}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Recipient Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex rounded-xl shadow-2xs border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 border-r border-slate-200 select-none">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    placeholder="98765 43210 (or 10 digits)"
                    className="flex-1 px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Indian numbers automatically formatted with <code className="font-mono font-bold">+91</code>. Remembered for next time.
                </p>
              </div>

              {/* Message Preview (WhatsApp chat bubble simulation) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Live Message Preview
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="text-[11px] text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span>{copied ? '✓ Copied' : '📋 Copy Text'}</span>
                  </button>
                </div>

                <div className="bg-[#EFEAE2] p-3.5 sm:p-4 rounded-xl border border-slate-300 relative shadow-inner">
                  <div className="max-w-md bg-[#DCF8C6] text-slate-900 text-xs p-3.5 rounded-2xl rounded-tr-xs shadow-xs font-sans leading-relaxed border border-[#c5e6af]">
                    <div className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-slate-900 select-text">
                      {previewText}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                      <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-emerald-600 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Callout if applicable */}
              {errorDetails && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ Dispatch Error:</span>
                  </div>
                  <p className="font-mono text-[11px] break-words">{errorDetails}</p>

                  {errorDetails.toLowerCase().includes('token') ||
                  errorDetails.toLowerCase().includes('authentication') ||
                  errorDetails.toLowerCase().includes('expired') ||
                  errorDetails.toLowerCase().includes('190') ? (
                    <div className="text-[11px] text-amber-950 bg-amber-50/90 p-2.5 rounded-lg border border-amber-200 mt-2 space-y-1.5 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <span>🔑 Meta Developer Token Expired (24-Hour Limit)</span>
                      </div>
                      <p className="text-[11px] text-amber-900">
                        Meta&apos;s temporary testing access tokens expire after 24 hours.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-amber-800">
                        <li>
                          <b>Quick Fix (10 seconds):</b> Go to <span className="font-mono font-semibold">developers.facebook.com</span> &gt; your App &gt; <b>WhatsApp &gt; API Setup</b>, click <b>&ldquo;Generate token&rdquo;</b>, and paste it into <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">WHATSAPP_API_TOKEN</code> in <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">.env.local</code>.
                        </li>
                        <li>
                          <b>Permanent Fix (Never Expires):</b> In <span className="font-mono font-semibold">business.facebook.com/settings</span> &gt; <b>Users &gt; System Users</b>, create a System User, assign WhatsApp permissions, and generate a token with <b>&ldquo;Never Expire&rdquo;</b>.
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {errorDetails.includes('131047') || errorDetails.includes('24 hours') ? (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                      <b>Active Session Window Notice:</b> Outbound custom text messages require an active 24-hr session. Send any reply (e.g. &ldquo;Hi&rdquo;) from your mobile to <code>+1 555-635-8760</code> on WhatsApp to refresh the session window.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching WhatsApp Alert…</span>
                    </>
                  ) : (
                    <>
                      <span>💬 Dispatch WhatsApp Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default SendWhatsAppModal
