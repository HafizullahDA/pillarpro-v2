'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { formatINR } from '@/lib/format'

export interface WhatsAppAlertData {
  reference: string
  subtitle?: string
  date?: string
  daysRemaining?: number
  amount?: number
  issuingBank?: string
  depositType?: string
  letterNumber?: string
  subject?: string
  clauseTitle?: string
  billNumber?: string
  certifiedAmount?: number
  entityId?: string
  projectId?: string
  projectName?: string
}

interface SendWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  alertType: 'bg_expiry' | 'clause_notice' | 'ra_bill' | 'text' | 'template'
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

  useEffect(() => {
    if (isOpen) {
      setSentMessageId(null)
      setErrorDetails(null)
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pillarpro_whatsapp_recipient') : null
      if (saved) {
        setRecipientPhone(saved)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Generate real preview text based on alertType
  const getPreviewText = () => {
    if (alertType === 'bg_expiry') {
      const typeLabel = (data.depositType || 'Bank Guarantee').replace(/_/g, ' ').toUpperCase()
      return `🚨 *PILLARPRO CRITICAL ALERT: BANK GUARANTEE EXPIRY*\n\n` +
        `*Reference:* ${data.reference}\n` +
        `*Deposit Type:* ${typeLabel}\n` +
        (data.issuingBank ? `*Issuing Bank:* ${data.issuingBank}\n` : '') +
        (data.amount ? `*Amount:* ${formatINR(data.amount)}\n` : '') +
        `*Expiry Date:* ${data.date || 'Approaching'}\n` +
        `*Urgency:* ${data.daysRemaining != null ? (data.daysRemaining <= 0 ? 'EXPIRED' : `${data.daysRemaining} day(s) remaining`) : 'Immediate action required'}\n\n` +
        `⚠️ *Action Required:* Initiate renewal or release immediately with department authorities to avoid liquidity forfeiture.\n\n` +
        `_PillarPro Enterprise Contractor Intelligence_`
    }

    if (alertType === 'clause_notice') {
      return `⚠️ *PILLARPRO STATUTORY NOTICE DEADLINE ALERT*\n\n` +
        `*Letter / Notice:* ${data.reference}\n` +
        (data.subject ? `*Subject:* ${data.subject}\n` : '') +
        `*Response Deadline:* ${data.date || 'Urgent'}\n` +
        `*Days Remaining:* ${data.daysRemaining != null ? (data.daysRemaining <= 0 ? 'OVERDUE' : `${data.daysRemaining} day(s)`) : 'Due Soon'}\n\n` +
        `⏳ *Contract Defense Action:* Statutory notice rules require timely reply to preserve contractor claims and rights.\n\n` +
        `_PillarPro Contract Defense Shield_`
    }

    if (alertType === 'template' || alertType === 'text') {
      return `💬 *Meta Pre-Approved Template: hello_world*\n\n` +
        `"Welcome and congratulations! This message demonstrates your ability to send a WhatsApp message using the Cloud API."\n\n` +
        `✅ *Guaranteed Delivery:* Pre-approved templates bypass WhatsApp's 24-hour customer session rule and land on your phone immediately.`
    }

    return `📢 *PILLARPRO ENTERPRISE ALERT*\n\n*Reference:* ${data.reference}\n*Status:* Action Required\n\n_PillarPro Enterprise_`
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

      const dispatchType = (alertType === 'text' || alertType === 'template') ? 'template' : alertType

      const res = await fetch('/api/alerts/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: dispatchType,
          recipientPhone,
          payload: {
            templateName: 'hello_world',
            bgReference: data.reference,
            depositType: data.depositType,
            amount: data.amount,
            issuingBank: data.issuingBank,
            expiryDate: data.date,
            daysRemaining: data.daysRemaining,
            letterNumber: data.reference,
            subject: data.subject,
            deadlineDate: data.date,
            clauseTitle: data.clauseTitle,
            projectName: data.projectName,
            projectId: data.projectId,
            entityId: data.entityId,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              💬
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">WhatsApp Push Alert</h3>
              <p className="text-xs text-emerald-100">Meta Cloud API Real-Time Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {sentMessageId ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                ✓
              </div>
              <h4 className="text-lg font-bold text-slate-900">Alert Dispatched Successfully!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                The critical deadline notification was pushed directly via Meta WhatsApp Cloud API.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left font-mono text-[11px] text-slate-700 break-all">
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-1">
                  Meta Message ID
                </span>
                {sentMessageId}
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Alert Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{title}</span>
                  {data.daysRemaining != null && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        data.daysRemaining <= 0
                          ? 'bg-red-100 text-red-800'
                          : data.daysRemaining <= 7
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {data.daysRemaining <= 0
                        ? `${Math.abs(data.daysRemaining)}d Overdue`
                        : `${data.daysRemaining}d remaining`}
                    </span>
                  )}
                </div>
                {data.amount != null && data.amount > 0 && (
                  <div className="text-xs text-slate-600 flex justify-between border-t border-slate-200/60 pt-1.5">
                    <span>Guaranteed Amount:</span>
                    <span className="font-bold text-slate-900">{formatINR(data.amount)}</span>
                  </div>
                )}
                {data.date && (
                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>Target Date:</span>
                    <span className="font-mono font-medium text-slate-800">{data.date}</span>
                  </div>
                )}
              </div>

              {/* Recipient Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Recipient Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">
                    📱
                  </span>
                  <input
                    type="text"
                    required
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    placeholder="+91 98765 43210 (or 10 digits)"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Indian numbers automatically formatted with <code className="font-mono font-bold">+91</code>. Remembered for next time.
                </p>
              </div>

              {/* Message Preview (WhatsApp chat bubble simulation) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Live Message Preview
                </label>
                <div className="bg-[#EFEAE2] p-3.5 rounded-xl border border-slate-300">
                  <div className="bg-[#DCF8C6] text-slate-900 text-xs p-3 rounded-lg rounded-tr-none shadow-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {getPreviewText()}
                    <div className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>

                {/* WhatsApp 24-Hour Session Rule Callout */}
                <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 space-y-1 mt-2.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡 WhatsApp 24-Hour Session Rule</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900/90">
                    Meta delivers pre-approved templates (like <b>hello_world</b>) immediately. When the message arrives, send a quick <b>&quot;Hi&quot;</b> reply in WhatsApp to open your 24-hour active session so custom alerts can also be delivered freely!
                  </p>
                </div>
              </div>

              {/* Error Callout if applicable */}
              {errorDetails && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ Error Disagreeing with Meta API:</span>
                  </div>
                  <p className="font-mono text-[11px] break-words">{errorDetails}</p>
                  {errorDetails.includes('OAuthException') || errorDetails.includes('190') ? (
                    <p className="text-[11px] text-red-700 font-semibold">
                      Tip: Your 24-hr development token may have expired. Generate a fresh temporary token in the Meta App Dashboard or create a permanent System User token.
                    </p>
                  ) : errorDetails.includes('131030') || errorDetails.includes('allowed') ? (
                    <p className="text-[11px] text-red-700 font-semibold">
                      Tip: In Meta Development Mode, you can only send messages to recipient numbers added to the test recipient list in the Meta App Developer Console.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending to WhatsApp...</span>
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
