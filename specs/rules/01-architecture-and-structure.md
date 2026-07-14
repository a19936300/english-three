# 架构与目录结构

## 整体架构

```
┌─────────────────────────────────────────────────┐
│                   React 前端                      │
│  src/ — Vite + React 19 + Tailwind CSS 4        │
│  • 视图路由（无 React Router，用 view 状态切换）    │
│  • 游戏状态管理（useGameState，localStorage 持久化）│
│  • 学习数据（Supabase 优先，本地 data/ 为 fallback）│
├─────────────────────────────────────────────────┤
│               Supabase（数据层）                   │
│  • levels / words / examples / questions 四表     │
│  • 前端通过 supabase-js 匿名 key 读取             │
│  • agent 通过 service_role key 读写               │
├─────────────────────────────────────────────────┤
│           Python 自适应引擎（agent/）               │
│  • 分析用户答题记录，动态调整关卡难度                │
│  • 基于 DeerFlow 框架运行                         │
│  • 输出：难度调整 + 推荐题目子集                     │
└─────────────────────────────────────────────────┘
```

## 目录职责

### `src/` — React 前端源码

| 目录/文件 | 职责 |
|-----------|------|
| `src/App.jsx` | 主应用，管理 view 路由（home/path/lesson/result） |
| `src/components/` | UI 组件，纯展示 + 事件回调，无业务逻辑 |
| `src/hooks/` | 自定义 Hook，封装状态逻辑 |
| `src/lib/` | 外部服务封装（supabase.js） |
| `src/data/` | 学习内容数据（@deprecated，已迁移到 Supabase） |
| `src/styles/` | 全局样式 token 和组件样式 |
| `src/theme/` | 主题切换（亮色/暗色） |

### `agent/` — Python 自适应引擎

| 目录/文件 | 职责 |
|-----------|------|
| `agent_english/adapters/supabase.py` | Supabase 数据访问层 |
| `agent_english/analyzers/difficulty.py` | 题目难度评估（基于历史答题错误率） |
| `agent_english/analyzers/progress.py` | 用户进度分析（正确率、薄弱点） |
| `agent_english/strategies/content_selector.py` | 题目筛选策略（薄弱点优先 + 难度匹配） |
| `agent_english/strategies/level_adjuster.py` | 关卡难度调整决策 |
| `agent_english/config.py` | 配置加载（环境变量 + 阈值参数） |
| `agent/config.yaml` | DeerFlow 框架配置（LLM 模型、沙箱、技能） |

### `.trae/` — AI 代理规则与技能（Superpowers 体系）

| 目录 | 用途 |
|------|------|
| `.trae/rules/` | 每次对话自动注入的行为规则 |
| `.trae/skills/` | 可复用的代理工作流技能 |

### `docs/` — 项目文档与参考资料

| 目录/文件 | 用途 |
|-----------|------|
| `docs/DEVELOPMENT.md` | 项目开发文档（组件文档、数据格式、扩展指南） |
| `docs/SUPABASE_MIGRATION.md` | Supabase 迁移步骤 |
| `docs/DEPLOY.md` | 部署文档 |
| `docs/参考资料/` | PETS-3 考试大纲、词汇、真题 |

### `scripts/` — 自动化脚本

| 文件 | 用途 |
|------|------|
| `seed-supabase.mjs` | Supabase 数据初始化/更新脚本 |
| `parse_pdf_with_mineru.py` | PDF 解析工具 |
| `batch_parse_pdfs.ps1` | 批量 PDF 解析 |

## 关键设计决策

1. **无 React Router**：用 `view` 状态 + 条件渲染，避免路由库依赖，精简包体积
2. **Supabase 优先**：学习数据从 Supabase 读取，本地 `src/data/` 仅作 fallback 参考
3. **localStorage 持久化**：游戏状态（体力、经验、进度）存本地，无后端用户系统
4. **自适应引擎独立运行**：Python agent 是独立进程，通过 Supabase 与前端数据交互，不耦合