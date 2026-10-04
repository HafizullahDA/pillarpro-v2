import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeWhatsAppNumber,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  sendBankGuaranteeExpiryAlert,
  sendClauseNoticeDeadlineAlert,
  sendRABillStatusAlert,
} from '../whatsappCloudApi'

describe('WhatsApp Cloud API Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = {
      ...originalEnv,
      WHATSAPP_PHONE_NUMBER_ID: '1300523746483534',
      WHATSAPP_API_TOKEN: 'test_token_123',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('normalizeWhatsAppNumber', () => {
    it('normalizes various Indian phone formats to standard 91XXXXXXXXXX', () => {
      expect(normalizeWhatsAppNumber('+91 98765 43210')).toBe('919876543210')
      expect(normalizeWhatsAppNumber('09876543210')).toBe('919876543210')
      expect(normalizeWhatsAppNumber('9876543210')).toBe('919876543210')
      expect(normalizeWhatsAppNumber('+91-98765-43210')).toBe('919876543210')
    })

    it('preserves existing country code if already international', () => {
      expect(normalizeWhatsAppNumber('+1 (555) 635-8760')).toBe('15556358760')
      expect(normalizeWhatsAppNumber('')).toBe('')
    })
  })

  describe('sendWhatsAppTextMessage', () => {
    it('calls Meta Graph API with correct headers and text body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '919876543210', wa_id: '919876543210' }],
          messages: [{ id: 'wamid.HBgLM...==' }],
        }),
      })
      global.fetch = mockFetch

      const result = await sendWhatsAppTextMessage({
        to: '9876543210',
        text: 'Test critical alert',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('wamid.HBgLM...==')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://graph.facebook.com/v22.0/1300523746483534/messages')
      expect(options.headers['Authorization']).toBe('Bearer test_token_123')

      const body = JSON.parse(options.body)
      expect(body.messaging_product).toBe('whatsapp')
      expect(body.to).toBe('919876543210')
      expect(body.type).toBe('text')
      expect(body.text.body).toBe('Test critical alert')
    })

    it('handles Meta API errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token.',
            type: 'OAuthException',
            code: 190,
          },
        }),
      })
      global.fetch = mockFetch

      const result = await sendWhatsAppTextMessage({
        to: '9876543210',
        text: 'Test alert',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid OAuth access token.')
    })
  })

  describe('Alert Dispatchers', () => {
    it('formats and dispatches Bank Guarantee expiry alert with GCC Clause 1A citation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: 'wamid.123' }] }),
      })
      global.fetch = mockFetch

      const result = await sendBankGuaranteeExpiryAlert({
        to: '9876543210',
        bgReference: 'PBG-2026-99',
        depositType: 'performance_bank_guarantee',
        amount: 2500000,
        issuingBank: 'State Bank of India',
        expiryDate: '2026-10-18',
        daysRemaining: 14,
        projectName: 'Flyover Package 3',
      })

      expect(result.success).toBe(true)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.text.body).toContain('PBG-2026-99')
      expect(body.text.body).toContain('State Bank of India')
      expect(body.text.body).toContain('14 days remaining')
      expect(body.text.body).toContain('CPWD GCC Clause 1A')
    })

    it('formats and dispatches Clause 5 notice deadline alert with legal precedent warning', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: 'wamid.456' }] }),
      })
      global.fetch = mockFetch

      const result = await sendClauseNoticeDeadlineAlert({
        to: '9876543210',
        letterNumber: 'EE/PWD/2026/77',
        subject: 'Alleged site slow progress notice',
        deadlineDate: '2026-10-10',
        daysRemaining: 3,
        clauseTitle: 'Clause 5 (Delay and Extension of Time)',
        projectName: 'Hospital Complex',
      })

      expect(result.success).toBe(true)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.text.body).toContain('EE/PWD/2026/77')
      expect(body.text.body).toContain('3 days left')
      expect(body.text.body).toContain('arbitration')
    })
  })
})
