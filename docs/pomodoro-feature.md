# 番茄钟功能说明（2025-11）

## 功能概述
- 计时阶段：支持专注、短休、长休三种模式，自动循环并根据设定的轮次插入长休。
- 后端同步：每次开始、结束、跳过都会写入 `pomodoro_sessions` 表，可跨端恢复未完成会话。
- 自动行为：可分别开启/关闭专注与休息阶段的自动开始，以及阶段完成提示音。
- 自定义配置：支持调节专注/休息时长、长休间隔；设置保存在本地存储，适用于个人习惯。
- 历史统计：展示今日番茄数、专注/休息时长、近 7 天趋势以及最近 20 条会话，可删除异常记录。

## Supabase 交互
- 新增 `pomodoro_sessions` 表：记录 `user_id`、阶段类型、计划时长、开始/结束时间与完成状态。
- 所有操作遵循 RLS 策略，只能访问当前用户的数据。
- 服务层函数：
  - `startPomodoroSession` / `completePomodoroSession` / `cancelPomodoroSession` / `deletePomodoroSession`
  - 查询接口 `getActivePomodoroSession`、`fetchPomodoroSessions`、`getTodayStats`

## 前端结构
- `usePomodoroSettings`：加载/持久化番茄钟配置。
- `usePomodoroTimer`：实现 TickTick 风格状态机（自动循环、暂停、跳过、恢复、提示音）。
- `usePomodoroHistory`：获取今日统计、近 7 天汇总、最近会话，支持删除记录。
- `CircularProgress` 组件：使用 `conic-gradient` 绘制进度环。
- `src/pages/Pomodoro.tsx`：全新 UI，包含计时器、统计卡片、配置面板、历史列表。

## 手动验证建议
1. **基础功能**
   - 启动专注计时，确认 Supabase 写入会话。
   - 暂停/继续后结束，检查完成状态与提示音。
   - 跳过专注、短休、长休，确认循环规则与 Supabase 记录。
2. **自动循环**
   - 开启自动开始，完成一轮后确认下一阶段自动计时。
   - 调整长休间隔，例如改为 2 轮，验证循环是否按新设定执行。
3. **刷新恢复**
   - 计时途中刷新页面，确认能恢复剩余时长并继续倒计时。
4. **统计与历史**
   - 完成数个专注后查看今日统计、7 日趋势。
   - 删除历史记录，确认 UI 与 Supabase 均移除。
5. **配置项**
   - 调整各项时长与自动开始开关，确认提示信息与下一轮设置生效。
6. **异常场景**
   - 未登录用户：确保无法开始计时，并出现登录提示。
   - 网络中断：观察失败时的 toast 提示（以 Supabase 模拟失败）。

> 若需在不同设备同步，请确保通过 Supabase CLI 或后台执行 `sql_migrations/20251108094500_create_pomodoro_sessions.sql` 创建表结构与策略。


