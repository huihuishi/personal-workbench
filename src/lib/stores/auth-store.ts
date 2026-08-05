'use client';

import { create } from 'zustand';
import type { User, MenuKey, UserMenuPermission } from '@/types';
import { DEFAULT_MENUS } from '@/lib/menu-config';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  menuPermissions: UserMenuPermission[];
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setMenuPermissions: (perms: UserMenuPermission[]) => void;
  hasMenuAccess: (key: MenuKey) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  menuPermissions: [],
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setMenuPermissions: (menuPermissions) => set({ menuPermissions }),
  hasMenuAccess: (key) => {
    const perms = get().menuPermissions;
    const perm = perms.find((p) => p.menu_key === key);
    if (!perm) {
      // 无显式权限记录时，回退到菜单的 defaultEnabled（默认启用的菜单即使用户无权限行也应可见）
      const menu = DEFAULT_MENUS.find((m) => m.key === key);
      return menu ? menu.defaultEnabled : false;
    }
    return perm.enabled;
  },
  logout: () => set({ user: null, menuPermissions: [] }),
}));
