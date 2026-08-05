// ==================== 认证与用户 ====================
export interface User {
  id: string;
  phone: string;
  nickname?: string;
  avatar_url?: string;
  family_id?: string | null;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'admin' | 'member' | 'guest';

// ==================== 菜单与权限 ====================
export type MenuKey =
  | 'calendar'
  | 'finance'
  | 'learning'
  | 'notes'
  | 'goals'
  | 'items'
  | 'wardrobe'
  | 'family'
  | 'notifications'
  | 'dashboard'
  | 'asset_analysis';

export interface MenuConfig {
  key: MenuKey;
  label: string;
  icon: string;
  defaultEnabled: boolean;
}

export interface UserMenuPermission {
  user_id: string;
  menu_key: MenuKey;
  enabled: boolean;
}

// ==================== 银行卡配置 ====================
export interface BankCard {
  id: string;
  user_id: string;
  card_name: string;         // e.g. "零花钱", "小金库"
  bank_name?: string;        // 银行名称
  card_number_tail?: string; // 卡号后4位
  category: string;          // 可配置类别
  is_large_expense: boolean; // 是否大额支出
  visible_to: string[];      // 对哪些 user_id 可见
  balance: number;           // 余额
  sort_order: number;
  created_at: string;
}

export interface CardCategory {
  id: string;
  name: string;
  user_id: string; // 谁创建的类别
}

// ==================== 资金管理 ====================
export interface IncomeRecord {
  id: string;
  user_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  cycle_type: CycleType;
  created_at: string;
}

export interface IncomeAllocation {
  id: string;
  income_id: string;
  card_id: string;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  card_id: string;
  amount: number;
  category?: string;
  description?: string;
  expense_date: string;
  is_large: boolean;
  created_at: string;
}

export interface InterestRecord {
  id: string;
  user_id: string;
  card_id: string;
  amount: number;
  note?: string;
  created_at: string;
}

export type CycleType = 'monthly' | 'weekly' | 'biweekly' | 'custom';

export interface IncomeCycle {
  id: string;
  user_id: string;
  name: string;
  cycle_type: CycleType;
  days?: number; // custom 时使用
  is_default: boolean;
}

// ==================== 日程 ====================
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  is_lunar: boolean;
  repeat_yearly: boolean;
  remind_before_minutes?: number; // 提前多少分钟提醒
  created_at: string;
}

// ==================== 通知中心 ====================
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  related_id?: string; // 关联的业务ID
  created_at: string;
}

export type NotificationType =
  | 'income_reminder'
  | 'calendar_reminder'
  | 'item_expiry'
  | 'goal_deadline'
  | 'system';

// ==================== 技能学习 ====================
export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  progress: number; // 0-100
  created_at: string;
}

export interface LearningMaterial {
  id: string;
  skill_id: string;
  title: string;
  content_type: 'text' | 'url' | 'file';
  content: string;
  is_read: boolean;
  sort_order: number;
  created_at: string;
}

// ==================== 年度目标 ====================
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  year: number;
  progress: number;
  created_at: string;
}

export interface GoalTask {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

// ==================== 物品管理 ====================
export interface Item {
  id: string;
  user_id: string;
  name: string;
  category_path: string[]; // 多级分类
  storage_location: string; // 收纳位置
  quantity: number;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

// ==================== 随手记 ====================
export interface Note {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  tags: string[];
  created_at: string;
}

// ==================== 衣服搭配 ====================
export interface BodyPhoto {
  id: string;
  user_id: string;
  image_url: string;
  angle: string; // front/back/side
  created_at: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  image_url: string;      // 原图
  cutout_url?: string;     // 抠图后的纯衣服图
  category: string;        // 上衣/裤子/裙子/外套/鞋子/配饰
  color?: string;
  style?: string;
  season?: string;
  created_at: string;
}

export interface OutfitCombination {
  id: string;
  user_id: string;
  name: string;
  body_photo_id: string;
  clothing_ids: string[];
  positions: Record<string, { x: number; y: number; scale: number }>;
  created_at: string;
}

// ==================== 家庭组 ====================
export interface Family {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

// ==================== 仪表盘 ====================
export interface DashboardData {
  total_assets: number;
  monthly_income: number;
  monthly_expense: number;
  today_events: CalendarEvent[];
  learning_progress: { name: string; progress: number }[];
  pending_notifications: number;
}
