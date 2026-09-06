'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { AddExpenseButton } from './AddExpenseButton'
import { DeleteExpenseModal, ExpenseToDelete } from './DeleteExpenseModal'
import { canDeleteExpense, canCreateExpense } from '@/lib/permissions'

const CATEGORY_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  labor:      'info',
  material:   'default',
  equipment:  'neutral',
  transport:  'warning',
  fuel:       'warning',
  admin:      'neutral',
  tendering:  'info',
  other:      'neutral',
}

export interface ExpenseRow {
  id: string
  project_id: string | null
  description: string | null
  category: string
  amount: number
  date: string
  payment_mode?: string
  receipt_url?: string | null
  projects?: { name: string } | null
}

interface ExpensesClientProps {
  initialExpenses: ExpenseRow[]
  projects: { id: string; name: string }[]
  suppliers: { id: string; name: string }[]
  userRole: string
}

export function ExpensesClient({
  initialExpenses,
  projects,
  suppliers,
  userRole,
}: ExpensesClientProps) {
  const router = useRouter()
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseToDelete | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const canDelete = canDeleteExpense(userRole)
  const canCreate = canCreateExpense(userRole)

  const handleOpenDelete = (expense: ExpenseRow) => {
    setExpenseToDelete({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      category: expense.category,
      projects: expense.projects,
    })
    setDeleteModalOpen(true)
  }

  const handleDeleteSuccess = () => {
    if (expenseToDelete) {
      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id))
    }
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track and manage site expenses and receipts</p>
        </div>
        {canCreate && <AddExpenseButton projects={projects} suppliers={suppliers} />}
      </div>

      {!expenses.length ? (
        <EmptyState
          title="No expenses yet"
          description="Add fuel, equipment, tendering, and other site expenses here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Mode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                  {canDelete && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.description ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {(e.projects as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge
                        label={e.category ?? 'other'}
                        variant={CATEGORY_VARIANTS[e.category ?? 'other'] ?? 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {e.payment_mode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatINR(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {formatDate(e.date)}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(e)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete expense (Owner only)"
                          aria-label={`Delete expense ${e.description ?? ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteExpenseModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        expense={expenseToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
