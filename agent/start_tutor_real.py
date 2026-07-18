"""真实 DeerFlow Tutor 启动脚本。

在本项目 agent 虚拟环境中运行:
  .\\.venv\\Scripts\\python.exe start_tutor_real.py

强制加载本项目 agent/config.yaml。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
os.chdir(AGENT_DIR)
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

import uvicorn

from agent_english.tutor import api as api_mod
from agent_english.tutor.llm import DeerFlowLLM
from agent_english.tutor.session_store import InMemorySessionStore

api_mod._store = InMemorySessionStore()
api_mod._llm = DeerFlowLLM()

if __name__ == "__main__":
    port = int(os.getenv("TUTOR_PORT", "8765"))
    print(f"Tutor API (DeerFlow real) http://127.0.0.1:{port}")
    print(f"config: {api_mod._llm._config_path}")
    print(f"python: {sys.executable}")
    uvicorn.run(api_mod.app, host="127.0.0.1", port=port, log_level="info")
