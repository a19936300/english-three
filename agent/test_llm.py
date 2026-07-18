"""快速验证本项目 deerflow-harness 能否正常调用大模型。

在 agent/ 目录下用本项目虚拟环境运行:
  .\\.venv\\Scripts\\python.exe test_llm.py
"""
from __future__ import annotations

import os
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
os.chdir(AGENT_DIR)

from deerflow.client import DeerFlowClient


def main():
    config = AGENT_DIR / "config.yaml"
    print("【1】创建 DeerFlowClient（加载 config.yaml）...")
    print(f"   config: {config}")
    client = DeerFlowClient(config_path=str(config))
    print("   客户端创建成功\n")

    print("【2】发送测试消息...")
    result = client.chat("Say hello in exactly one sentence.")
    print(f"   模型回复: {result}")


if __name__ == "__main__":
    main()
