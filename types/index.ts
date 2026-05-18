export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  source: string | null
  expense_type: string | null
  description: string | null
  date: string
  created_at: string
}

export interface TransactionType {
  id: string
  transaction_type: 'income' | 'expense'
  label: string
  created_at: string
}

export interface MonthlyBudget {
  id: string
  expense_type: string
  limit_amount: number
  updated_at: string
}

export interface MonthStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeBySource: Record<string, number>
  expensesByType: Record<string, number>
  biggestExpense: number
  dailyAverage: number
}
