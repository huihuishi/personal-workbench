-- ============================================================
-- 个人工作台 - Supabase 数据库 Schema (修复版)
-- 按依赖顺序排列表
-- ============================================================

-- 1. 菜单配置表（无依赖）
CREATE TABLE IF NOT EXISTS menu_config (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. 用户表（扩展 auth.users，无外部依赖）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member', 'guest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 家庭组（依赖 users）
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 给 users 表添加 family_id 外键（现在 families 表已存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- 5. 用户菜单权限（依赖 users, menu_config）
CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL REFERENCES menu_config(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, menu_key)
);

-- 6. 银行卡类别（依赖 users）
CREATE TABLE IF NOT EXISTS card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 银行卡配置（依赖 users）
CREATE TABLE IF NOT EXISTS bank_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  bank_name TEXT,
  card_number_tail TEXT,
  category TEXT NOT NULL DEFAULT '未分类',
  is_large_expense BOOLEAN NOT NULL DEFAULT false,
  visible_to UUID[] DEFAULT '{}',
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. 入账周期（依赖 users）
CREATE TABLE IF NOT EXISTS income_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_type TEXT NOT NULL DEFAULT 'monthly' CHECK (cycle_type IN ('monthly', 'weekly', 'biweekly', 'custom')),
  days INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. 收入记录（依赖 users）
CREATE TABLE IF NOT EXISTS income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cycle_type TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. 收入分配（依赖 income_records, bank_cards）
CREATE TABLE IF NOT EXISTS income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID NOT NULL REFERENCES income_records(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES bank_cards(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL
);

-- 11. 支出记录（依赖 users, bank_cards）
CREATE TABLE IF NOT EXISTS expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES bank_cards(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_large BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. 利息记录（依赖 users, bank_cards）
CREATE TABLE IF NOT EXISTS interest_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES bank_cards(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. 日程（依赖 users）
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_lunar BOOLEAN NOT NULL DEFAULT false,
  repeat_yearly BOOLEAN NOT NULL DEFAULT false,
  remind_before_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. 通知（依赖 users）
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('income_reminder', 'calendar_reminder', 'item_expiry', 'goal_deadline', 'system')),
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. 技能（依赖 users）
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. 学习资料（依赖 skills）
CREATE TABLE IF NOT EXISTS learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'url', 'file')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. 年度目标（依赖 users）
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. 目标子任务（依赖 goals）
CREATE TABLE IF NOT EXISTS goal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 19. 物品管理（依赖 users）
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_path TEXT[] NOT NULL DEFAULT '{}',
  storage_location TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. 随手记（依赖 users）
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. 人体照片（依赖 users）
CREATE TABLE IF NOT EXISTS body_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  angle TEXT NOT NULL DEFAULT 'front' CHECK (angle IN ('front', 'back', 'side')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. 衣物（依赖 users）
CREATE TABLE IF NOT EXISTS clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cutout_url TEXT,
  category TEXT NOT NULL DEFAULT '上衣',
  color TEXT,
  style TEXT,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. 搭配组合（依赖 users, body_photos）
CREATE TABLE IF NOT EXISTS outfit_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_photo_id UUID NOT NULL REFERENCES body_photos(id) ON DELETE CASCADE,
  clothing_ids UUID[] NOT NULL DEFAULT '{}',
  positions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_menu_perms_user ON user_menu_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_cards_user ON bank_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expense_records(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_card ON expense_records(card_id);
CREATE INDEX IF NOT EXISTS idx_income_user ON income_records(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_calendar_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_skill ON learning_materials(skill_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_year ON goals(user_id, year);
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_clothing_user ON clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_body_photos_user ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_families_code ON families(invite_code);

-- ============================================================
-- 触发器：注册时自动创建 users 记录和默认权限
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'admin'
  );

  INSERT INTO user_menu_permissions (user_id, menu_key, enabled)
  SELECT NEW.id, key, default_enabled
  FROM menu_config;

  INSERT INTO income_cycles (user_id, name, cycle_type, is_default)
  VALUES (NEW.id, '每月', 'monthly', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 初始数据：菜单配置
-- ============================================================
INSERT INTO menu_config (key, label, icon, default_enabled, sort_order) VALUES
  ('dashboard', '仪表盘', 'LayoutDashboard', true, 1),
  ('calendar', '日程', 'Calendar', true, 2),
  ('finance', '资金管理', 'Wallet', true, 3),
  ('learning', '技能学习', 'GraduationCap', true, 4),
  ('notes', '随手记', 'StickyNote', true, 5),
  ('goals', '年度目标', 'Target', true, 6),
  ('items', '物品管理', 'Package', true, 7),
  ('wardrobe', '衣服搭配', 'Shirt', true, 8),
  ('notifications', '通知中心', 'Bell', true, 9),
  ('asset_analysis', '资产分析', 'PieChart', true, 10)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RLS 策略
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);

ALTER TABLE bank_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards owner access" ON bank_cards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Expenses owner access" ON expense_records FOR ALL USING (auth.uid() = user_id);

ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Income owner access" ON income_records FOR ALL USING (auth.uid() = user_id);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events owner access" ON calendar_events FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications owner access" ON notifications FOR ALL USING (auth.uid() = user_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills owner access" ON skills FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials access via skill owner" ON learning_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM skills WHERE skills.id = learning_materials.skill_id AND skills.user_id = auth.uid())
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Goals owner access" ON goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks access via goal owner" ON goal_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_tasks.goal_id AND goals.user_id = auth.uid())
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items owner access" ON items FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes owner access" ON notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Body photos owner access" ON body_photos FOR ALL USING (auth.uid() = user_id);

ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clothing owner access" ON clothing_items FOR ALL USING (auth.uid() = user_id);

ALTER TABLE outfit_combinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Outfits owner access" ON outfit_combinations FOR ALL USING (auth.uid() = user_id);

ALTER TABLE income_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cycles owner access" ON income_cycles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE income_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allocations via income owner" ON income_allocations FOR ALL USING (
  EXISTS (SELECT 1 FROM income_records WHERE income_records.id = income_allocations.income_id AND income_records.user_id = auth.uid())
);

ALTER TABLE interest_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interest owner access" ON interest_records FOR ALL USING (auth.uid() = user_id);

ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Card categories owner access" ON card_categories FOR ALL USING (auth.uid() = user_id);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family access" ON families FOR ALL USING (auth.uid() = created_by);

ALTER TABLE user_menu_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu perms owner access" ON user_menu_permissions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE menu_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu config readable by all" ON menu_config FOR SELECT USING (true);
