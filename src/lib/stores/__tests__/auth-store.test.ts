import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { UserMenuPermission } from '@/types';

const reset = () => {
  useAuthStore.getState().setMenuPermissions([]);
  useAuthStore.getState().setUser(null);
};

describe('auth-store.hasMenuAccess', () => {
  beforeEach(reset);

  it('无任何权限记录时，默认启用菜单应可见', () => {
    // 关键缺陷：旧实现在无权限行时返回 false，会导致所有菜单消失
    expect(useAuthStore.getState().hasMenuAccess('calendar')).toBe(true);
    expect(useAuthStore.getState().hasMenuAccess('finance')).toBe(true);
    expect(useAuthStore.getState().hasMenuAccess('dashboard')).toBe(true);
  });

  it('权限记录显式禁用时不可见', () => {
    const perms: UserMenuPermission[] = [
      { user_id: 'u1', menu_key: 'calendar', enabled: false },
    ];
    useAuthStore.getState().setMenuPermissions(perms);
    expect(useAuthStore.getState().hasMenuAccess('calendar')).toBe(false);
  });

  it('权限记录显式启用时可见', () => {
    const perms: UserMenuPermission[] = [
      { user_id: 'u1', menu_key: 'calendar', enabled: true },
    ];
    useAuthStore.getState().setMenuPermissions(perms);
    expect(useAuthStore.getState().hasMenuAccess('calendar')).toBe(true);
  });

  it('其他菜单在无对应记录时仍按 defaultEnabled 判定', () => {
    const perms: UserMenuPermission[] = [
      { user_id: 'u1', menu_key: 'calendar', enabled: false },
    ];
    useAuthStore.getState().setMenuPermissions(perms);
    // finance 无记录但 defaultEnabled -> 可见
    expect(useAuthStore.getState().hasMenuAccess('finance')).toBe(true);
  });

  it('logout 清空权限', () => {
    const perms: UserMenuPermission[] = [
      { user_id: 'u1', menu_key: 'calendar', enabled: true },
    ];
    useAuthStore.getState().setMenuPermissions(perms);
    useAuthStore.getState().logout();
    // 退出后无记录，默认菜单仍应可见
    expect(useAuthStore.getState().hasMenuAccess('calendar')).toBe(true);
  });
});
