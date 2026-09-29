import { describe, it, expect } from 'vitest'
import {
  calculateDifferenceQuantity,
  calculateVariationAmount,
  calculateCurrentContractValue,
  aggregateVariationMetrics,
  filterVariations,
} from '../variations'
import { ContractVariation } from '@/lib/types/variations'

describe('Variations, Deviations and Extra Items Calculations', () => {
  describe('calculateDifferenceQuantity', () => {
    it('computes positive deviation difference', () => {
      expect(calculateDifferenceQuantity(100, 150)).toBe(50)
    })

    it('computes negative deviation difference (scope reduction / deletion)', () => {
      expect(calculateDifferenceQuantity(200, 120)).toBe(-80)
    })

    it('handles extra items where original quantity is 0', () => {
      expect(calculateDifferenceQuantity(0, 45.5)).toBe(45.5)
    })
  })

  describe('calculateVariationAmount', () => {
    it('calculates extra item full quantity * proposed rate', () => {
      const result = calculateVariationAmount('EXTRA_ITEM', 0, 50, 0, 1200)
      expect(result.differenceQuantity).toBe(50)
      expect(result.amount).toBe(60000)
      expect(result.isDeletion).toBe(false)
      expect(result.deletedAmount).toBe(0)
    })

    it('calculates deviation difference quantity * rate', () => {
      const result = calculateVariationAmount('DEVIATION', 100, 140, 500, 500)
      expect(result.differenceQuantity).toBe(40)
      expect(result.amount).toBe(20000)
      expect(result.isDeletion).toBe(false)
    })

    it('identifies deleted work and calculates deleted amount', () => {
      const result = calculateVariationAmount('DEVIATION', 100, 60, 500, 500)
      expect(result.differenceQuantity).toBe(-40)
      expect(result.amount).toBe(-20000)
      expect(result.isDeletion).toBe(true)
      expect(result.deletedAmount).toBe(20000)
    })
  })

  describe('calculateCurrentContractValue', () => {
    it('accurately applies government formula: Original + Approved Variations + Approved Extra - Deletions', () => {
      const original = 10000000 // 1 Crore
      const approvedVariations = 500000 // 5 Lakhs
      const approvedExtraItems = 300000 // 3 Lakhs
      const deletedWork = 200000 // 2 Lakhs

      const current = calculateCurrentContractValue(
        original,
        approvedVariations,
        approvedExtraItems,
        deletedWork
      )

      // 1,00,00,000 + 5,00,000 + 3,00,000 - 2,00,000 = 1,06,00,000
      expect(current).toBe(10600000)
    })

    it('handles zero variations cleanly', () => {
      expect(calculateCurrentContractValue(5000000, 0, 0, 0)).toBe(5000000)
    })
  })

  describe('aggregateVariationMetrics & Exclusion of Proposed Variations', () => {
    const mockVariations: ContractVariation[] = [
      {
        id: 'var-1',
        organization_id: 'org-1',
        project_id: 'proj-1',
        reference_number: 'VO-01',
        type: 'DEVIATION',
        instruction_date: '2026-03-01',
        instruction_authority: 'EE CPWD',
        proposed_item_description: 'PCC 1:2:4 excess over 25% limit',
        proposed_unit: 'cum',
        original_quantity: 100,
        proposed_quantity: 140,
        difference_quantity: 40,
        original_rate: 5000,
        proposed_rate: 5000,
        proposed_amount: 200000,
        approved_amount: 200000,
        is_deletion: false,
        deleted_work_amount: 0,
        reason: 'Foundation deepened',
        status: 'APPROVED',
        executed_quantity: 30,
        billed_quantity: 20,
        paid_amount: 100000,
        approved_quantity: 140,
        approved_rate: 5000,
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
      {
        id: 'var-2',
        organization_id: 'org-1',
        project_id: 'proj-1',
        reference_number: 'EI-01',
        type: 'EXTRA_ITEM',
        instruction_date: '2026-03-05',
        instruction_authority: 'EE CPWD',
        proposed_item_description: 'Granite cladding to portal frame',
        proposed_unit: 'sqm',
        original_quantity: 0,
        proposed_quantity: 50,
        difference_quantity: 50,
        original_rate: 0,
        proposed_rate: 3000,
        proposed_amount: 150000,
        approved_amount: 150000,
        is_deletion: false,
        deleted_work_amount: 0,
        reason: 'Architectural instruction',
        status: 'APPROVED',
        executed_quantity: 40,
        billed_quantity: 40,
        paid_amount: 120000,
        approved_quantity: 50,
        approved_rate: 3000,
        created_at: '2026-03-05T10:00:00Z',
        updated_at: '2026-03-05T10:00:00Z',
      },
      {
        id: 'var-3',
        organization_id: 'org-1',
        project_id: 'proj-1',
        reference_number: 'DEL-01',
        type: 'DEVIATION',
        instruction_date: '2026-03-10',
        instruction_authority: 'EE CPWD',
        proposed_item_description: 'Boundary wall reduced on north side',
        proposed_unit: 'm',
        original_quantity: 100,
        proposed_quantity: 60,
        difference_quantity: -40,
        original_rate: 2000,
        proposed_rate: 2000,
        proposed_amount: -80000,
        approved_amount: -80000,
        is_deletion: true,
        deleted_work_amount: 80000,
        reason: 'Land acquisition curtailed',
        status: 'APPROVED',
        executed_quantity: 0,
        billed_quantity: 0,
        paid_amount: 0,
        approved_quantity: 60,
        approved_rate: 2000,
        created_at: '2026-03-10T10:00:00Z',
        updated_at: '2026-03-10T10:00:00Z',
      },
      {
        id: 'var-4',
        organization_id: 'org-1',
        project_id: 'proj-1',
        reference_number: 'PROP-01',
        type: 'VARIATION',
        instruction_date: '2026-03-15',
        instruction_authority: 'Site Engineer',
        proposed_item_description: 'Proposed waterproofing treatment',
        proposed_unit: 'sqm',
        original_quantity: 200,
        proposed_quantity: 300,
        difference_quantity: 100,
        original_rate: 1500,
        proposed_rate: 1800,
        proposed_amount: 180000,
        approved_amount: 0,
        is_deletion: false,
        deleted_work_amount: 0,
        reason: 'Pending technical approval from SE',
        status: 'PROPOSED', // UNAPPROVED!
        executed_quantity: 0,
        billed_quantity: 0,
        paid_amount: 0,
        approved_quantity: 0,
        approved_rate: 0,
        created_at: '2026-03-15T10:00:00Z',
        updated_at: '2026-03-15T10:00:00Z',
      },
    ]

    it('excludes proposed variations from official contract value and calculates 6 stages cleanly', () => {
      const originalValue = 10000000 // 1 Crore
      const summary = aggregateVariationMetrics(mockVariations, originalValue)

      expect(summary.originalContractValue).toBe(10000000)
      expect(summary.approvedVariations).toBe(200000) // var-1
      expect(summary.approvedExtraItems).toBe(150000) // var-2
      expect(summary.deletedWork).toBe(80000) // var-3

      // CRITICAL: Proposed 180,000 is isolated and NOT added to currentContractValue
      expect(summary.proposedVariations).toBe(180000)

      // Current Contract Value = 10,000,000 + 200,000 + 150,000 - 80,000 = 10,270,000
      expect(summary.currentContractValue).toBe(10270000)

      // Counts
      expect(summary.totalCount).toBe(4)
      expect(summary.approvedCount).toBe(3)
      expect(summary.proposedCount).toBe(1)
    })
  })

  describe('filterVariations', () => {
    const items = [
      {
        id: '1',
        organization_id: 'org',
        project_id: 'p1',
        reference_number: 'DEV-01',
        type: 'DEVIATION' as const,
        status: 'APPROVED' as const,
        instruction_authority: 'EE Circle',
        proposed_item_description: 'RCC M25 grade concrete',
        proposed_unit: 'cum',
        original_quantity: 10,
        proposed_quantity: 20,
        difference_quantity: 10,
        original_rate: 6000,
        proposed_rate: 6000,
        proposed_amount: 60000,
        approved_amount: 60000,
        approved_quantity: 20,
        approved_rate: 6000,
        is_deletion: false,
        deleted_work_amount: 0,
        reason: 'Slab extension',
        instruction_date: '2026-03-01',
        executed_quantity: 0,
        billed_quantity: 0,
        paid_amount: 0,
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        organization_id: 'org',
        project_id: 'p2',
        reference_number: 'EI-01',
        type: 'EXTRA_ITEM' as const,
        status: 'PROPOSED' as const,
        instruction_authority: 'AE PWD',
        proposed_item_description: 'Steel reinforcement test',
        proposed_unit: 'nos',
        original_quantity: 0,
        proposed_quantity: 5,
        difference_quantity: 5,
        original_rate: 0,
        proposed_rate: 2000,
        proposed_amount: 10000,
        approved_amount: 0,
        approved_quantity: 0,
        approved_rate: 0,
        is_deletion: false,
        deleted_work_amount: 0,
        reason: 'Mandatory testing',
        instruction_date: '2026-03-02',
        executed_quantity: 0,
        billed_quantity: 0,
        paid_amount: 0,
        created_at: '',
        updated_at: '',
      },
    ]

    it('filters by project ID', () => {
      const res = filterVariations(items, { projectId: 'p1' })
      expect(res.length).toBe(1)
      expect(res[0].reference_number).toBe('DEV-01')
    })

    it('filters by type', () => {
      const res = filterVariations(items, { type: 'EXTRA_ITEM' })
      expect(res.length).toBe(1)
      expect(res[0].type).toBe('EXTRA_ITEM')
    })

    it('filters by status', () => {
      const res = filterVariations(items, { status: 'PROPOSED' })
      expect(res.length).toBe(1)
      expect(res[0].status).toBe('PROPOSED')
    })

    it('searches text across reference number and description', () => {
      const res = filterVariations(items, { query: 'concrete' })
      expect(res.length).toBe(1)
      expect(res[0].id).toBe('1')
    })
  })
})
