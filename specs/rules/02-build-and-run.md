# 构建与运行

## 前端（React + Vite）

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 5180）
npm run dev
# 或指定端口
npx vite --port 5180

# 生产构建
npm run build     # 输出到 dist/

# 预览生产构建
npm run preview

# 代码检查
npm run lint      # 使用 oxlint
```

### 环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 项目信息：

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Vite 只暴露 `VITE_` 前缀的变量到客户端，其他变量仅在本地 Node.js 脚本中使用。

## Python 自适应引擎

```bash
cd agent/

# 安装依赖（使用 uv）
uv sync

# 运行测试
uv run pytest

# 运行主程序
uv run python -m agent_english
```

### 环境变量

在 `agent/.env` 中配置：

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MIMO_API_KEY=<mimo-api-key>
```

### 关键配置

- `agent/config.yaml`：DeerFlow 框架配置（LLM 模型、沙箱、技能路径）
- `agent/agent_english/config.py`：自适应引擎阈值参数
  - `DEFAULT_MIN_CORRECT_RATE = 0.6`（低于此 → 降低难度）
  - `DEFAULT_MAX_CORRECT_RATE = 0.9`（高于此 → 提升难度）
  - `DEFAULT_ADJUST_STEP = 0.1`（每次调整步长）

## Supabase 数据库

### 建表

```bash
# 在 Supabase SQL Editor 中执行 agent/supabase_migration.sql
```

### 数据初始化

```bash
# 幂等脚本，可重复执行
node scripts/seed-supabase.mjs
```

## 完整开发流程

```bash
# 1. 启动前端
npm run dev

# 2. 启动 Python agent（可选，仅需自适应功能时）
cd agent/ && uv run python -m agent_english
```