'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { BankCard, ExpenseRecord, IncomeRecord } from '@/types';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

// 饼图颜色配色
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16',
];

// Tooltip 自定义样式
const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(val);
}

export default function AssetAnalysisPage() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<BankCard[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cardsRes, expRes, incRes] = await Promise.all([
        supabase.from('bank_cards').select('*').eq('user_id', user.id).order('sort_order'),
        supabase
          .from('expense_records')
          .select('*')
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false }),
        supabase
          .from('income_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (expRes.error) throw expRes.error;
      if (incRes.error) throw incRes.error;

      setCards(cardsRes.data || []);
      setExpenses(expRes.data || []);
      setIncomes(incRes.data || []);
    } catch (e) {
      console.error('加载资产分析数据失败:', e);
      toast.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ====== 计算 ======

  // 银行卡余额分布数据
  const cardBalanceData = useMemo(() => {
    return cards
      .filter((c) => Number(c.balance) !== 0)
      .map((c) => ({
        name: c.card_name,
        value: Math.abs(Number(c.balance)),
        isNegative: Number(c.balance) < 0,
      }));
  }, [cards]);

  // 总资产（余额 > 0 的卡）
  const totalAssets = useMemo(
    () => cards.filter((c) => Number(c.balance) > 0).reduce((sum, c) => sum + Number(c.balance), 0),
    [cards],
  );

  // 总负债（余额 < 0 的卡，如信用卡欠款）
  const totalLiabilities = useMemo(
    () => Math.abs(cards.filter((c) => Number(c.balance) < 0).reduce((sum, c) => sum + Number(c.balance), 0)),
    [cards],
  );

  // 净资产
  const netAssets = totalAssets - totalLiabilities;

  // 近6个月收支趋势
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const months: { label: string; income: number; expense: number; key: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const key = format(monthDate, 'yyyy-MM');

      const monthIncome = incomes
        .filter((inc) => {
          try {
            const d = parseISO(inc.period_start);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        })
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      const monthExpense = expenses
        .filter((exp) => {
          try {
            const d = parseISO(exp.expense_date);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      months.push({
        label: format(monthDate, 'MM月', { locale: zhCN }),
        income: Math.round(monthIncome * 100) / 100,
        expense: Math.round(monthExpense * 100) / 100,
        key,
      });
    }

    return months;
  }, [incomes, expenses]);

  // 支出分类占比
  const expenseCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || '未分类';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
    }
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // 大额支出列表
  const largeExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.is_large)
      .sort((a, b) => {
        try {
          return parseISO(b.expense_date).getTime() - parseISO(a.expense_date).getTime();
        } catch {
          return 0;
        }
      });
  }, [expenses]);

  // 本月数据
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);

  const monthIncome = useMemo(
    () =>
      incomes
        .filter((inc) => {
          try {
            return isWithinInterval(parseISO(inc.period_start), { start: thisMonthStart, end: thisMonthEnd });
          } catch {
            return false;
          }
        })
        .reduce((sum, inc) => sum + Number(inc.amount), 0),
    [incomes, thisMonthStart, thisMonthEnd],
  );

  const monthExpense = useMemo(
    () =>
      expenses
        .filter((exp) => {
          try {
            return isWithinInterval(parseISO(exp.expense_date), { start: thisMonthStart, end: thisMonthEnd });
          } catch {
            return false;
          }
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0),
    [expenses, thisMonthStart, thisMonthEnd],
  );

  // ====== 渲染 ======

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <PieChartIcon size={20} className="text-blue-500" /> 资产分析
      </h1>

      {/* ===== 资产总览卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 总资产 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="opacity-80" />
            <span className="text-sm opacity-80">总资产</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAssets)}</p>
        </div>

        {/* 总负债 */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="opacity-80" />
            <span className="text-sm opacity-80">总负债 (信用卡)</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalLiabilities)}</p>
        </div>

        {/* 净资产 */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="opacity-80" />
            <span className="text-sm opacity-80">净资产</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(netAssets)}</p>
        </div>
      </div>

      {/* 本月收支小结 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-around">
        <div className="text-center">
          <div className="flex items-center gap-1 text-green-600 justify-center mb-1">
            <TrendingUp size={14} />
            <span className="text-xs text-gray-500">本月收入</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="w-px h-10 bg-gray-100" />
        <div className="text-center">
          <div className="flex items-center gap-1 text-orange-500 justify-center mb-1">
            <TrendingDown size={14} />
            <span className="text-xs text-gray-500">本月支出</span>
          </div>
          <p className="text-lg font-bold text-orange-500">{formatCurrency(monthExpense)}</p>
        </div>
        <div className="w-px h-10 bg-gray-100" />
        <div className="text-center">
          <div className="flex items-center gap-1 text-blue-600 justify-center mb-1">
            <Wallet size={14} />
            <span className="text-xs text-gray-500">本月结余</span>
          </div>
          <p className={`text-lg font-bold ${monthIncome - monthExpense >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {formatCurrency(monthIncome - monthExpense)}
          </p>
        </div>
      </div>

      {/* ===== 图表区域 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 银行卡余额分布饼图 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-blue-500" />
            <h3 className="font-semibold text-sm text-gray-700">银行卡余额分布</h3>
          </div>
          {cardBalanceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              暂无银行卡数据
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cardBalanceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      label={(entry: unknown) => {
                        const e = entry as { name?: string };
                        return `${e.name ?? ''}`;
                      }}
                      labelLine={false}
                    >
                      {cardBalanceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isNegative ? '#ef4444' : PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _name, entry) => [
                        formatCurrency(Number(value)),
                        (entry?.payload as { isNegative?: boolean })?.isNegative ? '负债' : '资产',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* 图例列表 */}
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {cardBalanceData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.isNegative ? '#ef4444' : PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                      {item.isNegative && (
                        <span className="text-red-400 text-[10px]">负债</span>
                      )}
                    </div>
                    <span className={`font-medium ${item.isNegative ? 'text-red-500' : 'text-gray-700'}`}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 支出分类占比饼图 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-purple-500" />
            <h3 className="font-semibold text-sm text-gray-700">支出分类占比</h3>
          </div>
          {expenseCategoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              暂无支出数据
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      label={false}
                    >
                      {expenseCategoryData.map((_, index) => (
                        <Cell key={`cat-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [formatCurrency(Number(value)), '支出']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* 图例列表 */}
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {expenseCategoryData.map((item, i) => {
                  const totalExpense = expenseCategoryData.reduce((s, d) => s + d.value, 0);
                  const pct = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                        <span className="text-gray-400">{pct}%</span>
                      </div>
                      <span className="font-medium text-gray-700">{formatCurrency(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== 近6个月收支趋势 ===== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-500" />
          <h3 className="font-semibold text-sm text-gray-700">近6个月收支趋势</h3>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(v) => `¥${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [formatCurrency(Number(value)), name === 'income' ? '收入' : '支出']}
              />
              <Legend
                formatter={(value) => (value === 'income' ? '收入' : '支出')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4, fill: '#ef4444' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== 近6个月支出柱状图 ===== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={18} className="text-orange-500" />
          <h3 className="font-semibold text-sm text-gray-700">近6个月支出对比</h3>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(v) => `¥${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [formatCurrency(Number(value)), '支出']}
              />
              <Bar dataKey="expense" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== 大额支出列表 ===== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-red-500" />
          <h3 className="font-semibold text-sm text-gray-700">大额支出记录</h3>
          {largeExpenses.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {largeExpenses.length} 笔
            </span>
          )}
        </div>
        {largeExpenses.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">暂无大额支出记录</div>
        ) : (
          <div className="space-y-2">
            {largeExpenses.map((exp) => {
              const card = cards.find((c) => c.id === exp.card_id);
              let dateStr = exp.expense_date;
              try {
                dateStr = format(parseISO(exp.expense_date), 'yyyy-MM-dd');
              } catch {
                // keep original
              }
              return (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {exp.description || exp.category || '未分类'}
                      </span>
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">大额</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{dateStr}</span>
                      {card && (
                        <>
                          <span>·</span>
                          <span>{card.card_name}</span>
                        </>
                      )}
                      {exp.category && (
                        <>
                          <span>·</span>
                          <span>{exp.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-500 whitespace-nowrap">
                    -{formatCurrency(Number(exp.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
