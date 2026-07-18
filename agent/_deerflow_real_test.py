"""完整 DeerFlow 真实联调测试脚本。
写入详细日志到文件，规避 Trae 沙箱输出吞问题。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import traceback
from pathlib import Path

LOG_FILE = Path(__file__).resolve().parent / "_deerflow_real_test.log"

def log(msg: str):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
    print(msg)

def log_json(label: str, data):
    log(f"{label}:\n{json.dumps(data, ensure_ascii=False, indent=2)}")

def main():
    log("=" * 60)
    log("DeerFlow 真实联调测试开始")
    log(f"Python: {sys.executable}")
    log(f"CWD: {os.getcwd()}")
    log(f"PID: {os.getpid()}")

    agent_dir = Path(__file__).resolve().parent

    # ── Step 0: 检查端口 ──
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    port_in_use = sock.connect_ex(("127.0.0.1", 8765)) == 0
    sock.close()
    if port_in_use:
        log("⚠ 端口 8765 已被占用，需要 kill 后重试")
        # 尝试查找占用进程
        try:
            output = subprocess.check_output(
                ["netstat", "-ano"], text=True, encoding="utf-8"
            )
            for line in output.splitlines():
                if "8765" in line and "LISTENING" in line:
                    parts = line.strip().split()
                    pid = parts[-1]
                    log(f"  占用进程 PID: {pid}")
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
                    log(f"  已 kill PID {pid}")
                    time.sleep(1)
                    break
        except Exception as e:
            log(f"  自动 kill 失败: {e}")
    else:
        log("✓ 端口 8765 未被占用")

    # ── Step 1: 测试 DeerFlow 直连 ──
    log("\n── Step 1: DeerFlowClient 直连测试 ──")
    try:
        from deerflow.client import DeerFlowClient

        config_path = agent_dir / "config.yaml"
        log(f"  config: {config_path}")
        client = DeerFlowClient(config_path=str(config_path))
        log("  客户端创建成功")

        log("  发送测试消息...")
        result = client.chat("Say hello in exactly one sentence.")
        log(f"  模型回复: {result}")
    except Exception as e:
        log(f"  ❌ DeerFlowClient 测试失败: {e}")
        log(f"  traceback: {traceback.format_exc()}")

        # 尝试直接 HTTP 测试
        log("\n  ─ 尝试直连 HTTP 测试 ─")
        try:
            import urllib.request
            req = urllib.request.Request(
                "http://127.0.0.1:15721/v1/chat/completions",
                data=json.dumps({
                    "model": "deepseek-v4-flash",
                    "messages": [{"role": "user", "content": "Say hi"}],
                    "max_tokens": 50,
                }).encode(),
                headers={"Content-Type": "application/json",
                         "Authorization": "Bearer sk-xkhb8oIDiFDYA70zKSCz7Gwc3LpQ7RSaBmjBAKLltYyqs7a1EB0rwa81PKGgOilh"},
            )
            resp = urllib.request.urlopen(req, timeout=10)
            log(f"  HTTP 直连状态码: {resp.status}")
            log(f"  HTTP 直连响应: {resp.read().decode()}")
        except Exception as e2:
            log(f"  HTTP 直连失败: {e2}")
            # 测试网关连通性
            try:
                resp = urllib.request.urlopen("http://127.0.0.1:15721/health", timeout=5)
                log(f"  /health 状态码: {resp.status}")
            except Exception as e3:
                log(f"  /health 不可达: {e3}")
                log("  → 结论：DeerFlow 模型网关 127.0.0.1:15721 不可达（模型不可用）")
    else:
        log("✓ DeerFlow 直连测试通过")

    # ── Step 2: 启动 Tutor API（后台进程）──
    log("\n── Step 2: 启动 Tutor API 后台服务 ──")
    env = os.environ.copy()
    env["TUTOR_PORT"] = "8765"
    env["PYTHONIOENCODING"] = "utf-8"

    # 先写一个启动日志
    tutor_stdout = agent_dir / "_tutor_stdout.log"
    tutor_stderr = agent_dir / "_tutor_stderr.log"

    try:
        proc = subprocess.Popen(
            [sys.executable, "-m", "agent_english.tutor.api"],
            cwd=str(agent_dir),
            env=env,
            stdout=open(tutor_stdout, "w", encoding="utf-8"),
            stderr=open(tutor_stderr, "w", encoding="utf-8"),
        )
        log(f"  Tutor API 已启动，PID: {proc.pid}")
        log(f"  stdout → {tutor_stdout}")
        log(f"  stderr → {tutor_stderr}")
    except Exception as e:
        log(f"  ❌ 启动失败: {e}")
        proc = None

    # 等待服务启动
    if proc:
        log("  等待服务启动...")
        for i in range(10):
            time.sleep(2)
            try:
                import urllib.request
                resp = urllib.request.urlopen("http://127.0.0.1:8765/health", timeout=3)
                if resp.status == 200:
                    log(f"  ✓ 服务已就绪（第{i+1}次重试，状态码{resp.status}）")
                    break
            except Exception:
                if i == 9:
                    log(f"  ❌ 服务启动超时（10次重试）")
                    # 检查 stderr
                    stderr_content = tutor_stderr.read_text(encoding="utf-8") if tutor_stderr.exists() else "（文件不存在）"
                    log(f"  stderr 内容:\n{stderr_content[:2000]}")
                    stdout_content = tutor_stdout.read_text(encoding="utf-8") if tutor_stdout.exists() else "（文件不存在）"
                    log(f"  stdout 内容:\n{stdout_content[:2000]}")

    # ── Step 3: 调用 POST /tutor/chat ──
    log("\n── Step 3: POST /tutor/chat 测试 ──")
    if proc and proc.poll() is None:
        try:
            import urllib.request

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
                    }
                }
            }
            log_json("  请求 payload", payload)

            req = urllib.request.Request(
                "http://127.0.0.1:8765/tutor/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=30)
            resp_data = json.loads(resp.read().decode("utf-8"))
            log(f"  响应状态码: {resp.status}")
            log_json("  响应数据", resp_data)
            log(f"\n  ★ 回复内容: {resp_data.get('reply', '(无reply)')}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            log(f"  ❌ HTTP {e.code}: {body}")
        except Exception as e:
            log(f"  ❌ 调用失败: {e}")
            log(traceback.format_exc())
    else:
        log("  ⏭ 跳过（Tutor API 未运行）")

    # ── 清理 ──
    log("\n── 测试结束 ──")
    if proc and proc.poll() is None:
        log(f"  Tutor API PID {proc.pid} 仍在运行，可通过 taskkill /PID {proc.pid} 停止")
    log(f"\n完整日志已保存到: {LOG_FILE}")

if __name__ == "__main__":
    main()
