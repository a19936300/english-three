"""DeerFlow 真实联调测试 - v3
---
使用全新的策略：直接从当前进程启动 subprocess.Popen，
所有输出写入文件。不需要终端输出。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import traceback

LOG_FILE = r"e:\workspace2\english-three\agent\_df_result.log"
AGENT_DIR = r"e:\workspace2\english-three\agent"
PYTHON = r"e:\workspace2\english-three\agent\.venv\Scripts\python.exe"


def log(msg: str):
    ts = time.strftime("%H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] {msg}\n")


def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


log("=" * 60)
log("DeerFlow 真实联调测试 v3")
log(f"Python: {sys.executable}")
log(f"CWD: {os.getcwd()}")

# ── 0. 端口检查 ──
log("── Step 0: 端口检查 ──")
try:
    out = subprocess.check_output(
        ["netstat", "-ano"], text=True, timeout=10
    )
    for line in out.splitlines():
        if "8765" in line and "LISTENING" in line:
            pid = line.strip().split()[-1]
            log(f"端口 8765 被 PID {pid} 占用，kill")
            subprocess.run(["taskkill", "/F", "/PID", pid],
                           capture_output=True, timeout=5)
            time.sleep(1)
            log("已 kill")
            break
    else:
        log("端口 8765 未被占用 ✓")
except Exception as e:
    log(f"端口检查异常: {e}")

# ── 1. DeerFlow 直连测试 ──
log("── Step 1: DeerFlow 直连 ──")
try:
    sys.path.insert(0, AGENT_DIR)
    from deerflow.client import DeerFlowClient
    client = DeerFlowClient(config_path=os.path.join(AGENT_DIR, "config.yaml"))
    log("DeerFlowClient 创建成功")
    reply = client.chat("Say hello in exactly one sentence.")
    log(f"DeerFlow 回复: {reply}")
    log("✓ 直连测试通过")
    DF_OK = True
except Exception as e:
    DF_OK = False
    log(f"❌ DeerFlow 直连失败: {e}")
    log(traceback.format_exc())

    # HTTP 直连网关
    log("── HTTP 直连网关 15721 ──")
    import urllib.request
    for endpoint in [
        "http://127.0.0.1:15721/health",
        "http://127.0.0.1:15721/v1/models",
    ]:
        try:
            r = urllib.request.urlopen(endpoint, timeout=5)
            log(f"{endpoint} → {r.status}")
            log(r.read().decode()[:500])
        except Exception as e2:
            log(f"{endpoint} → {e2}")
    log("→ 结论：模型网关 127.0.0.1:15721 不可达" if not DF_OK else "→ 网关正常")

# ── 2. 启动 Tutor API ──
log("── Step 2: 启动 Tutor API ──")
env = os.environ.copy()
env["TUTOR_PORT"] = "8765"
env["PYTHONIOENCODING"] = "utf-8"
tutor_stdout = r"e:\workspace2\english-three\agent\_tutor_out.log"
tutor_stderr = r"e:\workspace2\english-three\agent\_tutor_err.log"

proc = None
try:
    proc = subprocess.Popen(
        [PYTHON, "-m", "agent_english.tutor.api"],
        cwd=AGENT_DIR,
        env=env,
        stdout=open(tutor_stdout, "w", encoding="utf-8"),
        stderr=open(tutor_stderr, "w", encoding="utf-8"),
    )
    log(f"Tutor API 启动 PID: {proc.pid}")
    log(f"stdout→{tutor_stdout}, stderr→{tutor_stderr}")
except Exception as e:
    log(f"启动失败: {e}")
    # 尝试系统 python
    try:
        proc = subprocess.Popen(
            ["python", "-m", "agent_english.tutor.api"],
            cwd=AGENT_DIR, env=env,
            stdout=open(tutor_stdout, "w", encoding="utf-8"),
            stderr=open(tutor_stderr, "w", encoding="utf-8"),
        )
        log(f"Tutor API（系统 python）PID: {proc.pid}")
    except Exception as e2:
        log(f"系统 python 也失败: {e2}")

# ── 3. 等待 + 调用 ──
tutor_ready = False
if proc:
    log("── 等待服务就绪 ──")
    import urllib.request
    for i in range(30):
        time.sleep(2)
        try:
            r = urllib.request.urlopen("http://127.0.0.1:8765/health", timeout=3)
            if r.status == 200:
                log(f"✓ 就绪（第{i+1}次）")
                tutor_ready = True
                break
        except urllib.error.URLError:
            pass
        if proc.poll() is not None:
            log(f"❌ 进程已退出 (code={proc.returncode})")
            break
        log(f"  等待中...({i+1}/30)")

    if tutor_ready:
        log("── Step 3: POST /tutor/chat ──")
        payload = {
            "user_id": "debug-u1",
            "session_id": "s-test-1",
            "message": "用一句话自我介绍",
            "discussion": {
                "bind": "set",
                "scene": {
                    "type": "greeting",
                    "can_reveal_answer": True,
                    "title": "初次见面",
                    "description": "学生初次进入学习界面",
                },
            },
        }
        log(f"请求: {json.dumps(payload, ensure_ascii=False)}")
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8765/tutor/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read().decode("utf-8"))
            log(f"状态码: {resp.status}")
            log(f"完整响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            log(f"\n★★ 回复内容: {data.get('reply', '(无)')}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            log(f"HTTP {e.code}: {body}")
        except Exception as e:
            log(f"调用失败: {e}")
            log(traceback.format_exc())
    else:
        # 读取 stderr 诊断
        try:
            with open(tutor_stderr, "r", encoding="utf-8") as f:
                err = f.read()
            log(f"stderr:\n{err[:3000]}")
        except:
            pass
        try:
            with open(tutor_stdout, "r", encoding="utf-8") as f:
                out = f.read()
            log(f"stdout:\n{out[:2000]}")
        except:
            pass

# ── 总结 ──
log("\n" + "=" * 60)
if tutor_ready:
    log("✅ 端到端测试通过")
else:
    log("❌ 端到端测试未通过")
if proc and proc.poll() is None:
    log(f"Tutor API PID {proc.pid} 仍在运行")
log(f"日志文件: {LOG_FILE}")
log("=" * 60)
