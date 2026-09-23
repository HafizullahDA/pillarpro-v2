import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ExpensesRedirect() {
  redirect('/ledgers/expenses')
}
