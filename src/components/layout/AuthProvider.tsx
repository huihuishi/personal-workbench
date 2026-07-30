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
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

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
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
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
