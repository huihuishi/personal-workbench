'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import type { User, Family, BankCard } from '@/types';
import {
  Users, Plus, X, Copy, Check, Crown, User as UserIcon, LogOut,
  Eye, EyeOff, Shield, Trash2,
} from 'lucide-react';

// 生成邀请码
const genInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  member: '成员',
  guest: '访客',
};

export default function FamilyPage() {
  const { user, setUser } = useAuthStore();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建/加入表单
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 如果已加入家庭，加载家庭信息
      if (user.family_id) {
        const { data: fam } = await supabase
          .from('families')
          .select('*')
          .eq('id', user.family_id)
          .maybeSingle();
        setFamily(fam);

        if (fam) {
          // 加载家庭成员（需要 RLS 放开：同 family 可互读）
          const { data: mem } = await supabase
            .from('users')
            .select('*')
            .eq('family_id', fam.id)
            .order('created_at');
          setMembers(mem || []);

          // 加载我的银行卡（用于设置可见性）
          const { data: myCards } = await supabase
            .from('bank_cards')
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order');
          setCards(myCards || []);
        }
      } else {
        setFamily(null);
        setMembers([]);
        setCards([]);
      }
    } catch (e) {
      console.error('加载家庭数据失败:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // 创建家庭
  const handleCreateFamily = async () => {
    if (!user) return;
    if (!familyName.trim()) { toast.error('请输入家庭名称'); return; }
    try {
      const code = genInviteCode();
      const { data: fam, error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          created_by: user.id,
          invite_code: code,
        })
        .select()
        .single();
      if (error) throw error;

      // 更新自己的 family_id 和角色
      const { error: userErr } = await supabase
        .from('users')
        .update({ family_id: fam.id, role: 'admin' })
        .eq('id', user.id);
      if (userErr) throw userErr;

      // 更新本地 store
      setUser({ ...user, family_id: fam.id, role: 'admin' });
      toast.success('家庭创建成功');
      setShowCreate(false);
      setFamilyName('');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  // 加入家庭
  const handleJoinFamily = async () => {
    if (!user) return;
    if (!inviteCode.trim()) { toast.error('请输入邀请码'); return; }
    try {
      // 凭邀请码加入（安全函数 join_family 绕过 RLS 完成查找+写入）
      const { data: famId, error } = await supabase.rpc('join_family', {
        p_code: inviteCode.trim().toUpperCase(),
      });
      if (error) throw error;
      if (!famId) { toast.error('邀请码无效'); return; }

      const { data: fam } = await supabase
        .from('families')
        .select('name')
        .eq('id', famId)
        .maybeSingle();

      setUser({ ...user, family_id: famId, role: 'member' });
      toast.success(`已加入「${fam?.name ?? '家庭'}」`);
      setShowJoin(false);
      setInviteCode('');
      loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加入失败';
      toast.error(msg.includes('INVALID_INVITE_CODE') ? '邀请码无效' : msg);
    }
  };

  // 退出家庭
  const handleLeaveFamily = async () => {
    if (!user || !confirm('确定退出家庭？你的数据将保留但不再共享。')) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null, role: 'admin' })
        .eq('id', user.id);
      if (error) throw error;
      setUser({ ...user, family_id: null, role: 'admin' });
      toast.success('已退出家庭');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '退出失败');
    }
  };

  // 修改成员角色
  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', memberId);
      if (error) throw error;
      toast.success('角色已更新');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('确定移除该成员？')) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null, role: 'admin' })
        .eq('id', memberId);
      if (error) throw error;
      toast.success('已移除成员');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移除失败');
    }
  };

  // 复制邀请码
  const handleCopyCode = () => {
    if (!family) return;
    navigator.clipboard.writeText(family.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('邀请码已复制');
    });
  };

  // 设置银行卡可见性
  const handleToggleCardVisibility = async (cardId: string, memberId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const visibleTo = card.visible_to || [];
    const newVisible = visibleTo.includes(memberId)
      ? visibleTo.filter(id => id !== memberId)
      : [...visibleTo, memberId];
    try {
      const { error } = await supabase
        .from('bank_cards')
        .update({ visible_to: newVisible })
        .eq('id', cardId);
      if (error) throw error;
      setCards(cards.map(c => c.id === cardId ? { ...c, visible_to: newVisible } : c));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '设置失败');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  // ===== 未加入家庭 =====
  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} /> 家庭共享
        </h1>
        <p className="text-sm text-gray-500">
          创建或加入一个家庭，与家人共享部分数据（如银行卡余额）。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 创建家庭 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Plus size={18} className="text-blue-500" />
              </div>
              <h3 className="font-semibold text-sm">创建家庭</h3>
            </div>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                创建新家庭
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="家庭名称（如：幸福之家）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleCreateFamily}
                  className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  确认创建
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full py-1.5 text-xs text-gray-400"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {/* 加入家庭 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserIcon size={18} className="text-green-500" />
              </div>
              <h3 className="font-semibold text-sm">加入家庭</h3>
            </div>
            {!showJoin ? (
              <button
                onClick={() => setShowJoin(true)}
                className="w-full py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
              >
                输入邀请码
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="6位邀请码"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm tracking-widest text-center font-mono"
                />
                <button
                  onClick={handleJoinFamily}
                  className="w-full py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  加入
                </button>
                <button
                  onClick={() => setShowJoin(false)}
                  className="w-full py-1.5 text-xs text-gray-400"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== 已加入家庭 =====
  const otherMembers = members.filter(m => m.id !== user?.id);

  return (
    <div className="space-y-4">
      {/* 家庭信息头部 */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users size={20} /> {family.name}
            </h1>
            <p className="text-xs opacity-80 mt-1">
              {members.length} 位成员 · 你的角色：{ROLE_LABELS[user?.role || 'member']}
            </p>
          </div>
          <button
            onClick={handleLeaveFamily}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30"
          >
            <LogOut size={14} /> 退出
          </button>
        </div>
        {/* 邀请码 */}
        <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
          <span className="text-xs opacity-80">邀请码</span>
          <span className="font-mono font-bold tracking-widest text-lg">{family.invite_code}</span>
          <button onClick={handleCopyCode} className="ml-auto p-1 hover:bg-white/20 rounded">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <Shield size={16} className="text-blue-500" /> 家庭成员
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                  {(m.nickname || m.phone || '?').slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    {m.nickname || m.phone}
                    {m.id === family.created_by && <Crown size={12} className="text-yellow-500" />}
                    {m.id === user?.id && <span className="text-xs text-gray-400">(我)</span>}
                  </div>
                  <div className="text-xs text-gray-400">{ROLE_LABELS[m.role] || m.role}</div>
                </div>
              </div>
              {isAdmin && m.id !== user?.id && (
                <div className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="member">成员</option>
                    <option value="guest">访客</option>
                    <option value="admin">管理员</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {otherMembers.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            还没有其他成员，把邀请码发给家人吧
          </p>
        )}
      </div>

      {/* 银行卡可见性 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-sm text-gray-700 mb-1 flex items-center gap-2">
          <Eye size={16} className="text-blue-500" /> 银行卡共享设置
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          选择哪些家庭成员可以看到你的银行卡及余额
        </p>
        {cards.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            你还没有银行卡，去「资金管理」添加吧
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="border border-gray-100 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-800 mb-2">
                  {card.card_name}
                  <span className="text-xs text-gray-400 ml-2">¥{Number(card.balance).toFixed(2)}</span>
                </div>
                {otherMembers.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无其他成员可共享</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {otherMembers.map((m) => {
                      const visible = (card.visible_to || []).includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleToggleCardVisibility(card.id, m.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition ${
                            visible
                              ? 'bg-blue-50 border-blue-300 text-blue-600'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
                          {visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          {m.nickname || m.phone}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
