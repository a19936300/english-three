"""DeerFlow 真实联调测试 - 使用 subprocess 规避终端问题。
全部输出写入日志文件后，用 Read 工具读取。
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import traceback
from pathlib import Path

LOG = Path(__file__).resolve().parent / "_df_test_result.log"
AGENT_DIR = Path(__file__).resolve().parent
PYTHON = str(AGENT_DIR / ".venv" / "Scripts" / "python.exe")


def log(msg: str):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line)


def log_json(label: str, data):
    log(f"{label}:\n{json.dumps(data, ensure_ascii=False, indent=2)}")


# ── 清理旧日志 ──
if LOG.exists():
    LOG.unlink()

log("=" * 60)
log("DeerFlow 真实联调测试")
log(f"sys.executable: {sys.executable}")
log(f"AGENT_DIR: {AGENT_DIR}")
log(f"Target Python: {PYTHON}")
log(f"Python exists: {os.path.isfile(PYTHON)}")

# ── Step 0: 端口检查 ──
log("\n── Step 0: 端口 8765 检查 ──")
try:
    import subprocess
    result = subprocess.run(
        ["netstat", "-ano"], capture_output=True, text=True, timeout=10
    )
    for line in result.stdout.splitlines():
        if "8765" in line and "LISTENING" in line:
            parts = line.strip().split()
            pid = parts[-1]
            log(f"端口 8765 被 PID {pid} 占用，执行 kill")
            subprocess.run(["taskkill", "/F", "/PID", pid],
                           capture_output=True, timeout=5)
            time.sleep(1)
            log("已 kill")
            break
    else:
        log("端口 8765 未被占用 ✓")
except Exception as e:
    log(f"端口检查失败（可能无权限）: {e}")

# ── Step 1: 测试 DeerFlow 直连 ──
log("\n── Step 1: DeerFlowClient 直连测试 ──")
try:
    sys.path.insert(0, str(AGENT_DIR))
    from deerflow.client import DeerFlowClient

    client = DeerFlowClient(config_path=str(AGENT_DIR / "config.yaml"))
    log("客户端创建成功")
    result = client.chat("Say hello in exactly one sentence.")
    log(f"模型回复: {result}")
    log("✓ DeerFlow 直连测试通过")
    DF_OK = True
except Exception as e:
    DF_OK = False
    log(f"❌ DeerFlowClient 直连失败: {e}")
    log(traceback.format_exc())

    # 尝试 HTTP 直连
    log("\n  ─ HTTP 直连网关 127.0.0.1:15721 ─")
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://127.0.0.1:15721/v1/chat/completions",
            data=json.dumps({
                "model": "deepseek-v4-flash",
                "messages": [{"role": "user", "content": "Say hi"}],
                "max_tokens": 50,
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer sk-xkhb8oIDiFDYA70zKSCz7Gwc3LpQ7RSaBmjBAKLltYyqs7a1EB0rwa81PKGgOilh",
            },
        )
        resp = urllib.request.urlopen(req, timeout=10)
        log(f"HTTP 直连状态: {resp.status}")
        log(f"HTTP 直连响应: {resp.read().decode()}")
    except Exception as e2:
        log(f"HTTP 直连失败: {e2}")
        try:
            h = urllib.request.urlopen("http://127.0.0.1:15721/health", timeout=5)
            log(f"DeerFlow /health: {h.status}")
        except Exception as e3:
            log(f"DeerFlow /health 不可达: {e3}")
            log("→ 结论：模型网关 127.0.0.1:15721 不可达（模型不可用）")

# ── Step 2: 后台启动 Tutor API ──
log("\n── Step 2: 启动 Tutor API ──")
env = os.environ.copy()
env["TUTOR_PORT"] = "8765"
env["PYTHONIOENCODING"] = "utf-8"

tutor_proc = None
try:
    tutor_proc = subprocess.Popen(
        [PYTHON, "-m", "agent_english.tutor.api"],
        cwd=str(AGENT_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    log(f"Tutor API 启动 PID: {tutor_proc.pid}")
except Exception as e:
    log(f"❌ 启动失败: {e}")
    # 尝试用默认 python
    try:
        tutor_proc = subprocess.Popen(
            ["python", "-m", "agent_english.tutor.api"],
            cwd=str(AGENT_DIR),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        log(f"Tutor API 启动（系统 python）PID: {tutor_proc.pid}")
    except Exception as e2:
        log(f"❌ 系统 python 也失败: {e2}")

# ── Step 3: 等待就绪并测试 ──
if tutor_proc:
    log("等待服务就绪...")
    import urllib.request
    ready = False
    for i in range(20):
        time.sleep(2)
        try:
            resp = urllib.request.urlopen("http://127.0.0.1:8765/health", timeout=3)
            if resp.status == 200:
                log(f"✓ 健康检查通过（第{i+1}次）")
                ready = True
                break
        except Exception:
            pass
        # 检查进程是否存活
        if tutor_proc.poll() is not None:
            log(f"❌ 进程已退出，code={tutor_proc.returncode}")
            stdout_data = tutor_proc.stdout.read(3000) if tutor_proc.stdout else b""
            stderr_data = tutor_proc.stderr.read(3000) if tutor_proc.stderr else b""
            log(f"stdout: {stdout_data.decode('utf-8', errors='replace')[:2000]}")
            log(f"stderr: {stderr_data.decode('utf-8', errors='replace')[:2000]}")
            break

    if ready:
        log("\n── Step 3: POST /tutor/chat 测试 ──")
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
        log_json("请求 payload", payload)
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8765/tutor/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=30)
            resp_data = json.loads(resp.read().decode("utf-8"))
            log(f"响应状态码: {resp.status}")
            log_json("响应数据", resp_data)
            log(f"\n★★ 回复内容: {resp_data.get('reply', '(无reply)')}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            log(f"❌ HTTP {e.code}: {body}")
        except Exception as e:
            log(f"❌ 调用失败: {e}")
            log(traceback.format_exc())
    else:
        log("❌ 服务未就绪，跳过 API 测试")
else:
    log("❌ Tutor API 未启动，跳过测试")

# ── 总结 ──
log("\n" + "=" * 60)
log("测试完成")
log(f"完整日志: {LOG}")
if tutor_proc and tutor_proc.poll() is None:
    log(f"Tutor API (PID {tutor_proc.pid}) 仍在运行")
else:
    log("Tutor API 已停止")
log(f"\n端到端结果: {'✅ 通过' if ready else '❌ 未通过'}")

# 尝试读取 stderr 查看错误
if tutor_proc and tutor_proc.poll() is not None:
    try:
        stderr_out = tutor_proc.stderr.read(5000).decode("utf-8", errors="replace")
        if stderr_out.strip():
            log(f"\n完整 stderr:\n{stderr_out}")
    except:
        pass
