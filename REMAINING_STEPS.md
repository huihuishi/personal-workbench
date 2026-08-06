# 待办与协助清单（Handoff）

> 由 WorkBuddy 维护。代码缺陷修复已完成并通过本地测试，以下为**需要你（用户）人工介入**的事项，以及已验证/可手动验证的范围。

---

## 一、需要你协助的事（明天继续）

### 1. ✅ 部署抠图 Edge Function（cutout）【已完成】
- 函数已通过 Management API（multipart/form-data 端点）部署到项目 `ashxvhrdogkdzwrsjfci`（HomeLifeVault）
- slug: `cutout`, version: 3, status: ACTIVE, verify_jwt: false
- 调用验证通过：函数启动正常，身份校验按预期返回 401
- **待你操作**：在「衣橱」模块登录后选一张衣物照片，点抠图按钮做端到端验证

### 2. 推送 GitHub 并触发 Pages 部署【沙箱网络受限】
- 沙箱出口 DNS 把 `github.com` 解析到 `198.18.0.17`（被拦截），我无法 push。
- 请你在本地执行：
  ```bash
  git push origin main          # 或你常用的分支
  ```
- 仓库已配 GitHub Actions 静态导出到 GitHub Pages（`basePath=/personal-workbench`），push 后自动构建。

### 3. 撤销泄露的 GitHub Token【安全项】
- 当前 git remote URL 里若含有明文 token（之前配置遗留），请：
  1. 到 GitHub → Settings → Developer settings → Personal access tokens 撤销该 token；
  2. `git remote set-url origin https://github.com/<你>/personal-workbench.git` 去掉 token 后重新 push。

### 4.（可选）补充 CI 自动跑测试
- 当前 `package.json` 已有 `"test": "vitest run"`。可在 GitHub Actions 加一步 `pnpm test`，保证每次 push 跑单测。需要我加 YAML 吗？

---

## 二、本轮已修复的缺陷（非日历模块，已通过测试）

| # | 模块 | 缺陷 | 修复 |
|---|------|------|------|
| 1 | 仪表盘·今日日程 | `start_time` 用本地日期串 `YYYY-MM-DDTHH:mm` 过滤 UTC 存储的 TIMESTAMPTZ，GMT+8 下 0–8 点事件被算到前一天 | 改用 `getDayUtcRange()`（UTC 边界） |
| 2 | 日历·月视图查询 | 同上，月初本地 0–8 点事件在 UTC 落地到上月被漏查 | 改用 `getMonthUtcRange()`（前后各 padding 1 天） |
| 3 | 资金管理·CSV 导入 | 余额扣减遍历**所有行**（含缺列的 `100`），但入库只取 ≥2 列且金额合法的行 → 账目不平 | 抽出 `parseCsvExpenses`/`sumCsvAmount`，扣减金额与入库金额严格一致 |
| 4 | 仪表盘·本月收支 | 用 `toISOString().split('T')[0]`（UTC 日期）过滤，GMT+8 跨日 off-by-one | 改用 `format(new Date(),'yyyy-MM-dd')` 本地日期 |
| 5–10 | 日历·自然语言解析 | 大后天顺序、下周X跨周、点半、农历后缀、晚上/凌晨12点等 | 前期已修复并通过 42 项测试 |

> 说明：家庭共享、抠图功能按要求**未**编写测试（依赖真实 Supabase/Storage，沙箱无法独立验证）。

## 三、已审计、未发现真实缺陷的模块
- **目标(goals)**：`avgProgress`/`calcProgress` 已有除零保护；`progressColor` 仅 `>=80` 与 `>=100` 都返回绿（冗余但非 bug）。
- **资产分析(asset-analysis)**：月份过滤用 `isWithinInterval` + `parseISO`（全本地时区，内部一致）。
- **物品(items)**：过期判断 `parseISO` + `isBefore`（本地时区一致）。
- **通知(notifications)**：`typeLabels[n.type] || n.type` 有兜底。
- **笔记(notes)/学习(learning)**：无危险除零/`JSON.parse` 未捕获等模式。

## 四、测试状态
- 框架：Vitest 2 + jsdom + @testing-library/react（已装）。
- 命令：`pnpm test` → **62 项全部通过**。
- 覆盖：`calendar`(42) `auth-store`(5) `datetime`(8) `csv`(7)。
- 纯函数（日历解析、菜单权限、时区范围、CSV）已单测；组件级集成测试因依赖真实 Supabase 未做。

## 五、你可在本地手动验证的清单
1. 新建一条「明早 07:30 开会」日程 → 仪表盘「今日日程」应出现（验证 #1）。
2. 在每月 1 日凌晨建一条事件 → 日历月视图应显示（验证 #2）。
3. CSV 导入含一行 `100`（无日期列）的脏数据 → 余额不应被扣（验证 #3）。
4. 家庭共享：用邀请码加入 → 应走 `join_family` RPC（RLS 已执行）。
5. 衣橱抠图（部署后）。
