'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import {
  Wallet, TrendingUp, TrendingDown, Calendar,
  GraduationCap, Bell, Target,
} from 'lucide-react';
import type { DashboardData } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    total_assets: 0,
    monthly_income: 0,
    monthly_expense: 0,
    today_events: [],
    learning_progress: [],
    pending_notifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      // 获取未读通知数
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      // 获取今日日程
      const today = new Date().toISOString().split('T')[0];
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time')
        .limit(5);

      // 获取学习进度
      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // 获取本月收支
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: expenses } = await supabase
        .from('expense_records')
        .select('amount')
        .eq('user_id', user!.id)
        .gte('expense_date', monthStart.toISOString());

      const monthlyExpense = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // 获取银行卡总资产
      const { data: cards } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user!.id);

      setData({
        total_assets: cards?.reduce((sum: number, c: { balance?: number }) => sum + (c.balance || 0), 0) || 0,
        monthly_income: 0,
        monthly_expense: monthlyExpense,
        today_events: events || [],
        learning_progress: (skills || []).map((s: { name: string; progress: number }) => ({
          name: s.name,
          progress: s.progress,
        })),
        pending_notifications: notifCount || 0,
      });
    } catch (err) {
      console.error('加载仪表盘数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  };

  const cards = [
    {
      title: '总资产',
      value: formatCurrency(data.total_assets),
      icon: Wallet,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
    },
    {
      title: '本月收入',
      value: formatCurrency(data.monthly_income),
      icon: TrendingUp,
      color: 'bg-green-500',
      bg: 'bg-green-50',
    },
    {
      title: '本月支出',
      value: formatCurrency(data.monthly_expense),
      icon: TrendingDown,
      color: 'bg-orange-500',
      bg: 'bg-orange-50',
    },
    {
      title: '未读通知',
      value: `${data.pending_notifications} 条`,
      icon: Bell,
      color: 'bg-red-500',
      bg: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">仪表盘</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date().toLocaleDateString('zh-CN', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        })}
      </p>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={18} className={card.color.replace('bg-', 'text-')} />
              </div>
            </div>
            <p className="text-xs text-gray-500">{card.title}</p>
            <p className="text-lg font-bold text-gray-800 mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* 今日日程 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800 text-sm">今日日程</h3>
          </div>
          {data.today_events.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">今日暂无日程</p>
          ) : (
            <div className="space-y-2">
              {data.today_events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 w-12 text-right">
                    {new Date(event.start_time).toLocaleTimeString('zh-CN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  <span className="text-sm text-gray-700">{event.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 学习进度 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={18} className="text-purple-500" />
            <h3 className="font-semibold text-gray-800 text-sm">学习进度</h3>
          </div>
          {data.learning_progress.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">暂无学习记录</p>
          ) : (
            <div className="space-y-3">
              {data.learning_progress.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="text-gray-400">{item.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
