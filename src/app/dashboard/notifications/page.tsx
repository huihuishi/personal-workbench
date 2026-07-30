'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Bell, Check, MailOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user, filter]);

  const loadNotifications = async () => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data } = await query;
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    toast.success('已标记为已读');
  };

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('全部已读');
  };

  const typeLabels: Record<string, string> = {
    income_reminder: '💰 入账提醒',
    calendar_reminder: '📅 日程提醒',
    item_expiry: '⚠️ 物品过期',
    goal_deadline: '🎯 目标截止',
    system: '🔧 系统通知',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🔔 通知中心</h1>
        <button
          onClick={markAllRead}
          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <MailOpen size={14} />
          全部已读
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f === 'all' ? '全部' : '未读'}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl p-4 shadow-sm border transition ${
                !n.is_read ? 'border-l-4 border-l-blue-500 border-gray-100' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                      {typeLabels[n.type] || n.type}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 text-sm">{n.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(n.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
