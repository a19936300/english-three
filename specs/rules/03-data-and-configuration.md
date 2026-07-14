# 数据与配置

## Supabase 数据模型

### 4 张核心表

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `levels` | 关卡定义 | id, section, level_no, title, description, icon, color, type, difficulty_override, question_pool |
| `words` | 单词数据 | level_id, en, cn, phonetic, example, example_cn, sort_order |
| `examples` | 语法例句 | level_id, en, cn, sort_order |
| `questions` | 题目 | level_id, question, options (jsonb), answer, explanation, sort_order, question_type |

### 2 张 Agent 扩展表（supabase_migration.sql）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `user_answers` | 用户答题记录 | user_id, question_id, level_id, section, is_correct, time_spent |
| `levels` 扩展字段 | agent 写回结果 | difficulty_override (float), question_pool (jsonb) |

## 前端数据流

```
useLevelData() Hook
    ↓ 从 Supabase 拉取 4 表数据
    ↓ 按 level_id 关联 words/examples/questions
    ↓ 按 section 分组 → { vocabulary: [], grammar: [], reading: [], exam: [] }
App.jsx
    ↓ props 传递
PathMap / VocabLesson / QuizLesson
```

## 游戏状态（localStorage）

键名：`pets3_game_state_v1`

| 字段 | 类型 | 说明 |
|------|------|------|
| `hearts` | number | 当前体力（最大5） |
| `lastHeartTime` | number | 上次扣体力时间戳，用于30分钟恢复计时 |
| `xp` | number | 总经验值 |
| `gems` | number | 宝石数 |
| `streak` | number | 连胜天数 |
| `lastStudyDate` | string | 上次学习日期 |
| `completedLevels` | object | `{ "section-id": { stars, bestScore } }` |
| `sectionProgress` | object | `{ section: unlockedLevelCount }` |
| `dailyGoal` | number | 每日目标XP（默认20） |
| `dailyXp` | number | 今日已获XP |
| `dailyXpDate` | string | 今日日期 |

## 环境变量

### 前端（`.env.local`）

| 变量 | 说明 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名 key（公开，仅限读取） |

### Python Agent（`agent/.env`）

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色 key（私密，可读写） |
| `MIMO_API_KEY` | MiMo LLM API key |

## 配置文件

| 文件 | 用途 |
|------|------|
| `.env.example` | 前端环境变量模板 |
| `agent/.env` | Python agent 环境变量（不提交） |
| `agent/config.yaml` | DeerFlow 框架配置 |
| `agent/pyproject.toml` | Python 项目依赖 |
| `vite.config.js` | Vite 构建配置（React + Tailwind 插件） |
| `.oxlintrc.json` | 前端 lint 规则 |