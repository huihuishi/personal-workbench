-- ============================================================
-- 家庭共享 RLS 策略 + 安全函数
-- 在 Supabase SQL Editor（https://supabase.com/dashboard）执行
-- 本脚本幂等：可重复执行（DROP POLICY IF EXISTS / CREATE OR REPLACE）
-- ============================================================

-- ----------------------------------------------------------
-- 1. users 表：SELECT —— 自己可读，同家庭成员可互读（成员列表）
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR family_id IN (
      SELECT family_id FROM users
      WHERE id = auth.uid() AND family_id IS NOT NULL
    )
  );

-- ----------------------------------------------------------
-- 2. users 表：UPDATE —— 自己可改自己；同家庭管理员可改成员
--    （家庭模块中：加入/退出=改自己；改角色/移除成员=管理员改他人）
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR (
      family_id IS NOT NULL
      AND family_id = (SELECT family_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

-- ----------------------------------------------------------
-- 3. families 表：创建者或成员可访问
--    INSERT 时 created_by = auth.uid() 通过 USING 校验
--    成员读取（加载家庭信息）通过 id IN (成员 family_id) 校验
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Family access" ON families;
CREATE POLICY "Family access" ON families
  FOR ALL USING (
    auth.uid() = created_by
    OR id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- ----------------------------------------------------------
-- 4. 安全函数：凭邀请码加入家庭
--    问题：直接 SELECT families WHERE invite_code=? 会被 RLS 过滤
--          （查询者尚未入 family，不满足 Family access 的 USING）。
--    解决：用 SECURITY DEFINER 函数绕过 RLS 完成查找+写入。
--    前端调用：supabase.rpc('join_family', { p_code: 'XXXXXX' })
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION join_family(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  SELECT id INTO v_family_id FROM families WHERE invite_code = p_code;
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;
  UPDATE users SET family_id = v_family_id, role = 'member'
   WHERE id = v_uid;
  RETURN v_family_id;
END;
$$;

-- ----------------------------------------------------------
-- 5. bank_cards：卡主完全控制 + 被授权可见的成员可读
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Cards owner access" ON bank_cards;
CREATE POLICY "Cards owner access" ON bank_cards
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cards visible to family" ON bank_cards;
CREATE POLICY "Cards visible to family" ON bank_cards
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = ANY(visible_to)
  );

-- ----------------------------------------------------------
-- 6. Storage wardrobe 桶：登录用户可上传到自己目录，公开可读
-- ----------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Wardrobe upload own folder" ON storage.objects;
CREATE POLICY "Wardrobe upload own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wardrobe'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "Wardrobe read public" ON storage.objects;
CREATE POLICY "Wardrobe read public" ON storage.objects
  FOR SELECT USING (bucket_id = 'wardrobe');
