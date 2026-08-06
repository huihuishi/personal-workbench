'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * 查询 users 资料行。
 * 注意：启用 RLS(auth.uid()=id) 后，登录后紧接的查询可能因 session/JWT 尚未传播
 * 而 auth.uid() 为 null，导致 RLS 过滤成 0 行。这里先确保 session 就绪并 retry 一次。
 * 注册时 on_auth_user_created 触发器已保证 users 行存在，无需在此插入。
 */
async function ensureUserProfile(authUserId: string): Promise<User | null> {
  await supabase.auth.getSession();

  const q = () => supabase.from('users').select('*').eq('id', authUserId).single();
  let resp = await q();
  if (!resp.data) {
    await new Promise((r) => setTimeout(r, 500));
    resp = await q();
  }
  return (resp.data as User) ?? null;
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
              .eq('user_id', profile.id);
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
