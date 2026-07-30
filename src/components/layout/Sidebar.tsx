'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DEFAULT_MENUS, MENU_ICON_MAP, MENU_ROUTES } from '@/lib/menu-config';
import { Menu, X, LogOut, ChevronLeft } from 'lucide-react';
import type { MenuKey } from '@/types';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, hasMenuAccess, logout } = useAuthStore();

  const visibleMenus = DEFAULT_MENUS.filter((m) => hasMenuAccess(m.key as MenuKey));

  const handleNavigate = (key: MenuKey) => {
    router.push(MENU_ROUTES[key]);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setIsOpen(true)} className="p-1">
          <Menu size={22} />
        </button>
        <span className="font-semibold text-sm">个人工作台</span>
        <div className="w-6" />
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">🚀 个人工作台</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user?.nickname || user?.phone}</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1">
            <X size={18} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {visibleMenus.map((menu) => {
            const isActive = pathname === MENU_ROUTES[menu.key] ||
              (menu.key !== 'dashboard' && pathname.startsWith(MENU_ROUTES[menu.key]));
            return (
              <button
                key={menu.key}
                onClick={() => handleNavigate(menu.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{MENU_ICON_MAP[menu.icon] || '📌'}</span>
                <span>{menu.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
          >
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>
    </>
  );
}
