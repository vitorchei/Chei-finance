'use client'

import { useEffect, useState } from 'react'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { MonthlyBudget, TransactionType } from '@/types'
import { formatCurrency } from '@/lib/utils'

type ToastState = { message: string; type: 'success' | 'error' } | null
type Tab = 'income' | 'expense'

async function fetchUserName(): Promise<string> {
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'user_name')
    .single()
  return (data as { value: string } | null)?.value ?? ''
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export default function ConfiguracoesPage() {
  // ─── Lazer budget ───────────────────────────────────────────────────────────
  const [lazerLimit, setLazerLimit] = useState('')
  const [currentLimit, setCurrentLimit] = useState(0)
  const [lazerLoading, setLazerLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ─── Transaction types ──────────────────────────────────────────────────────
  const [types, setTypes] = useState<TransactionType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('income')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ─── User name ──────────────────────────────────────────────────────────────
  const [userName, setUserName] = useState('')
  const [savedUserName, setSavedUserName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState>(null)

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBudget() {
      const { data } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('expense_type', 'lazer')
        .single()
      const budget = data as MonthlyBudget | null
      if (budget) {
        setCurrentLimit(budget.limit_amount)
        setLazerLimit(String(budget.limit_amount))
      }
      setLazerLoading(false)
    }

    async function fetchTypes() {
      const { data } = await supabase
        .from('transaction_types')
        .select('*')
        .order('created_at', { ascending: true })
      setTypes((data as TransactionType[]) ?? [])
      setTypesLoading(false)
    }

    async function fetchName() {
      const name = await fetchUserName()
      setUserName(name)
      setSavedUserName(name)
    }

    fetchBudget()
    fetchTypes()
    fetchName()
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  async function handleSaveLazer() {
    const value = parseFloat(lazerLimit.replace(',', '.'))
    if (isNaN(value) || value < 0) {
      setToast({ message: 'Informe um valor válido.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('monthly_budgets')
        .upsert(
          { expense_type: 'lazer', limit_amount: value, updated_at: new Date().toISOString() },
          { onConflict: 'expense_type' }
        )
      if (error) throw error
      setCurrentLimit(value)
      setToast({ message: 'Teto de lazer atualizado!', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao salvar. Tente novamente.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddType() {
    const label = newLabel.trim()
    if (!label) return
    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('transaction_types')
        .insert({ transaction_type: activeTab, label })
        .select()
        .single()
      if (error) throw error
      setTypes(prev => [...prev, data as TransactionType])
      setNewLabel('')
      setToast({ message: 'Tipo adicionado com sucesso!', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao adicionar. Tente novamente.', type: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteType(id: string) {
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('transaction_types')
        .delete()
        .eq('id', id)
      if (error) throw error
      setTypes(prev => prev.filter(t => t.id !== id))
    } catch {
      setToast({ message: 'Erro ao excluir. Tente novamente.', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSaveName() {
    const name = userName.trim()
    if (!name) return
    setSavingName(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ key: 'user_name', value: name, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      setSavedUserName(name)
      setToast({ message: 'Nome atualizado!', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao salvar. Tente novamente.', type: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  const activeTypes = types.filter(t => t.transaction_type === activeTab)

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 pt-8 space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie limites e tipos de transação</p>
      </div>

      {/* Teto de Lazer */}
      {lazerLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <section className="bg-[#161616] border border-[#222] rounded-3xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-400">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Teto de Lazer</p>
              <p className="text-xs text-gray-500">Limite mensal para gastos com lazer</p>
            </div>
          </div>

          {currentLimit > 0 && (
            <div className="bg-[#1e1e1e] rounded-2xl px-4 py-3">
              <p className="text-xs text-gray-500">Teto atual</p>
              <p className="text-2xl font-bold text-yellow-400 tabular-nums mt-0.5">
                {formatCurrency(currentLimit)}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 tracking-wide font-medium">
              Novo teto (R$)
            </label>
            <div className="flex items-baseline mt-3 border-b-2 border-yellow-500/50 pb-2 focus-within:border-yellow-400 transition-colors">
              <span className="text-xl text-gray-500 mr-2 font-light">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={lazerLimit}
                onChange={(e) => setLazerLimit(e.target.value)}
                className="flex-1 text-4xl font-bold text-white bg-transparent outline-none placeholder-[#333] leading-tight"
              />
            </div>
          </div>

          <button
            onClick={handleSaveLazer}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-bold text-base hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar teto'}
          </button>
        </section>
      )}

      {/* Tipos de transação */}
      <section className="bg-[#161616] border border-[#222] rounded-3xl p-5 space-y-5">
        <div>
          <p className="text-white font-semibold">Tipos de transação</p>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie as categorias de entradas e saídas</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#1e1e1e] rounded-2xl p-1 gap-1">
          <button
            onClick={() => { setActiveTab('income'); setNewLabel('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'income' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Entradas
          </button>
          <button
            onClick={() => { setActiveTab('expense'); setNewLabel('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'expense' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Saídas
          </button>
        </div>

        {/* List */}
        {typesLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {activeTypes.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Nenhum tipo cadastrado.</p>
            ) : (
              activeTypes.map(type => (
                <div
                  key={type.id}
                  className="flex items-center justify-between bg-[#1e1e1e] rounded-2xl px-4 py-3"
                >
                  <span className="text-sm text-white font-medium">{type.label}</span>
                  <button
                    onClick={() => handleDeleteType(type.id)}
                    disabled={activeTypes.length <= 1 || deletingId === type.id}
                    className="p-1.5 rounded-lg hover:bg-[#333] transition-colors text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Excluir tipo"
                  >
                    {deletingId === type.id ? (
                      <div className="w-4 h-4 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddType() }}
            placeholder={activeTab === 'income' ? 'Nova fonte de entrada...' : 'Novo tipo de saída...'}
            className="flex-1 bg-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-white/15"
          />
          <button
            onClick={handleAddType}
            disabled={!newLabel.trim() || adding}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'income' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
          >
            {adding ? '...' : 'Adicionar'}
          </button>
        </div>
      </section>

      {/* Personalização */}
      <section className="bg-[#161616] border border-[#222] rounded-3xl p-5 space-y-5">
        <div>
          <p className="text-white font-semibold">Personalização</p>
          <p className="text-xs text-gray-500 mt-0.5">Como quer ser chamado no app</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 tracking-wide font-medium">Seu nome</label>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
            placeholder="mestre chei"
            className="w-full mt-3 bg-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-white/15"
          />
          {savedUserName ? (
            <p className="text-xs text-gray-600 mt-2">Atual: <span className="text-gray-400">{savedUserName}</span></p>
          ) : null}
        </div>

        <button
          onClick={handleSaveName}
          disabled={!userName.trim() || savingName}
          className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingName ? 'Salvando...' : 'Salvar'}
        </button>
      </section>

      {/* Sobre */}
      <section className="bg-[#161616] border border-[#222] rounded-3xl p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 tracking-wide">Sobre</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Finanças Pessoais</p>
          <p className="text-xs">
            Controle de entradas, saídas e relatórios mensais com teto configurável para lazer.
          </p>
        </div>
      </section>
    </div>
  )
}
