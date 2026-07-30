import type { MenuConfig, MenuKey } from '@/types';

export const DEFAULT_MENUS: MenuConfig[] = [
  { key: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard', defaultEnabled: true },
  { key: 'calendar', label: '日程', icon: 'Calendar', defaultEnabled: true },
  { key: 'finance', label: '资金管理', icon: 'Wallet', defaultEnabled: true },
  { key: 'learning', label: '技能学习', icon: 'GraduationCap', defaultEnabled: true },
  { key: 'notes', label: '随手记', icon: 'StickyNote', defaultEnabled: true },
  { key: 'goals', label: '年度目标', icon: 'Target', defaultEnabled: true },
  { key: 'items', label: '物品管理', icon: 'Package', defaultEnabled: true },
  { key: 'wardrobe', label: '衣服搭配', icon: 'Shirt', defaultEnabled: true },
  { key: 'notifications', label: '通知中心', icon: 'Bell', defaultEnabled: true },
  { key: 'asset_analysis', label: '资产分析', icon: 'PieChart', defaultEnabled: true },
];

export const MENU_ICON_MAP: Record<string, string> = {
  LayoutDashboard: '📊',
  Calendar: '📅',
  Wallet: '💰',
  GraduationCap: '📚',
  StickyNote: '📝',
  Target: '🎯',
  Package: '📦',
  Shirt: '👗',
  Bell: '🔔',
  PieChart: '📈',
};

export const MENU_ROUTES: Record<MenuKey, string> = {
  dashboard: '/dashboard',
  calendar: '/dashboard/calendar',
  finance: '/dashboard/finance',
  learning: '/dashboard/learning',
  notes: '/dashboard/notes',
  goals: '/dashboard/goals',
  items: '/dashboard/items',
  wardrobe: '/dashboard/wardrobe',
  notifications: '/dashboard/notifications',
  asset_analysis: '/dashboard/asset-analysis',
};
