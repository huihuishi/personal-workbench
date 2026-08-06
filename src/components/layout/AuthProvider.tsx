'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

/** 查询 users 资料行，缺失时尝试用 service_key 自愈补建 */
async function ensureUserProfile(authUserId: string): Promise<User | null> {
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (profile) return profile;

  // 资料行缺失 → 自愈补建
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';
  if (!serviceKey) return null;

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
      body: JSON.stringify({ id: authUserId, phone: '', role: 'admin' }),
    });
    if (res.ok) {
      const created = await res.json();
      return Array.isArray(created) ? created[0] : created;
    }
  } catch (e) {
    console.error('AuthProvider 自愈创建用户记录失败:', e);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setMenuPermissions } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const profile = await ensureUserProfile(data.session.user.id);
          if (profile) {
            setUser(profile);

            const { data: perms } = await supabase
              .from('user_menu_permissions')
              .select('*')
              .eq('user_id', (profile as { id: string }).id);
            if (perms) setMenuPermissions(perms);
          }
        }
      } catch {
        // 未登录状态
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await ensureUserProfile(session.user.id);
        if (profile) setUser(profile);
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setMenuPermissions([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [setUser, setLoading, setMenuPermissions]);

  return <>{children}</>;
}
