'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setMenuPermissions } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const u = data.session.user;
          setUser({
            id: u.id,
            phone: (u.user_metadata?.phone as string) || '',
            role: 'admin',
            created_at: u.created_at || new Date().toISOString(),
          });
        }
      } catch {
        // 未登录状态
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          phone: (u.user_metadata?.phone as string) || '',
          role: 'admin',
          created_at: u.created_at || new Date().toISOString(),
        });
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
