# 个人工作台 - 协作开发文档

## 项目简介

个人工作台是一个一站式生活管理 Web 应用，支持移动端和桌面端访问。包含日程日历、资金管理、技能学习、随手记、年度目标、物品管理、资产分析、衣服搭配等模块。

**线上地址**：https://huihuishi.github.io/personal-workbench/

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router) | 16.2.12 |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | 4.x |
| 状态管理 | Zustand | 5.x |
| 数据库 + 认证 | Supabase (PostgreSQL) | - |
| 图表 | Recharts | 3.x |
| 日期处理 | date-fns | 4.x |
| 农历计算 | lunar-typescript | 1.8.x |
| 图标 | lucide-react | 1.x |
| 提示 | react-hot-toast | 2.x |
| 包管理 | pnpm | 10.x |
| 部署 | GitHub Pages (静态导出) | - |
| CI/CD | GitHub Actions | - |

---

## 项目结构

```
personal-workbench/
├── src/
│   ├── app/                          # Next.js App Router 页面
│   │   ├── page.tsx                  # 登录/注册/忘记密码页
│   │   ├── layout.tsx                # 根布局（AuthProvider + Toaster）
│   │   └── dashboard/
│   │       ├── layout.tsx            # Dashboard 布局（侧边栏 + 鉴权）
│   │       ├── page.tsx              # 仪表盘（概览）
│   │       ├── calendar/page.tsx     # 日程日历模块
│   │       ├── finance/page.tsx      # 资金管理模块
│   │       ├── learning/page.tsx     # 技能学习模块
│   │       ├── notes/page.tsx        # 随手记模块
│   │       ├── goals/page.tsx        # 年度目标模块
│   │       ├── items/page.tsx        # 物品管理模块
│   │       ├── asset-analysis/page.tsx # 资产分析模块
│   │       ├── notifications/page.tsx  # 通知中心
│   │       └── wardrobe/page.tsx     # 衣服搭配（占位，未开发）
│   ├── components/
│   │   └── layout/
│   │       ├── AuthProvider.tsx       # 认证状态管理
│   │       └── Sidebar.tsx           # 侧边栏导航
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 客户端初始化
│   │   ├── menu-config.ts            # 菜单配置
│   │   ├── stores/
│   │   │   └── auth-store.ts         # Zustand 认证状态
│   │   └── calendar/
│   │       └── utils.ts              # 日历工具（农历、自然语言解析）
│   └── types/
│       └── index.ts                  # 所有 TypeScript 类型定义
├── supabase-schema-fixed.sql         # 完整数据库 Schema（22张表 + RLS + 触发器）
├── fix-trigger.sql                   # 触发器修复脚本
├── .github/workflows/deploy.yml      # GitHub Actions 自动部署
├── .env.local                        # 环境变量（不提交）
├── next.config.ts                    # Next.js 配置（静态导出 + basePath）
└── package.json
```

---

## 快速开始

### 1. 克隆代码

```bash
git clone https://github.com/huihuishi/personal-workbench.git
cd personal-workbench
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase 配置（向管理员索取）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=your-service-key
```

> **注意**：`NEXT_PUBLIC_SUPABASE_SERVICE_KEY` 是 service_role 密钥，用于注册时自动确认邮箱和创建用户记录。在纯静态部署中无法隐藏，后续迁移到前后端架构时应移到后端。

### 4. 本地开发

```bash
pnpm dev
```

打开 http://localhost:3000 即可。注意本地开发时 basePath 不生效，但部署到 GitHub Pages 时需要。

### 5. 构建测试

```bash
pnpm build
```

构建产物在 `out/` 目录，为纯静态 HTML/JS/CSS。

---

## 数据库结构

数据库使用 Supabase（PostgreSQL），共 22 张表。完整 Schema 见 `supabase-schema-fixed.sql`。

### 核心表概览

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户扩展表 | id(关联auth.users), phone, role, family_id |
| `menu_config` | 菜单配置 | key, label, icon, default_enabled |
| `user_menu_permissions` | 用户菜单权限 | user_id, menu_key, enabled |
| `bank_cards` | 银行卡 | card_name, bank_name, balance, category, is_large_expense |
| `income_records` | 收入记录 | amount, period_start, period_end, cycle_type |
| `income_allocations` | 收入分配 | income_id, card_id, amount |
| `expense_records` | 支出记录 | card_id, amount, category, expense_date, is_large |
| `interest_records` | 利息记录 | card_id, amount, note |
| `income_cycles` | 入账周期 | name, cycle_type, is_default |
| `calendar_events` | 日程事件 | title, start_time, is_lunar, repeat_yearly, remind_before_minutes |
| `notifications` | 通知 | type, title, is_read, related_id |
| `skills` | 技能 | name, progress(0-100) |
| `learning_materials` | 学习资料 | skill_id, title, content_type, is_read |
| `goals` | 年度目标 | title, year, progress |
| `goal_tasks` | 目标子任务 | goal_id, title, is_completed |
| `items` | 物品 | name, category_path[], storage_location, expiry_date |
| `notes` | 随手记 | title, content, tags[] |
| `families` | 家庭组 | name, created_by, invite_code |
| `body_photos` | 人体照片 | image_url, angle(front/back/side) |
| `clothing_items` | 衣物 | name, image_url, cutout_url, category, color, season |
| `outfit_combinations` | 搭配组合 | body_photo_id, clothing_ids[], positions(JSONB) |
| `card_categories` | 银行卡自定义分类 | name, user_id |

### RLS 策略

所有表都开启了 Row Level Security，策略为 **用户只能访问自己的数据**（`auth.uid() = user_id`）。`menu_config` 表对所有登录用户可读。

### 触发器

`handle_new_user()` 函数在用户注册时自动执行：
1. 在 `users` 表插入记录
2. 在 `user_menu_permissions` 表插入全部 10 个菜单的默认权限
3. 在 `income_cycles` 表插入默认"每月"周期

> **注意**：当前触发器可能执行失败（ON CONFLICT 问题已修复但需在 Supabase SQL Editor 重新执行 `fix-trigger.sql`）。前端注册逻辑已有保底：注册后手动调用 Admin API 创建 users 记录和菜单权限。

---

## 认证机制

### 注册流程

```
用户输入手机号 + 密码 + 验证码
  ↓
前端调用 supabase.auth.signUp({ email: "${phone}@gmail.com", password })
  ↓
Supabase 创建 auth.users 记录 → 触发器 handle_new_user() 创建 users + 权限
  ↓
前端用 service_role key 调用 Admin API:
  1. 确认邮箱 (PUT /auth/v1/admin/users/{id} body: { email_confirm: true })
  2. 创建 users 记录（保底，防触发器失败）
  3. 创建 10 条菜单权限（保底）
  ↓
提示"注册成功，请登录"，清空密码，切换到登录页
```

### 登录流程

```
用户输入手机号 + 密码
  ↓
supabase.auth.signInWithPassword({ email: "${phone}@gmail.com", password })
  ↓
获取 session → 查询 users 表获取用户资料 → 查询 user_menu_permissions 获取菜单权限
  ↓
存入 Zustand store → 跳转 /dashboard
```

### 退出登录

```
supabase.auth.signOut() → 清空 Zustand store → router.push('/') → router.refresh()
```

### 忘记密码

通过 Admin API 查找用户 → 用 Admin API 重置密码（开发阶段验证码固定为 123456）

---

## 部署流程

### 自动部署（GitHub Actions）

推送到 `main` 分支 → GitHub Actions 自动执行：
1. `pnpm install --frozen-lockfile`
2. `pnpm build`（注入环境变量）
3. 上传 `out/` 目录到 GitHub Pages

部署完成后访问 https://huihuishi.github.io/personal-workbench/

### GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions 中配置：

| Secret 名 | 说明 |
|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公钥（anon/publishable） |
| `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` | Supabase 私钥（service_role/secret） |

---

## 已完成模块

| 模块 | 状态 | 主要功能 |
|------|------|----------|
| 登录注册 | ✅ | 手机号+密码注册/登录，忘记密码，自动确认邮箱 |
| 仪表盘 | ✅ | 总资产/月收支概览，今日日程，学习进度 |
| 日程日历 | ✅ | 月视图+农历，自然语言创建，每年重复，提醒 |
| 资金管理 | ✅ | 银行卡CRUD，收支记录，收入分配，CSV导入 |
| 技能学习 | ✅ | 技能CRUD+进度条，学习资料管理，已读标记 |
| 随手记 | ✅ | 笔记CRUD，标签管理，搜索 |
| 年度目标 | ✅ | 目标CRUD，子任务，自动进度计算，年份筛选 |
| 物品管理 | ✅ | 物品CRUD，多级分类树，位置筛选，过期提醒 |
| 资产分析 | ✅ | 余额饼图，收支趋势，支出分类，大额支出 |
| 通知中心 | ✅ | 通知列表，已读/未读，全部已读 |

## 待开发模块

| 模块 | 优先级 | 说明 |
|------|--------|------|
| 衣服搭配 | P1 | 人体照片+衣物图层叠加，搭配保存 |
| 家庭共享 | P1 | 创建家庭组，邀请码加入，角色权限，银行卡可见性 |
| 提醒推送 | P2 | 日程提醒、物品过期、目标截止推送通知 |
| AI 集成 | P2 | 智能分析支出、学习资料推荐、日程智能建议 |

---

## 已知问题

| 问题 | 说明 | 解决方案 |
|------|------|----------|
| service_role key 暴露在前端 | 纯静态部署无法隐藏 | 迁移到前后端架构时移到后端 |
| 仪表盘"本月收入"始终为 0 | Dashboard 没有查询 income_records | 需要补充收入查询逻辑 |
| 触发器可能未正确执行 | fix-trigger.sql 需在 Supabase 执行 | 前端有保底逻辑，不阻塞使用 |
| GitHub Pages 访问慢 | 国内访问 GitHub 较慢 | 可考虑 CDN 加速或国内部署 |
| 无真实短信验证码 | 开发模式验证码固定 123456 | 需配置短信服务商 |

---

## 协作指南

### 分支管理

```bash
# 1. 从 main 拉取最新代码
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/your-feature-name

# 3. 开发完成后推送
git push origin feature/your-feature-name

# 4. 在 GitHub 上创建 Pull Request，合并到 main
# 合并后 GitHub Actions 自动部署
```

### 分支命名规范

- `feature/xxx` — 新功能
- `fix/xxx` — 修复 bug
- `refactor/xxx` — 重构
- `docs/xxx` — 文档更新

### 代码规范

1. **所有页面**必须以 `'use client'` 开头（静态导出要求）
2. **Supabase 调用**统一用 `import { supabase } from '@/lib/supabase'`
3. **状态管理**用 Zustand store，不要用 React Context 传数据库数据
4. **类型**定义统一放在 `src/types/index.ts`
5. **错误处理**用 `try/catch` + `toast.error()`
6. **移动端优先**：所有弹窗用 `fixed inset-0 z-50` + `max-w-sm`/`max-w-md`
7. **样式**：白色卡片 `bg-white rounded-xl shadow-sm border border-gray-200`，主色 `blue-500`

### 新增模块步骤

1. 在 `src/types/index.ts` 添加类型定义
2. 在 `supabase-schema-fixed.sql` 添加表定义 + RLS 策略
3. 在 Supabase SQL Editor 执行新表的 SQL
4. 在 `src/lib/menu-config.ts` 添加菜单项（如需要）
5. 创建 `src/app/dashboard/your-module/page.tsx`
6. 本地 `pnpm dev` 测试
7. `pnpm build` 确认构建通过
8. 提交 PR

### 环境要求

- Node.js 22+
- pnpm 10+
- VSCode（推荐安装 ESLint + Tailwind CSS IntelliSense + TypeScript 插件）

---

## Supabase 控制台

- **项目 URL**：https://ashxvhrdogkdzwrsjfci.supabase.co
- **控制台**：https://supabase.com/dashboard/project/ashxvhrdogkdzwrsjfci
- **SQL Editor**：在控制台左侧菜单 → SQL Editor
- **认证设置**：控制台 → Authentication → Providers → Email
- **数据库表**：控制台 → Table Editor

---

## 关键配置文件说明

### next.config.ts

```ts
const nextConfig: NextConfig = {
  output: 'export',           // 静态导出
  images: { unoptimized: true }, // 不优化图片（静态部署要求）
  trailingSlash: true,        // URL 末尾加斜杠
  assetPrefix: '/personal-workbench', // 静态资源前缀
  basePath: '/personal-workbench',    // 基础路径（GitHub Pages 子路径）
};
```

> 如果改为独立域名部署，删除 `assetPrefix` 和 `basePath`。

### .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://ashxvhrdogkdzwrsjfci.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=sb_secret_xxx
```

> `NEXT_PUBLIC_` 前缀的变量会被打包到前端代码中，所有客户端可见。

---

## FAQ

**Q: 为什么用 `${phone}@gmail.com` 作为邮箱？**
A: Supabase Auth 不支持纯手机号注册（需配置短信服务商），所以用手机号拼成邮箱格式作为唯一标识。用户不需要真的拥有这个 Gmail。

**Q: 为什么注册后不需要邮箱确认？**
A: 前端注册后自动调用 Admin API 确认邮箱，绕过了邮箱验证流程。

**Q: 为什么没有真实短信验证码？**
A: 短信服务商需要付费配置。开发阶段验证码固定为 `123456`，后续接入阿里云/腾讯云短信即可。

**Q: 数据安全吗？**
A: Supabase 数据库启用 RLS，每个用户只能访问自己的数据。但 service_role key 暴露在前端，理论上可被恶意利用。后续迁移到前后端架构可解决。

**Q: 可以在国内部署吗？**
A: 可以。Supabase 有自建方案（self-hosted），也可迁移到国内云数据库 + 自己的后端。GitHub Pages 国内访问偏慢，可用 Gitee Pages 或 CDN 加速。

---

## 联系方式

- GitHub 仓库：https://github.com/huihuishi/personal-workbench
- 问题反馈：在 GitHub 仓库提 Issue
