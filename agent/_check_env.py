"""检查环境并写入日志文件（规避 trae 沙箱输出吞问题）"""
import sys, os
log = []
log.append(f"sys.executable = {sys.executable}")
log.append(f"cwd = {os.getcwd()}")
log.append(f"sys.path = {sys.path}")

try:
    from deerflow.client import DeerFlowClient
    log.append("deerflow.client import OK")
except Exception as e:
    log.append(f"deerflow.client import FAILED: {e}")

try:
    import fastapi
    log.append("fastapi import OK")
except Exception as e:
    log.append(f"fastapi import FAILED: {e}")

try:
    import uvicorn
    log.append("uvicorn import OK")
except Exception as e:
    log.append(f"uvicorn import FAILED: {e}")

log_path = os.path.join(os.path.dirname(__file__), "_check_env.log")
with open(log_path, "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("Wrote", log_path)
