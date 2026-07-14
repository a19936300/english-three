"""快速验证 deerflow-harness 能否正常调用大模型。"""

import sys
sys.path.insert(0, "e:/workspace2/agent-demo/.venv/Lib/site-packages")  # noqa

import os
os.chdir(r"e:\workspace2\english-three\agent")

from deerflow.client import DeerFlowClient


def main():
    print("【1】创建 DeerFlowClient（加载 config.yaml）...")
    client = DeerFlowClient()
    print("   客户端创建成功\n")

    print("【2】发送测试消息...")
    result = client.chat("Say hello in exactly one sentence.")
    print(f"   模型回复: {result}")


if __name__ == "__main__":
    main()
