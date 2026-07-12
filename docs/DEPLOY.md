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

## SSH 推送说明

本机通过 SSH key 方式推送 GitHub，密钥文件为 `~/.ssh/id_ed25519`。如遇推送失败：

```bash
# 测试 SSH 连接
ssh -T git@github.com

# 如果连接超时，可能需要走代理
git -c core.sshCommand="ssh -o ProxyCommand='nc -X connect -x 127.0.0.1:6468 %h %p'" push origin main
```

## 常见问题

**Q: 推送后 Vercel 没有自动部署？**
检查 Vercel 项目的 GitHub 集成是否正常，确认推送的是 `main` 分支。

**Q: 构建失败？**
在 Vercel 项目页面查看 Deployments 日志，常见原因是依赖安装失败或 Node 版本不兼容。

**Q: 想绑定自定义域名？**
Vercel 项目 → Settings → Domains → 添加域名并按提示配置 DNS。

