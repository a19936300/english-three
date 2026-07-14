---
name: mineru-pdf-parser
description: 使用 MinerU（mineru.net）API 把本地 PDF 解析为 Markdown。当用户需要把 PDF/Word/PPT/Excel/图片 转 Markdown，或提到 MinerU、智能解析、文档抽取、PDF 转 Markdown 时使用。
---

# MinerU PDF 解析

## 何时使用

- 用户给出本地 PDF（或其他支持格式）路径，要求"解析"、"转 Markdown"、"提取文字/表格/公式"
- 用户提到 "MinerU"、"mineru.net"、"智能解析"、"文档解析 API"
- 批量处理目录下的 PDF

## 何时不要用

- 文件 > 10MB 或 > 20 页 → 改用 `mineru-pdf-parser-precision`（精准 API，需 Token）
- 用户只想纯文本、不需要结构 → 用本地 `pdfminer.six` 即可
- 用户没要求抽取，只是要预览/打印

## 前置条件

- Python ≥ 3.10
- `pip install mineru-open-sdk`
- 联网可达 `mineru.net`（如需代理，命令行加 `--proxy http://127.0.0.1:7890` 或设置 `MINERU_PROXY`）

## 限制（Flash / 轻量 API）

| 维度 | 限制 |
|---|---|
| 文件大小 | ≤ 10MB |
| 页数 | ≤ 20 页 |
| 鉴权 | 无（IP 限频） |
| 输出 | 仅 Markdown（CDN 链接形式） |
| 支持格式 | PDF、图片、Docx、PPTx、Excel |

## 流程

1. **检查文件** — 确认存在、后缀支持、大小 ≤ 10MB。脚本会自动校验并报错。
2. **运行脚本** — `python scripts/parse_pdf_with_mineru.py <pdf> [选项]`
3. **获取结果** — 同目录生成同名 `.md` 文件。

## API 自动选择策略

| 条件 | 调用 |
|---|---|
| 默认（项目已配 `MINERU_TOKEN`） | **Precision（精准）API** — 自动从 `.env.local` 读 token |
| 文件 ≤ 10MB 且 ≤ 20 页，且无 token | **Flash（轻量）API** — 无需 Token，IP 限频 |
| 文件 > 10MB 或 > 20 页，且无 token | 报错，提示加 `MINERU_TOKEN` |
| 显式 `--flash` | 强制走轻量 API（覆盖 token 决策） |

脚本启动时会自动从 `.env.local` / `.env` 加载 `MINERU_TOKEN`，无需手动 export。`.env.local` 已在 `.gitignore`（`*.local` 规则）中，token 不会进 git。

## 标准调用

```bash
# 默认（项目已配 MINERU_TOKEN → 走精准 API）
python scripts/parse_pdf_with_mineru.py "path/to/file.pdf"

# 强制走轻量（覆盖 token 决策）
python scripts/parse_pdf_with_mineru.py "small.pdf" --flash

# 手动覆盖 token（不用 .env.local 时）
python scripts/parse_pdf_with_mineru.py "big.pdf" --token "your-token"

# 指定模型（精准 API）
python scripts/parse_pdf_with_mineru.py "file.pdf" --model vlm

# 多种输出格式（仅精准 API）
python scripts/parse_pdf_with_mineru.py "file.pdf" --extra-formats docx html
```

## 批量解析目录下所有 PDF

PowerShell：

```powershell
Get-ChildItem "docs\参考资料" -Recurse -Filter *.pdf | ForEach-Object {
    python scripts/parse_pdf_with_mineru.py $_.FullName
}
```

Bash：

```bash
find docs -name "*.pdf" -exec python scripts/parse_pdf_with_mineru.py {} \;
```

## 参数说明

| 参数 | 默认 | 说明 |
|---|---|---|
| `pdf_path` | 必填 | 文件路径（PDF/图片/Office） |
| `--language` | `ch` | 文档语言（ch/en/korean/...） |
| `--proxy` | `http://127.0.0.1:7890` | 代理地址，设为空字符串 `""` 可关闭 |
| `--is-ocr` | 关 | 扫描件需开启 |
| `--no-formula` | 公式识别开 | 关闭以加速 |
| `--no-table` | 表格识别开 | 关闭以加速 |
| `--pages` | 全部 | 页码范围，如 `"1,3-5"` |
| `--token` | `.env.local` 读 | 覆盖 token 决策；不传时脚本自动从 `.env.local` 加载 |
| `--flash` | 关 | 强制走轻量 API（覆盖 token 决策） |
| `--model` | `vlm` | 精准 API 模型：`vlm` / `pipeline` / `MinerU-HTML` |
| `--extra-formats` | 无 | 精准 API 额外导出 `docx` / `html` / `latex` |
| `--no-cache` | 关 | 精准 API 绕过 URL 缓存 |
| `--retry` | `2` | 失败重试次数 |
| `--retry-delay` | `5` | 重试基础延迟（秒），遇 429 自动拉到 30s |

## 常见错误

| 错误 | 原因 | 处理 |
|---|---|---|
| `[WinError 10061] 由于目标计算机积极拒绝` | 沙箱/网络无法直连 mineru.net | 加 `--proxy http://127.0.0.1:7890` |
| `file exceeds 10MB limit` | 超出轻量 API 限制 | 设 `MINERU_TOKEN` 或 `--token` 走精准 API |
| `RATE_LIMITED` | IP 频次超限 | 等待（脚本自动退避 30s+），或改走精准 API |
| `413 Payload Too Large` | 直传二进制走错接口 | 用 SDK / 走 JSON 调用，不要 multipart 原始上传 |
| `RATE_LIMITED` 在精准 API 罕见 | Token 账号额度用尽 | 等待次日重置或换 Token |

## 实现细节

- 用 `mineru-open-sdk` 的 `MinerU()` 客户端，不传 token 自动进入 flash 模式
- SDK 默认 base_url: `https://mineru.net/api/v1/agent`
- 代理通过 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` 环境变量传入（httpx 自动读取）
- 脚本在导入 SDK 前设置代理，避免首次请求失败
