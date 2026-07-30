'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
    // Supabase 手机验证码登录（实际使用时需要配置短信服务商）
    // 开发阶段使用模拟验证码
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
        email: `${phone}@workbench.local`,
        password,
      });
      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          useAuthStore.getState().setUser(profile);
          const { data: perms } = await supabase
            .from('user_menu_permissions')
            .select('*')
            .eq('user_id', profile.id);
          if (perms) useAuthStore.getState().setMenuPermissions(perms);
        }
        toast.success('登录成功');
        router.push('/dashboard');
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
    if (code !== '123456' && code !== '') {
      toast.error('验证码错误（开发模式：123456）');
      return;
    }
    setSubmitting(true);
    try {
      const email = `${phone}@workbench.local`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { phone },
        },
      });
      if (error) throw error;

      if (data.user) {
        // 触发器 handle_new_user 会自动创建 users 记录和默认菜单权限
        // 不需要手动创建，否则会重复
        toast.success('注册成功，请登录');
        setMode('login');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('注册错误:', err);
      toast.error(`注册失败: ${msg}`);
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
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              注册
            </button>
          </div>

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

          {/* Verification Code (only for register) */}
          {mode === 'register' && (
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
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  mode === 'login' ? handleLogin() : handleRegister();
                }
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm"
          >
            {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>

          {/* Dev hint */}
          <p className="text-xs text-gray-400 text-center mt-4">
            开发模式：注册验证码为 123456
          </p>
        </div>
      </div>
    </div>
  );
}
