import { describe, it, expect } from 'vitest'
import { verifyGrounding, buildSystemPrompt } from '../../ai/contractAiEngine'

describe('PillarPro Contract AI: 4-Layer Zero-Hallucination Shield', () => {
  describe('Layer 4: verifyGrounding Guard', () => {
    const knownIds = [
      'c8b1a2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
      'd9c2b3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
      'e0d3c4a5-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
    ]

    it('identifies and verifies known database record UUIDs in AI output', () => {
      const responseText = `
        Under [FACT], RA Bill was certified in record c8b1a2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e.
        [USER-RECORDED DATA] shows open hindrance d9c2b3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f.
      `
      const result = verifyGrounding(responseText, knownIds)
      expect(result.referencedRecordIds).toHaveLength(2)
      expect(result.referencedRecordIds).toContain('c8b1a2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e')
      expect(result.referencedRecordIds).toContain('d9c2b3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f')
      expect(result.unverifiedRecordIds).toHaveLength(0)
    })

    it('flags hallucinated or fabricated UUIDs not present in the injected database context', () => {
      const responseText = `
        [AI INTERPRETATION] Claims under fabricated record 99999999-9999-9999-9999-999999999999
        and real record e0d3c4a5-6b7c-8d9e-0f1a-2b3c4d5e6f7a.
      `
      const result = verifyGrounding(responseText, knownIds)
      expect(result.referencedRecordIds).toContain('e0d3c4a5-6b7c-8d9e-0f1a-2b3c4d5e6f7a')
      expect(result.unverifiedRecordIds).toContain('99999999-9999-9999-9999-999999999999')
    })

    it('handles empty responses and responses without UUIDs gracefully', () => {
      const responseText = 'No record found in the project database.'
      const result = verifyGrounding(responseText, knownIds)
      expect(result.referencedRecordIds).toHaveLength(0)
      expect(result.unverifiedRecordIds).toHaveLength(0)
    })
  })

  describe('Layer 2 & 3: buildSystemPrompt Constraints & 4-Tier Taxonomy', () => {
    it('injects mandatory closed-world assumptions and negative constraints', () => {
      const mockContext: any = {
        project: { id: 'p1', name: 'NH-31 Highway', code: 'NH31', status: 'ACTIVE' },
        contract: null,
        clauses: [],
        hindrances: [],
        contractEvents: [],
        boqSummary: { totalItems: 0, sampleItems: [] },
        raBills: [],
        eotCases: [],
        variations: [],
        claims: [],
        correspondence: [],
        evidenceSummary: { totalItems: 0, items: [] },
        knownRecordIds: ['p1'],
      }

      const prompt = buildSystemPrompt(mockContext)

      // Strict Closed-World Mandate
      expect(prompt).toContain('STRICT CLOSED-WORLD ASSUMPTION')
      expect(prompt).toContain('Record Not Found in System')

      // Negative Constraints (Anti-hallucination)
      expect(prompt).toContain('NEVER INVENT DATES, CLAUSES, AMOUNTS, OR NOTICE PERIODS')
      expect(prompt).toContain('NEVER GIVE DEFINITIVE LEGAL ADVICE')
      expect(prompt).toContain('NEVER INVENT CONTRACTUAL RIGHTS')

      // 4-Tier Output Taxonomy
      expect(prompt).toContain('[FACT]')
      expect(prompt).toContain('[USER-RECORDED DATA]')
      expect(prompt).toContain('[CONTRACT TEXT]')
      expect(prompt).toContain('[AI INTERPRETATION]')

      // Contract clause requirements
      expect(prompt).toContain('Document Title')
      expect(prompt).toContain('Clause Number')
    })
  })
})
