'use client'

import { useCallback, useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Transaction, MonthlyBudget } from '@/types'
import Sheet from '@/components/Sheet'
import {
  formatCurrency,
  formatPercent,
  getMonthRange,
  getMonthLabel,
  getDaysElapsed,
  getDaysInMonth,
} from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const EXTRA_COLORS = ['#94a3b8', '#c084fc', '#34d399', '#fb7185', '#38bdf8', '#fbbf24', '#a78bfa', '#60a5fa']

const INCOME_COLORS: Record<string, string> = {
  'Focus Club': '#22c55e',
  Coreduca: '#10b981',
  Fluwo: '#06b6d4',
  Pais: '#818cf8',
  Outros: '#f59e0b',
}

const EXPENSE_COLORS: Record<string, string> = {
  'Despesas fixas': '#f87171',
  'Despesas variáveis': '#fb923c',
  Lazer: '#facc15',
  Dízimo: '#a78bfa',
  Investimentos: '#38bdf8',
}

type View = 'main' | 'entradas' | 'saidas' | 'extrato' | 'historico'

interface HistoricoItem {
  year: number
  month: number
  total: number
}

interface ExtratoState {
  label: string
  txs: Transaction[]
  origin: 'entradas' | 'saidas'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span className="text-sm font-medium">Voltar</span>
    </button>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-0.5">{name}</p>
      <p className="text-sm font-bold text-white">{formatCurrency(value)}</p>
    </div>
  )
}

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value" strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  return (
    <div className="w-full h-2.5 bg-[#272727] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 bg-yellow-400" style={{ width: `${clamped}%` }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RelatorioPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView] = useState<View>('main')
  const [extrato, setExtrato] = useState<ExtratoState | null>(null)
  const [lazerSheetOpen, setLazerSheetOpen] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lazerBudget, setLazerBudget] = useState(0)
  const [prevTotalIncome, setPrevTotalIncome] = useState<number | null>(null)
  const [prevMonthLabel, setPrevMonthLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [historicoData, setHistoricoData] = useState<HistoricoItem[] | null>(null)
  const [historicoLoading, setHistoricoLoading] = useState(false)
  const [selectedBarIndex, setSelectedBarIndex] = useState(5)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getMonthRange(year, month)

    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    const { start: prevStart, end: prevEnd } = getMonthRange(prevY, prevM)
    setPrevMonthLabel(
      new Date(prevY, prevM - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
    )

    const [txRes, budgetRes, prevTxRes] = await Promise.all([
      supabase.from('transactions').select('*').gte('date', start).lte('date', end),
      supabase.from('monthly_budgets').select('*').eq('expense_type', 'lazer').single(),
      supabase.from('transactions').select('id, type, amount').eq('type', 'income').gte('date', prevStart).lte('date', prevEnd),
    ])

    setTransactions((txRes.data as Transaction[]) ?? [])
    setLazerBudget((budgetRes.data as MonthlyBudget | null)?.limit_amount ?? 0)

    const prevIncome = (prevTxRes.data ?? []) as Pick<Transaction, 'id' | 'type' | 'amount'>[]
    setPrevTotalIncome(prevIncome.reduce((s, t) => s + t.amount, 0))
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  function goToPrevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
    setView('main')
  }

  function goToNextMonth() {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
    setView('main')
  }

  async function handleDeleteTransaction(id: string) {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      setExtrato(prev =>
        prev ? { ...prev, txs: prev.txs.filter(tx => tx.id !== id) } : null
      )
      setTransactions(prev => prev.filter(tx => tx.id !== id))
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  async function handleSaveDescription(id: string) {
    setSavingId(id)
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ description: editValue.trim() || null })
        .eq('id', id)
      if (error) throw error
      setExtrato(prev =>
        prev
          ? { ...prev, txs: prev.txs.map(tx => tx.id === id ? { ...tx, description: editValue.trim() || null } : tx) }
          : null
      )
      setEditingId(null)
    } catch {
      // silently ignore — user can retry
    } finally {
      setSavingId(null)
    }
  }

  async function openHistorico() {
    setSelectedBarIndex(5)
    setView('historico')
    setHistoricoLoading(true)
    // monta lista dos últimos 6 meses (mais antigo → mais recente)
    const months: HistoricoItem[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const { start, end } = getMonthRange(y, m)
      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', start)
        .lte('date', end)
      const total = ((data ?? []) as { amount: number }[]).reduce((s, t) => s + t.amount, 0)
      months.push({ year: y, month: m, total })
    }
    setHistoricoData(months)
    setHistoricoLoading(false)
  }

  function openExtrato(label: string, txs: Transaction[], origin: 'entradas' | 'saidas') {
    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
    setExtrato({ label, txs: sorted, origin })
    setView('extrato')
  }

  // ─── Derived data ───────────────────────────────────────────────────────────

  const income = transactions.filter(t => t.type === 'income')
  const expenses = transactions.filter(t => t.type === 'expense')

  const totalIncome = income.reduce((s, t) => s + t.amount, 0)
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpenses
  const expensePct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0

  const uniqueSources = Array.from(new Set(income.filter(t => t.source).map(t => t.source!)))
  const incomeBySource: Record<string, number> = {}
  for (const src of uniqueSources) {
    incomeBySource[src] = income.filter(t => t.source === src).reduce((s, t) => s + t.amount, 0)
  }

  const uniqueExpenseTypes = Array.from(new Set(expenses.filter(t => t.expense_type).map(t => t.expense_type!)))
  const expensesByType: Record<string, number> = {}
  for (const et of uniqueExpenseTypes) {
    expensesByType[et] = expenses.filter(t => t.expense_type === et).reduce((s, t) => s + t.amount, 0)
  }

  const daysElapsed = getDaysElapsed(year, month)
  const daysInMonth = getDaysInMonth(year, month)

  const lazerSpent = expensesByType['Lazer'] ?? 0
  const lazerPct = lazerBudget > 0 ? (lazerSpent / lazerBudget) * 100 : 0
  const lazerRemaining = lazerBudget - lazerSpent
  const lazerDailyAvg = daysElapsed > 0 ? lazerSpent / daysElapsed : 0
  const lazerWeeklyAvg = lazerDailyAvg * 7

  const incomeChartData = uniqueSources
    .map((src, i) => ({ name: src, value: incomeBySource[src], color: INCOME_COLORS[src] ?? EXTRA_COLORS[i % EXTRA_COLORS.length] }))
    .filter(d => d.value > 0)

  const expenseChartData = uniqueExpenseTypes
    .map((et, i) => ({ name: et, value: expensesByType[et], color: EXPENSE_COLORS[et] ?? EXTRA_COLORS[i % EXTRA_COLORS.length] }))
    .filter(d => d.value > 0)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const incomeDiff = prevTotalIncome !== null ? totalIncome - prevTotalIncome : null

  // ─── Month selector ─────────────────────────────────────────────────────────

  const MonthSelector = () => (
    <div className="flex items-center justify-between mb-6">
      <button onClick={goToPrevMonth} className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#272727] transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <span className="text-sm font-semibold text-white capitalize">{getMonthLabel(year, month)}</span>
      <button onClick={goToNextMonth} disabled={isCurrentMonth} className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#272727] transition-colors disabled:opacity-30">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>
  )

  // Cabeçalho das telas de detalhe: Voltar (esquerda) + seletor compacto (centro) + espaçador (direita)
  const DetailHeader = ({ onBack }: { onBack: () => void }) => (
    <div className="flex items-center mb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Voltar</span>
      </button>

      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#272727] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-gray-400">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white capitalize">{getMonthLabel(year, month)}</span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#272727] transition-colors disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-gray-400">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* espaçador igual à largura do botão Voltar para manter o mês centralizado */}
      <div className="w-14 flex-shrink-0" />
    </div>
  )

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // ─── View: Histórico ────────────────────────────────────────────────────────

  if (view === 'historico') {
    const shortMonth = (y: number, m: number) =>
      new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

    const barData = (historicoData ?? []).map((item, i) => ({
      label: shortMonth(item.year, item.month),
      total: item.total,
      isCurrent: item.year === year && item.month === month,
      index: i,
    }))

    return (
      <div className="p-5 pt-8">
        <BackButton onBack={() => setView('main')} />

        <div className="mb-8">
          <p className="text-xs text-gray-500 tracking-wide font-medium mb-1">Relatório</p>
          <h2 className="text-2xl font-bold text-white">Histórico de Entradas</h2>
          <p className="text-sm text-gray-500 mt-1">Últimos 6 meses</p>
        </div>

        {historicoLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Lista de meses — ordem decrescente (atual primeiro) */}
            <div className="space-y-3 mb-8">
              {[...(historicoData ?? [])].reverse().map((item, i, arr) => {
                // próximo item na lista invertida = mês cronologicamente anterior
                const older = i < arr.length - 1 ? arr[i + 1] : null
                const diff = older !== null ? item.total - older.total : null
                const isCurrent = item.year === year && item.month === month
                const label = new Date(item.year, item.month - 1, 1)
                  .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  .replace(' de ', ' ')

                return (
                  <div
                    key={`${item.year}-${item.month}`}
                    className={`rounded-2xl px-4 py-4 border ${isCurrent ? 'bg-green-950/40 border-green-900/50' : 'bg-[#161616] border-[#222]'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold tracking-wide mb-1 ${isCurrent ? 'text-green-500' : 'text-gray-500'}`}>
                          {label}{isCurrent ? ' · atual' : ''}
                        </p>
                        <p className="text-2xl font-bold text-white tabular-nums">
                          {formatCurrency(item.total)}
                        </p>
                      </div>

                      {diff !== null && (
                        <div className={`flex items-center gap-1 mt-1 flex-shrink-0 ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            {diff >= 0
                              ? <path d="M12 19V5M5 12l7-7 7 7" />
                              : <path d="M12 5v14M5 12l7 7 7-7" />}
                          </svg>
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(Math.abs(diff))}
                          </span>
                        </div>
                      )}
                    </div>

                    {diff !== null && (
                      <p className={`text-xs mt-1.5 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? 'a mais' : 'a menos'} que o mês anterior
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Gráfico de barras */}
            {barData.length > 0 && (
              <div className="bg-[#161616] border border-[#222] rounded-3xl p-5">
                <p className="text-xs text-gray-500 tracking-wide font-medium mb-5">Evolução</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barData} barSize={32} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 8 }}
                      content={({ active, payload, label: lbl }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-3 py-2 shadow-xl">
                            <p className="text-xs text-gray-400 mb-0.5 capitalize">{lbl}</p>
                            <p className="text-sm font-bold text-white">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 3, 3]}
                      onClick={(_: unknown, index: number) => setSelectedBarIndex(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      {barData.map((entry, i) => (
                        <Cell
                          key={entry.index}
                          fill={i === selectedBarIndex ? '#22c55e' : '#2a2a2a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ─── View: Extrato ──────────────────────────────────────────────────────────

  if (view === 'extrato' && extrato) {
    return (
      <div className="p-5 pt-8">
        <BackButton onBack={() => setView(extrato.origin)} />

        <div className="mb-6">
          <p className="text-xs text-gray-500 tracking-wide font-medium mb-1">Extrato</p>
          <h2 className="text-2xl font-bold text-white">{extrato.label}</h2>
          <p className="text-sm text-gray-500 mt-1 capitalize">{getMonthLabel(year, month)}</p>
        </div>

        {extrato.txs.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-16">Nenhuma transação neste período.</p>
        ) : (
          <div className="space-y-3">
            {extrato.txs.map(tx => {
              const isEditing = editingId === tx.id
              const isConfirming = confirmDeleteId === tx.id
              const isDeleting = deletingId === tx.id
              return (
                <div key={tx.id} className="bg-[#161616] border border-[#222] rounded-2xl px-4 py-3.5">
                  {isConfirming ? (
                    <div className="space-y-3">
                      <p className="text-sm text-white font-medium">Tem certeza que deseja excluir?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          disabled={isDeleting}
                          className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-50"
                        >
                          {isDeleting ? 'Excluindo…' : 'Excluir'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-1.5 rounded-lg bg-[#272727] text-gray-300 text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveDescription(tx.id); if (e.key === 'Escape') setEditingId(null) }}
                        autoFocus
                        placeholder="Descrição"
                        className="w-full bg-[#272727] rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-white/20 placeholder-[#444]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDescription(tx.id)}
                          disabled={savingId === tx.id}
                          className="px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold disabled:opacity-50"
                        >
                          {savingId === tx.id ? 'Salvando…' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-1.5 rounded-lg bg-[#272727] text-gray-300 text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {tx.description || tx.source || tx.expense_type || '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums mr-1 ${extrato.origin === 'entradas' ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(tx.amount)}
                        </p>
                        <button
                          onClick={() => { setEditingId(tx.id); setEditValue(tx.description ?? '') }}
                          className="p-1.5 rounded-lg hover:bg-[#272727] transition-colors text-gray-600 hover:text-gray-400"
                          aria-label="Editar descrição"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-[#272727] transition-colors text-gray-600 hover:text-red-400"
                          aria-label="Excluir transação"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── View: Entradas ─────────────────────────────────────────────────────────

  if (view === 'entradas') {
    return (
      <div className="p-5 pt-8">
        <DetailHeader onBack={() => setView('main')} />

        <div className="mb-6">
          <p className="text-xs text-gray-500 tracking-wide font-medium mb-1">Total de entradas</p>
          <p className="text-4xl font-bold text-green-400 tabular-nums">{formatCurrency(totalIncome)}</p>
        </div>

        {incomeChartData.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">Nenhuma entrada neste mês.</p>
        ) : (
          <>
            <DonutChart data={incomeChartData} />

            <div className="mt-6 space-y-3">
              {incomeChartData.map(({ name: src, color }) => {
                const v = incomeBySource[src]
                const pct = totalIncome > 0 ? (v / totalIncome) * 100 : 0
                const txs = income.filter(t => t.source === src)
                return (
                  <button
                    key={src}
                    onClick={() => openExtrato(src, txs, 'entradas')}
                    className="w-full flex items-center gap-3 bg-[#161616] border border-[#222] rounded-2xl px-4 py-3.5 hover:bg-[#1e1e1e] active:scale-[0.98] transition-all text-left"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-sm text-gray-200 font-medium">{src}</span>
                    <span className="text-xs text-gray-500">{formatPercent(pct)}</span>
                    <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(v)}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600 flex-shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── View: Saídas ───────────────────────────────────────────────────────────

  if (view === 'saidas') {
    return (
      <div className="p-5 pt-8">
        <DetailHeader onBack={() => setView('main')} />

        <div className="mb-6">
          <p className="text-xs text-gray-500 tracking-wide font-medium mb-1">Total de saídas</p>
          <p className="text-4xl font-bold text-red-400 tabular-nums">{formatCurrency(totalExpenses)}</p>
        </div>

        {expenseChartData.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">Nenhuma saída neste mês.</p>
        ) : (
          <>
            <DonutChart data={expenseChartData} />

            <div className="mt-6 space-y-3">
              {expenseChartData.map(({ name: et, color }) => {
                const v = expensesByType[et]
                const pct = totalExpenses > 0 ? (v / totalExpenses) * 100 : 0
                const txs = expenses.filter(t => t.expense_type === et)
                return (
                  <button
                    key={et}
                    onClick={() => openExtrato(et, txs, 'saidas')}
                    className="w-full flex items-center gap-3 bg-[#161616] border border-[#222] rounded-2xl px-4 py-3.5 hover:bg-[#1e1e1e] active:scale-[0.98] transition-all text-left"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-sm text-gray-200 font-medium">{et}</span>
                    <span className="text-xs text-gray-500">{formatPercent(pct)}</span>
                    <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(v)}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600 flex-shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                )
              })}
            </div>

            {/* Controle de Lazer */}
            <div className="mt-6 bg-[#161616] border border-[#222] rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-xs text-gray-400 tracking-wide font-semibold">Controle de Lazer</p>
              </div>

              {lazerBudget > 0 ? (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-white tabular-nums">{formatCurrency(lazerSpent)}</span>
                    <span className="text-sm text-gray-500">de {formatCurrency(lazerBudget)}</span>
                  </div>

                  <ProgressBar pct={lazerPct} />

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{formatPercent(lazerPct)} utilizado</span>
                    <span className={
                      lazerRemaining < 0
                        ? 'text-red-400 font-semibold'
                        : lazerPct >= 70
                          ? 'text-yellow-400 font-medium'
                          : 'text-green-400 font-medium'
                    }>
                      {lazerRemaining < 0
                        ? `${formatCurrency(Math.abs(lazerRemaining))} estourado`
                        : `${formatCurrency(lazerRemaining)} restantes`}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-600">Defina um teto em Configurações.</p>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── View: Main ─────────────────────────────────────────────────────────────

  return (
    <div className="p-5 pt-8">
      <MonthSelector />

      {/* Hero — Saldo */}
      <div className="bg-[#161616] border border-[#222] rounded-3xl p-6 mb-4 text-center">
        <p className="text-xs text-gray-500 tracking-wide font-medium mb-3">Saldo do mês</p>
        <p className={`text-4xl font-bold tabular-nums mb-2 ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(balance)}
        </p>
        <p className="text-sm text-gray-500">
          {totalIncome > 0
            ? `Você usou ${formatPercent(expensePct)} do que entrou`
            : 'Nenhuma entrada registrada'}
        </p>
      </div>

      {/* Entradas + Saídas */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => setView('entradas')}
          className="bg-green-950/60 border border-green-900/60 hover:bg-green-950 hover:border-green-800 active:scale-95 transition-all rounded-3xl p-5 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-semibold tracking-wide">Entradas</span>
          </div>
          <p className="text-2xl font-bold text-green-400 tabular-nums leading-tight">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
            Ver detalhes
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m9 18 6-6-6-6" /></svg>
          </p>
        </button>

        <button
          onClick={() => setView('saidas')}
          className="bg-red-950/60 border border-red-900/60 hover:bg-red-950 hover:border-red-800 active:scale-95 transition-all rounded-3xl p-5 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-700 font-semibold tracking-wide">Saídas</span>
          </div>
          <p className="text-2xl font-bold text-red-400 tabular-nums leading-tight">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-red-800 mt-1 flex items-center gap-1">
            Ver detalhes
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m9 18 6-6-6-6" /></svg>
          </p>
        </button>
      </div>

      {/* Média Lazer + Entradas vs mês anterior */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        {/* Card: Média Lazer */}
        <button
          onClick={() => setLazerSheetOpen(true)}
          className="bg-[#161616] border border-[#222] hover:bg-[#1e1e1e] active:scale-95 transition-all rounded-3xl p-5 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs text-gray-500 font-semibold tracking-wide">Média Lazer</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(lazerWeeklyAvg)}</p>
          <p className="text-xs text-gray-600 mt-1">por semana</p>
        </button>

        {/* Card: Entradas vs mês anterior */}
        <button
          onClick={openHistorico}
          className="bg-[#161616] border border-[#222] hover:bg-[#1e1e1e] active:scale-95 transition-all rounded-3xl p-5 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-500 font-semibold tracking-wide">Entradas</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalIncome)}</p>
          {incomeDiff !== null && prevTotalIncome !== null && prevTotalIncome > 0 ? (
            <div className={`flex items-center gap-1 mt-1 ${incomeDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                {incomeDiff >= 0
                  ? <path d="M12 19V5M5 12l7-7 7 7" />
                  : <path d="M12 5v14M5 12l7 7 7-7" />}
              </svg>
              <span className="text-xs leading-tight">
                {formatCurrency(Math.abs(incomeDiff))} {incomeDiff >= 0 ? 'a mais' : 'a menos'} que {prevMonthLabel}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-600 mt-1">Sem dados anteriores</p>
          )}
          <p className="text-xs text-purple-700 mt-2 flex items-center gap-1">
            Ver histórico
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m9 18 6-6-6-6" /></svg>
          </p>
        </button>
      </div>

      {/* Sheet: Média Lazer */}
      <Sheet isOpen={lazerSheetOpen} onClose={() => setLazerSheetOpen(false)} title="Média de Lazer">
        <div className="space-y-4">
          <div className="bg-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs text-gray-500 tracking-wide font-medium mb-2">Média semanal</p>
            <p className="text-4xl font-bold text-white tabular-nums">{formatCurrency(lazerWeeklyAvg)}</p>
            <p className="text-xs text-gray-600 mt-1">projeção de 7 dias</p>
          </div>
          <div className="bg-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs text-gray-500 tracking-wide font-medium mb-2">Média diária</p>
            <p className="text-4xl font-bold text-white tabular-nums">{formatCurrency(lazerDailyAvg)}</p>
            <p className="text-xs text-gray-600 mt-1">baseado em {daysElapsed} de {daysInMonth} dias</p>
          </div>
          <div className="bg-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs text-gray-500 tracking-wide font-medium mb-2">Total gasto em Lazer</p>
            <p className="text-4xl font-bold text-white tabular-nums">{formatCurrency(lazerSpent)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {expenses.filter(t => t.expense_type === 'Lazer').length} transações
            </p>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
