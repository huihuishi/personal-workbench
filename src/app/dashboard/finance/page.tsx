'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { BankCard, ExpenseRecord, IncomeRecord, IncomeCycle } from '@/types';
import { parseCsvExpenses } from '@/lib/finance/csv';
import { Wallet, Plus, X, CreditCard, TrendingDown, TrendingUp, Upload, Trash2, Edit2 } from 'lucide-react';

type Tab = 'overview' | 'cards' | 'expense' | 'income' | 'import';

export default function FinancePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [cards, setCards] = useState<BankCard[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [cycles, setCycles] = useState<IncomeCycle[]>([]);
  const [loading, setLoading] = useState(true);

  // 表单状态
  const [showCardForm, setShowCardForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);

  // 卡片表单
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardTail, setCardTail] = useState('');
  const [cardCategory, setCardCategory] = useState('未分类');
  const [cardBalance, setCardBalance] = useState('');
  const [isLargeExpense, setIsLargeExpense] = useState(false);

  // 支出表单
  const [expCardId, setExpCardId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expIsLarge, setExpIsLarge] = useState(false);

  // 收入表单
  const [incAmount, setIncAmount] = useState('');
  const [incPeriodStart, setIncPeriodStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [incPeriodEnd, setIncPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [incCycleType, setIncCycleType] = useState('monthly');
  const [allocations, setAllocations] = useState<{ cardId: string; amount: string }[]>([]);

  // CSV 导入
  const [csvText, setCsvText] = useState('');
  const [csvCardId, setCsvCardId] = useState('');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cardsRes, expRes, incRes, cycRes] = await Promise.all([
        supabase.from('bank_cards').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('expense_records').select('*').eq('user_id', user.id).order('expense_date', { ascending: false }).limit(50),
        supabase.from('income_records').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('income_cycles').select('*').eq('user_id', user.id).order('created_at'),
      ]);
      setCards(cardsRes.data || []);
      setExpenses(expRes.data || []);
      setIncomes(incRes.data || []);
      setCycles(cycRes.data || []);
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // 统计
  const totalBalance = cards.reduce((sum, c) => sum + Number(c.balance), 0);
  const monthExpenses = expenses
    .filter(e => { const d = parseISO(e.expense_date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); })
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const monthIncome = incomes
    .filter(i => { const d = parseISO(i.period_start); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); })
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // 保存银行卡
  const handleSaveCard = async () => {
    if (!user) return;
    if (!cardName.trim()) { toast.error('请输入卡名'); return; }
    try {
      const payload = {
        user_id: user.id,
        card_name: cardName.trim(),
        bank_name: bankName || null,
        card_number_tail: cardTail || null,
        category: cardCategory,
        balance: Number(cardBalance) || 0,
        is_large_expense: isLargeExpense,
        sort_order: cards.length,
      };
      if (editingCard) {
        const { error } = await supabase.from('bank_cards').update(payload).eq('id', editingCard.id);
        if (error) throw error;
        toast.success('修改成功');
      } else {
        const { error } = await supabase.from('bank_cards').insert(payload);
        if (error) throw error;
        toast.success('添加成功');
      }
      setShowCardForm(false);
      resetCardForm();
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const resetCardForm = () => {
    setCardName(''); setBankName(''); setCardTail(''); setCardCategory('未分类');
    setCardBalance(''); setIsLargeExpense(false); setEditingCard(null);
  };

  // 删除银行卡
  const handleDeleteCard = async (id: string) => {
    if (!confirm('确定删除此卡片？相关支出记录也会被删除。')) return;
    try {
      const { error } = await supabase.from('bank_cards').delete().eq('id', id);
      if (error) throw error;
      toast.success('删除成功');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  // 保存支出
  const handleSaveExpense = async () => {
    if (!user) return;
    if (!expCardId || !expAmount) { toast.error('请选择银行卡并输入金额'); return; }
    try {
      const { error: expError } = await supabase.from('expense_records').insert({
        user_id: user.id,
        card_id: expCardId,
        amount: Number(expAmount),
        category: expCategory || null,
        description: expDesc || null,
        expense_date: expDate,
        is_large: expIsLarge,
      });
      if (expError) throw expError;

      // 扣减余额
      const card = cards.find(c => c.id === expCardId);
      if (card) {
        await supabase.from('bank_cards').update({
          balance: Number(card.balance) - Number(expAmount),
        }).eq('id', expCardId);
      }

      toast.success('支出已记录');
      setShowExpenseForm(false);
      setExpAmount(''); setExpCategory(''); setExpDesc(''); setExpIsLarge(false);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  // 保存收入
  const handleSaveIncome = async () => {
    if (!user) return;
    if (!incAmount) { toast.error('请输入收入金额'); return; }
    const totalAlloc = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    if (totalAlloc > 0 && Math.abs(totalAlloc - Number(incAmount)) > 0.01) {
      toast.error(`分配总额(${totalAlloc})不等于收入(${incAmount})`);
      return;
    }
    try {
      const { data: incData, error: incError } = await supabase.from('income_records').insert({
        user_id: user.id,
        amount: Number(incAmount),
        period_start: incPeriodStart,
        period_end: incPeriodEnd,
        cycle_type: incCycleType,
      }).select().single();
      if (incError) throw incError;

      // 分配到各卡
      for (const alloc of allocations) {
        if (alloc.amount && Number(alloc.amount) > 0) {
          await supabase.from('income_allocations').insert({
            income_id: incData.id,
            card_id: alloc.cardId,
            amount: Number(alloc.amount),
          });
          // 增加卡余额
          const card = cards.find(c => c.id === alloc.cardId);
          if (card) {
            await supabase.from('bank_cards').update({
              balance: Number(card.balance) + Number(alloc.amount),
            }).eq('id', alloc.cardId);
          }
        }
      }

      toast.success('收入已记录');
      setShowIncomeForm(false);
      setIncAmount(''); setAllocations([]);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  // CSV 导入
  const handleCSVImport = async () => {
    if (!user) return;
    if (!csvCardId) { toast.error('请选择银行卡'); return; }
    if (!csvText.trim()) { toast.error('请输入CSV数据'); return; }
    try {
      const fallbackDate = format(new Date(), 'yyyy-MM-dd');
      const parsed = parseCsvExpenses(csvText, fallbackDate);
      for (const p of parsed) {
        await supabase.from('expense_records').insert({
          user_id: user.id,
          card_id: csvCardId,
          amount: p.amount,
          category: p.category,
          description: p.description,
          expense_date: p.date,
          is_large: false,
        });
      }
      const count = parsed.length;
      // 余额扣减金额 === 实际入库金额，保证账目一致
      const totalExp = parsed.reduce((s, p) => s + p.amount, 0);
      const card = cards.find(c => c.id === csvCardId);
      if (card) {
        await supabase.from('bank_cards').update({
          balance: Number(card.balance) - totalExp,
        }).eq('id', csvCardId);
      }
      toast.success(`成功导入 ${count} 条支出`);
      setCsvText(''); setCsvCardId('');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导入失败');
    }
  };

  // 删除支出
  const handleDeleteExpense = async (id: string, amount: number, cardId: string) => {
    if (!confirm('确定删除此支出记录？')) return;
    try {
      const { error } = await supabase.from('expense_records').delete().eq('id', id);
      if (error) throw error;
      // 恢复余额
      const card = cards.find(c => c.id === cardId);
      if (card) {
        await supabase.from('bank_cards').update({
          balance: Number(card.balance) + amount,
        }).eq('id', cardId);
      }
      toast.success('删除成功');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const openEditCard = (card: BankCard) => {
    setEditingCard(card);
    setCardName(card.card_name);
    setBankName(card.bank_name || '');
    setCardTail(card.card_number_tail || '');
    setCardCategory(card.category);
    setCardBalance(String(card.balance));
    setIsLargeExpense(card.is_large_expense);
    setShowCardForm(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '概览', icon: <Wallet size={14} /> },
    { key: 'cards', label: '银行卡', icon: <CreditCard size={14} /> },
    { key: 'expense', label: '支出', icon: <TrendingDown size={14} /> },
    { key: 'income', label: '收入', icon: <TrendingUp size={14} /> },
    { key: 'import', label: 'CSV导入', icon: <Upload size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Wallet size={20} /> 资金管理
      </h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              activeTab === t.key ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 概览 */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
              <p className="text-xs opacity-80">总资产</p>
              <p className="text-xl font-bold mt-1">¥{totalBalance.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4">
              <p className="text-xs opacity-80">本月收入</p>
              <p className="text-xl font-bold mt-1">¥{monthIncome.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl p-4">
              <p className="text-xs opacity-80">本月支出</p>
              <p className="text-xl font-bold mt-1">¥{monthExpenses.toFixed(2)}</p>
            </div>
          </div>

          {/* 卡片列表 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">银行卡</h2>
            {cards.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">还没有银行卡，去添加一张吧</p>
            ) : (
              <div className="space-y-2">
                {cards.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div>
                      <span className="text-sm font-medium">{c.card_name}</span>
                      {c.bank_name && <span className="text-xs text-gray-400 ml-2">{c.bank_name}</span>}
                      {c.is_large_expense && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-2">大额</span>}
                    </div>
                    <span className="text-sm font-bold text-blue-600">¥{Number(c.balance).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 最近支出 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">最近支出</h2>
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无支出记录</p>
            ) : (
              <div className="space-y-1">
                {expenses.slice(0, 10).map(e => {
                  const card = cards.find(c => c.id === e.card_id);
                  return (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700">{e.description || e.category || '未分类'}</span>
                        <span className="text-xs text-gray-400 ml-2">{card?.card_name || '未知卡'}</span>
                      </div>
                      <span className="text-sm text-red-500">-¥{Number(e.amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 银行卡管理 */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          <button
            onClick={() => { resetCardForm(); setShowCardForm(true); }}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
          >
            <Plus size={16} /> 添加银行卡
          </button>
          {cards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              还没有银行卡
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-500" />
                      <span className="font-medium text-sm">{c.card_name}</span>
                      {c.is_large_expense && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">大额</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {c.bank_name} {c.card_number_tail && `(${c.card_number_tail})`} · {c.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-600">¥{Number(c.balance).toFixed(2)}</span>
                    <button onClick={() => openEditCard(c)} className="text-gray-400 hover:text-blue-500">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteCard(c.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 支出管理 */}
      {activeTab === 'expense' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
          >
            <Plus size={16} /> 记一笔支出
          </button>
          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              暂无支出记录
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {expenses.map(e => {
                const card = cards.find(c => c.id === e.card_id);
                return (
                  <div key={e.id} className="flex items-center justify-between p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{e.description || e.category || '未分类'}</span>
                        {e.is_large && <span className="text-xs bg-red-100 text-red-600 px-1 rounded">大额</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {format(parseISO(e.expense_date), 'MM-dd')} · {card?.card_name || '未知'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-500">-¥{Number(e.amount).toFixed(2)}</span>
                      <button onClick={() => handleDeleteExpense(e.id, Number(e.amount), e.card_id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 收入管理 */}
      {activeTab === 'income' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowIncomeForm(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
          >
            <Plus size={16} /> 记一笔收入
          </button>
          {incomes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              暂无收入记录
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {incomes.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3">
                  <div>
                    <span className="text-sm font-medium text-green-600">+¥{Number(i.amount).toFixed(2)}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(i.period_start), 'MM-dd')} ~ {format(parseISO(i.period_end), 'MM-dd')} · {i.cycle_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CSV 导入 */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">CSV 导入支出</h2>
          <p className="text-xs text-gray-400">格式：金额,日期,分类,描述（每行一条，用逗号分隔）</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">选择银行卡</label>
            <select
              value={csvCardId}
              onChange={(e) => setCsvCardId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">选择银行卡</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>{c.card_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">CSV 数据</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'50.00,2026-07-30,餐饮,午餐\n100,2026-07-29,交通,打车'}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
          </div>
          <button
            onClick={handleCSVImport}
            className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
          >
            <Upload size={16} /> 导入
          </button>
        </div>
      )}

      {/* 银行卡表单弹窗 */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowCardForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">{editingCard ? '编辑银行卡' : '添加银行卡'}</h3>
              <button onClick={() => setShowCardForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="卡名（如：招行储蓄卡）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="银行名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="text" value={cardTail} onChange={e => setCardTail(e.target.value)} placeholder="卡号尾号（如：8888）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={cardCategory} onChange={e => setCardCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="未分类">未分类</option>
                <option value="储蓄卡">储蓄卡</option>
                <option value="信用卡">信用卡</option>
                <option value="理财">理财</option>
                <option value="现金">现金</option>
              </select>
              <input type="number" value={cardBalance} onChange={e => setCardBalance(e.target.value)} placeholder="当前余额"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={isLargeExpense} onChange={e => setIsLargeExpense(e.target.checked)} />
                标记为大额消费卡
              </label>
              <button onClick={handleSaveCard} className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
                {editingCard ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 支出表单弹窗 */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowExpenseForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">记一笔支出</h3>
              <button onClick={() => setShowExpenseForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <select value={expCardId} onChange={e => setExpCardId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">选择银行卡</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
              </select>
              <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="金额"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="text" value={expCategory} onChange={e => setExpCategory(e.target.value)} placeholder="分类（如：餐饮、交通）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="描述"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={expIsLarge} onChange={e => setExpIsLarge(e.target.checked)} />
                大额支出
              </label>
              <button onClick={handleSaveExpense} className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收入表单弹窗 */}
      {showIncomeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowIncomeForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold">记一笔收入</h3>
              <button onClick={() => setShowIncomeForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input type="number" value={incAmount} onChange={e => setIncAmount(e.target.value)} placeholder="收入金额"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={incPeriodStart} onChange={e => setIncPeriodStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={incPeriodEnd} onChange={e => setIncPeriodEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <select value={incCycleType} onChange={e => setIncCycleType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="monthly">月度</option>
                <option value="weekly">周度</option>
                <option value="biweekly">双周</option>
                <option value="custom">自定义</option>
              </select>

              {/* 收入分配 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">分配到银行卡（可选）</label>
                {allocations.map((alloc, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <select
                      value={alloc.cardId}
                      onChange={e => {
                        const next = [...allocations];
                        next[i].cardId = e.target.value;
                        setAllocations(next);
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs"
                    >
                      <option value="">选择卡</option>
                      {cards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                    </select>
                    <input
                      type="number"
                      value={alloc.amount}
                      onChange={e => {
                        const next = [...allocations];
                        next[i].amount = e.target.value;
                        setAllocations(next);
                      }}
                      placeholder="金额"
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <button onClick={() => setAllocations(allocations.filter((_, j) => j !== i))} className="text-red-400 px-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setAllocations([...allocations, { cardId: '', amount: '' }])}
                  className="text-xs text-blue-500 mt-1"
                >
                  + 添加分配
                </button>
              </div>

              <button onClick={handleSaveIncome} className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
