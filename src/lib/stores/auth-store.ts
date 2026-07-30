'use client';

import { create } from 'zustand';
import type { User, MenuKey, UserMenuPermission } from '@/types';

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
    return perm ? perm.enabled : false;
  },
  logout: () => set({ user: null, menuPermissions: [] }),
}));
