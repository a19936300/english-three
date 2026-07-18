# 部署文档 - PETS-3 英语闯关学习网站

## 项目信息

| 项目 | 说明 |
|------|------|
| GitHub 仓库 | https://github.com/a19936300/english-three |
| Vercel 项目名 | english-three |
| 线上地址 | https://english-three-tau.vercel.app |
| Vercel 团队 | binbin's projects (Hobby) |
| 技术栈 | React 19 + Vite 8 + Tailwind CSS 4 + lucide-react |

## 本地开发

```bash
# 启动开发服务器
cd /Users/binbin/workspace/english-three
npx vite --port 5180

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 部署流程

### 自动部署（推荐）

Vercel 已绑定 GitHub 仓库，推送到 `main` 分支会自动触发部署。

```bash
# 1. 修改代码后，提交并推送
git add .
git commit -m "描述你的改动"
git push origin main

# 2. 等待 Vercel 自动构建（通常 1-2 分钟）
# 3. 访问线上地址验证
```

### 手动触发部署

如果需要重新部署而不改代码，可以在 Vercel 控制台操作：

1. 打开 https://vercel.com/binbins-projects-c2474a1c
2. 进入 english-three 项目
3. 点击 "Redeploy" 重新部署最新版本

## Vercel 构建配置

Vercel 会自动检测 Vite 项目，默认配置如下：

| 配置项 | 值 |
|--------|-----|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20.x |

## Vercel GitHub 集成

Vercel 通过 GitHub App 连接仓库，关键点：

| 项目 | 说明 |
|------|------|
| Vercel 账号 GitHub 连接 | `a19936300`（Vercel 认证设置页面） |
| Vercel GitHub App | 安装在 `a19936300` 账号，权限 "All repositories" |
| Vercel Git 设置页 | https://vercel.com/binbins-projects-c2474a1c/english-three/settings/git |

> **注意**：Vercel 创建项目时会克隆仓库到自己的命名空间。如果 GitHub App 安装在错误的账号上，
> 推送到原始仓库不会触发自动部署。确保 Vercel → Settings → Git 中显示的仓库是
> `a19936300/english-three` 而非其他克隆。

**重新连接仓库步骤**：
1. Vercel 项目 → Settings → Git → Disconnect 断开旧连接
2. 确认 Vercel 账号认证页（Account → Authentication → Sign-in Methods）GitHub 连接的是 `a19936300`
3. 如不是，Disconnect 后重新 Connect GitHub，OAuth 授权时确认账号为 `a19936300`
4. 回到项目 Git 设置，点击 "Continue with GitHub" → 选择 `english-three` → Connect

## SSH 推送说明

本机通过 SSH key 方式推送 GitHub，密钥文件为 `~/.ssh/id_ed25519`（已添加到 GitHub 账号）。

```bash
# 测试 SSH 连接
ssh -T git@github.com

# 正常推送（SSH 方式，无需代理）
git push origin main

# 如果 SSH 连接超时，可能需要走代理
git -c core.sshCommand="ssh -o ProxyCommand='nc -X connect -x 127.0.0.1:6468 %h %p'" push origin main
```

## 常见问题

**Q: 推送后 Vercel 没有自动部署？**
1. 确认 Vercel Git 设置显示的仓库是 `a19936300/english-three`（不是 `bbhhe/xxx` 等克隆）
2. 确认推送的是 `main` 分支
3. 检查 GitHub App 是否安装在正确的账号上：https://github.com/settings/installations

**Q: 构建失败？**
在 Vercel 项目页面查看 Deployments 日志，常见原因是依赖安装失败或 Node 版本不兼容。

**Q: 想绑定自定义域名？**
Vercel 项目 → Settings → Domains → 添加域名并按提示配置 DNS。

---

## Tutor API（Python agent）— Render

前端在 Vercel；**Tutor 后端**部署在 Render（Docker）。相关文件：

| 文件 | 说明 |
|------|------|
| [render.yaml](../render.yaml) | Render Blueprint |
| [agent/Dockerfile](../agent/Dockerfile) | 生产镜像 |
| [agent/docker-entrypoint.sh](../agent/docker-entrypoint.sh) | 启动时用环境变量生成 `config.yaml` |
| [agent/docker_gen_config.py](../agent/docker_gen_config.py) | 配置生成脚本 |

### 部署步骤

1. 将含上述文件的提交推送到 GitHub `main`
2. 打开 [Render Dashboard](https://dashboard.render.com/) → **New → Blueprint** → 选择 `english-three` 仓库
3. 按提示填写密钥环境变量（Blueprint 中 `sync: false` 的项）：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role（仅服务端） |
| `MODEL_API_KEY` | LLM API Key |
| `MODEL_NAME` | 模型名，如 `deepseek-v4-flash` / `gpt-4o-mini` |
| `MODEL_BASE_URL` | 兼容 OpenAI 的 base URL（可空） |

4. 等待构建完成，记下服务地址，例如 `https://english-three-tutor.onrender.com`
5. 在 **Vercel** 项目环境变量中设置并重新部署前端：

```
VITE_TUTOR_API_URL=https://english-three-tutor.onrender.com
```

6. 验证：

```bash
curl https://english-three-tutor.onrender.com/health
# {"ok":true}
```

### Free 实例注意

- 约 **15 分钟无流量会休眠**，下次请求冷启动可能需 30s–2min
- `deerflow-harness` 从 GitHub 安装，**首次构建较慢**，且依赖较重，若 Free 构建 OOM，可改为 Starter 计划
- 密钥勿写入仓库中的 `agent/config.yaml`（生产由 entrypoint 生成）

### 本地构建镜像（可选）

```bash
cd agent
docker build -t english-three-tutor .
docker run --rm -p 10000:10000 \
  -e MODEL_API_KEY=xxx \
  -e MODEL_NAME=gpt-4o-mini \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=xxx \
  -e TUTOR_SESSION_BACKEND=memory \
  english-three-tutor
```


