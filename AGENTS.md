# english-three — AI 代理导航地图

> PETS-3 英语闯关学习应用（仿多邻国风格）。React 前端 + Supabase 数据层 + Python 自适应引擎。

## 快速启动

```bash
npm install && npm run dev   # 前端 → http://localhost:5180
node scripts/seed-supabase.mjs  # 初始化 Supabase 数据
```

## 规则文件（按需查阅）

本项目采用模块化规则，AI 代理应按任务类型查阅对应文件，而非一次性加载全部：

| 规则文件 | 何时查阅 |
|---------|---------|
| [specs/rules/01-architecture-and-structure.md](specs/rules/01-architecture-and-structure.md) | 需要了解项目分层、目录职责、设计决策 |
| [specs/rules/02-build-and-run.md](specs/rules/02-build-and-run.md) | 需要启动项目、运行测试、配置环境变量 |
| [specs/rules/03-data-and-configuration.md](specs/rules/03-data-and-configuration.md) | 需要了解 Supabase 表结构、数据流、localStorage 格式 |

## 技能（Skills）

本项目使用 Superpowers 技能体系（`.trae/skills/`），覆盖以下工作流：

- `brainstorming` — 新功能或改造前的需求分析与设计
- `systematic-debugging` — 系统化 Bug 排查
- `test-driven-development` — TDD 开发流程
- `subagent-driven-development` — 并行子代理开发
- `requesting-code-review` / `receiving-code-review` — 代码评审
- `verification-before-completion` — 完成前的验证
- `writing-plans` — 编写实现计划
- `executing-plans` — 执行实现计划
- `finishing-a-development-branch` — 完成开发分支
- `dispatching-parallel-agents` — 并行任务调度
- `using-git-worktrees` — Git 工作树隔离

## 行为规则（Rules）

以下规则在每次对话中自动注入（`.trae/rules/`）：

- `superpowers-bootstrap.md` — 响应前必须先检查相关技能
- `superpowers-trae-tools.md` — 技能动作到 Trae 工具的映射

## 文档

| 文档 | 用途 |
|------|------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 组件文档、数据格式、扩展指南、已知问题 |
| [docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) | Supabase 迁移步骤 |
| [docs/DEPLOY.md](docs/DEPLOY.md) | 部署指南 |
| [docs/参考资料/](docs/参考资料/) | PETS-3 考试大纲、词汇、真题 |

## 架构决策记录（ADR）

> 在此记录重要的架构决策及其背景，供后续 AI 代理理解历史上下文。

（暂无记录，待后续补充）