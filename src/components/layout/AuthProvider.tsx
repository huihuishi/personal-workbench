'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * 用 service_role key 查用户资料，绕过 RLS。
 * 启用 RLS(auth.uid()=id) 后，客户端 anon key 查询在 session 未就绪时会被
 * auth.uid()=null 过滤成空结果。service_key 无此限制（注册流程已验证可用）。
 */
async function fetchProfileBypassRLS(authUserId: string): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';
  if (!serviceKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${authUserId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
    });
    if (res.ok) {
      const rows = await res.json();
      return (Array.isArray(rows) && rows.length > 0 ? rows[0] : null) as User | null;
    }
  } catch (e) {
    console.error('AuthProvider fetchProfile 失败:', e);
  }
  return null;
}

async function fetchPermsBypassRLS(userId: string): Promise<import('@/types').UserMenuPermission[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';
  if (!serviceKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_menu_permissions?user_id=eq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setMenuPermissions } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const profile = await fetchProfileBypassRLS(data.session.user.id);
          if (profile) {
            setUser(profile);
            const perms = await fetchPermsBypassRLS(profile.id);
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
        const profile = await fetchProfileBypassRLS(session.user.id);
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
