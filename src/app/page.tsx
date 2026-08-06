'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }
    setSubmitting(true);
    toast.success('验证码已发送（开发模式：123456）');
    setCodeSent(true);
    setSubmitting(false);
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      toast.error('请输入手机号和密码');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${phone}@gmail.com`,
        password,
      });
      if (error) throw error;

      if (data.user) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';

        // 查询 users 资料行
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        let finalUser = profile;

        // 自愈：资料行缺失时用 service_key 补建（注册触发器可能失败）
        if (!finalUser && serviceKey) {
          try {
            const adminHeaders: Record<string, string> = {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            };
            const res = await fetch(`${supabaseUrl}/rest/v1/users`, {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify({ id: data.user.id, phone, role: 'admin' }),
            });
            if (res.ok) {
              const created = await res.json();
              finalUser = Array.isArray(created) ? created[0] : created;
            }
          } catch (e) {
            console.error('自愈创建用户记录失败:', e);
          }
        }

        if (finalUser) {
          useAuthStore.getState().setUser(finalUser);
          const { data: perms } = await supabase
            .from('user_menu_permissions')
            .select('*')
            .eq('user_id', finalUser.id);
          if (perms) useAuthStore.getState().setMenuPermissions(perms);
          toast.success('登录成功');
          router.push('/dashboard');
        } else {
          toast.error('登录失败：用户资料异常，请重新注册');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!phone || !password) {
      toast.error('请输入手机号和密码');
      return;
    }
    if (password.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('两次密码输入不一致');
      return;
    }
    if (code !== '123456' && code !== '') {
      toast.error('验证码错误（开发模式：123456）');
      return;
    }
    setSubmitting(true);
    try {
      const email = `${phone}@gmail.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { phone } },
      });

      // 处理已注册用户的情况
      if (error) {
        const msg = error.message || '';
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) {
          toast.error('该手机号已注册，请直接登录');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          return;
        }
        throw error;
      }

      if (data.user) {
        const userId = data.user.id;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';
        const adminHeaders: Record<string, string> = {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
        };

        // 1. 自动确认邮箱
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ email_confirm: true }),
          });
        } catch (e) {
          console.error('自动确认邮箱失败:', e);
        }

        // 2. 创建 users 记录（触发器可能失败，手动保底）
        try {
          await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: { ...adminHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ id: userId, phone, role: 'admin' }),
          });
        } catch (e) {
          console.error('创建用户记录失败:', e);
        }

        // 3. 创建默认菜单权限
        try {
          const menuItems = ['dashboard','calendar','finance','learning','notes','goals','items','wardrobe','notifications','asset_analysis'];
          const perms = menuItems.map(k => ({ user_id: userId, menu_key: k, enabled: true }));
          await fetch(`${supabaseUrl}/rest/v1/user_menu_permissions`, {
            method: 'POST',
            headers: { ...adminHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify(perms),
          });
        } catch (e) {
          console.error('创建菜单权限失败:', e);
        }

        toast.success('注册成功，请登录');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setCode('');
        setCodeSent(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('注册错误:', err);
      toast.error(`注册失败: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!phone) {
      toast.error('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }
    if (code !== '123456' && code !== '') {
      toast.error('验证码错误（开发模式：123456）');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('新密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('两次密码输入不一致');
      return;
    }
    setSubmitting(true);
    try {
      // 通过 Admin API 重置密码
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';

      // 先获取用户ID
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      });
      const listData = await listRes.json();
      const targetUser = listData.users?.find((u: { email: string }) => u.email === `${phone}@gmail.com`);

      if (!targetUser) {
        toast.error('该手机号未注册');
        return;
      }

      // 更新密码
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      toast.success('密码重置成功，请登录');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setCode('');
      setCodeSent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重置失败';
      toast.error(`重置失败: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  if (user) return null;

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold text-white">个人工作台</h1>
          <p className="text-blue-100 text-sm mt-1">一站式管理你的生活</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Tabs */}
          {!isForgot && (
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setMode('login'); setPassword(''); setConfirmPassword(''); setCode(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  isLogin ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => { setMode('register'); setPassword(''); setConfirmPassword(''); setCode(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  isRegister ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                注册
              </button>
            </div>
          )}
          {isForgot && (
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800">重置密码</h3>
              <p className="text-sm text-gray-500 mt-1">输入手机号和验证码重置密码</p>
            </div>
          )}

          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Verification Code (register / forgot) */}
          {(isRegister || isForgot) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="验证码"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendCode}
                  disabled={submitting || codeSent}
                  className="px-3 py-2.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {codeSent ? '已发送' : '获取验证码'}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isForgot ? '新密码' : '密码'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isForgot ? '请输入新密码' : '请输入密码'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Confirm Password (register / forgot) */}
          {(isRegister || isForgot) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Login extra: forgot password link */}
          {isLogin && (
            <div className="mb-4 text-right">
              <button
                onClick={() => { setMode('forgot'); setPassword(''); setConfirmPassword(''); setCode(''); }}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                忘记密码？
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={() => {
              if (isLogin) handleLogin();
              else if (isRegister) handleRegister();
              else handleForgotPassword();
            }}
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm"
          >
            {submitting
              ? '处理中...'
              : isLogin
              ? '登录'
              : isRegister
              ? '注册'
              : '重置密码'}
          </button>

          {/* Back to login (forgot mode) */}
          {isForgot && (
            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode('login'); setPassword(''); setConfirmPassword(''); setCode(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← 返回登录
              </button>
            </div>
          )}

          {/* Dev hint */}
          <p className="text-xs text-gray-400 text-center mt-4">
            开发模式：验证码为 123456
          </p>
        </div>
      </div>
    </div>
  );
}
