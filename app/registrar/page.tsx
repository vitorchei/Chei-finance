'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/Sheet'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { TransactionType } from '@/types'

type ToastState = { message: string; type: 'success' | 'error' } | null

function PillGroup({
  options,
  selected,
  onSelect,
  activeClass,
}: {
  options: string[]
  selected: string
  onSelect: (v: string) => void
  activeClass: string
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === opt
              ? activeClass
              : 'bg-[#272727] text-gray-300 hover:bg-[#333]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function RegistrarPage() {
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)

  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeSource, setIncomeSource] = useState('')
  const [incomeDesc, setIncomeDesc] = useState('')
  const [incomeDate, setIncomeDate] = useState('')

  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseType, setExpenseType] = useState('')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseDate, setExpenseDate] = useState('')

  const [incomeTypes, setIncomeTypes] = useState<string[]>([])
  const [expenseTypes, setExpenseTypes] = useState<string[]>([])
  const [typesLoading, setTypesLoading] = useState(true)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [userName, setUserName] = useState('mestre chei')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetchName() {
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', 'user_name')
        .single()
      const name = (data as { value: string } | null)?.value
      if (name) setUserName(name)
    }

    async function fetchTypes() {
      const { data } = await supabase
        .from('transaction_types')
        .select('*')
        .order('created_at', { ascending: true })

      const rows = (data as TransactionType[]) ?? []
      setIncomeTypes(rows.filter(r => r.transaction_type === 'income').map(r => r.label))
      setExpenseTypes(rows.filter(r => r.transaction_type === 'expense').map(r => r.label))
      setTypesLoading(false)
    }
    fetchName()
    fetchTypes()
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
  }

  function resetIncome() {
    setIncomeAmount('')
    setIncomeSource('')
    setIncomeDesc('')
    setIncomeDate(today)
  }

  function resetExpense() {
    setExpenseAmount('')
    setExpenseType('')
    setExpenseDesc('')
    setExpenseDate(today)
  }

  async function handleSaveIncome() {
    if (!incomeAmount || Number(incomeAmount) <= 0) {
      showToast('Informe um valor válido.', 'error')
      return
    }
    if (!incomeSource) {
      showToast('Selecione a fonte da entrada.', 'error')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        type: 'income',
        amount: parseFloat(incomeAmount.replace(',', '.')),
        source: incomeSource,
        expense_type: null,
        description: incomeDesc || null,
        date: incomeDate || today,
      })
      if (error) throw error
      setIncomeOpen(false)
      resetIncome()
      showToast('Entrada registrada com sucesso!', 'success')
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveExpense() {
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      showToast('Informe um valor válido.', 'error')
      return
    }
    if (!expenseType) {
      showToast('Selecione o tipo da saída.', 'error')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        type: 'expense',
        amount: parseFloat(expenseAmount.replace(',', '.')),
        source: null,
        expense_type: expenseType,
        description: expenseDesc || null,
        date: expenseDate || today,
      })
      if (error) throw error
      setExpenseOpen(false)
      resetExpense()
      showToast('Saída registrada com sucesso!', 'success')
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100svh-64px)] px-5">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="pt-12 text-center">
        <h1 className="text-[32px] font-bold text-white mb-3 leading-tight">
          Bem vindo de volta {userName}
        </h1>
        <p className="text-lg text-gray-400">
          o que gostaria de registrar nesta{' '}
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].trim()}?
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Entrada */}
        <button
          onClick={() => { setIncomeDate(today); setIncomeOpen(true) }}
          className="group flex flex-col items-center justify-center gap-4 rounded-3xl bg-green-950/60 border border-green-900/60 hover:bg-green-950 hover:border-green-800 transition-all active:scale-95 py-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center group-hover:bg-green-500/25 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-green-400"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-green-400 font-bold text-lg tracking-tight">Entrada</p>
            <p className="text-green-600 text-xs mt-0.5">receita</p>
          </div>
        </button>

        {/* Saída */}
        <button
          onClick={() => { setExpenseDate(today); setExpenseOpen(true) }}
          className="group flex flex-col items-center justify-center gap-4 rounded-3xl bg-red-950/60 border border-red-900/60 hover:bg-red-950 hover:border-red-800 transition-all active:scale-95 py-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-red-400"
            >
              <path d="M12 19V5M5 12l7 7 7-7" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-red-400 font-bold text-lg tracking-tight">Saída</p>
            <p className="text-red-600 text-xs mt-0.5">despesa</p>
          </div>
        </button>
      </div>
      </div>

      {/* Income Sheet */}
      <Sheet isOpen={incomeOpen} onClose={() => { setIncomeOpen(false); resetIncome() }} title="Nova Entrada">
        <div className="space-y-6">
          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Valor
            </label>
            <div className="flex items-baseline mt-3 border-b-2 border-green-500/60 pb-2 focus-within:border-green-400 transition-colors">
              <span className="text-2xl text-gray-500 mr-2 font-light">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="flex-1 text-5xl font-bold text-white bg-transparent outline-none placeholder-[#333] leading-tight"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Fonte
            </label>
            {typesLoading ? (
              <div className="flex items-center gap-2 mt-3 text-gray-600 text-xs">
                <div className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                Carregando...
              </div>
            ) : (
              <PillGroup
                options={incomeTypes}
                selected={incomeSource}
                onSelect={setIncomeSource}
                activeClass="bg-green-500 text-black font-semibold shadow-lg shadow-green-900/40"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Descrição
            </label>
            <textarea
              placeholder="Adicione uma descrição (opcional)"
              value={incomeDesc}
              onChange={(e) => setIncomeDesc(e.target.value)}
              rows={3}
              className="w-full mt-3 bg-[#222] rounded-xl px-4 py-3 text-white placeholder-[#444] outline-none resize-none focus:ring-1 focus:ring-green-500/50 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Data
            </label>
            <input
              type="date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              className="w-full mt-3 bg-[#222] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-green-500/50 text-sm [color-scheme:dark]"
            />
          </div>

          <button
            onClick={handleSaveIncome}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-green-500 text-black font-bold text-base hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Sheet>

      {/* Expense Sheet */}
      <Sheet isOpen={expenseOpen} onClose={() => { setExpenseOpen(false); resetExpense() }} title="Nova Saída">
        <div className="space-y-6">
          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Valor
            </label>
            <div className="flex items-baseline mt-3 border-b-2 border-red-500/60 pb-2 focus-within:border-red-400 transition-colors">
              <span className="text-2xl text-gray-500 mr-2 font-light">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="flex-1 text-5xl font-bold text-white bg-transparent outline-none placeholder-[#333] leading-tight"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Tipo
            </label>
            {typesLoading ? (
              <div className="flex items-center gap-2 mt-3 text-gray-600 text-xs">
                <div className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                Carregando...
              </div>
            ) : (
              <PillGroup
                options={expenseTypes}
                selected={expenseType}
                onSelect={setExpenseType}
                activeClass="bg-red-500 text-white font-semibold shadow-lg shadow-red-900/40"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Descrição
            </label>
            <textarea
              placeholder="Adicione uma descrição (opcional)"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              rows={3}
              className="w-full mt-3 bg-[#222] rounded-xl px-4 py-3 text-white placeholder-[#444] outline-none resize-none focus:ring-1 focus:ring-red-500/50 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Data
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full mt-3 bg-[#222] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-red-500/50 text-sm [color-scheme:dark]"
            />
          </div>

          <button
            onClick={handleSaveExpense}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-red-500 text-white font-bold text-base hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
