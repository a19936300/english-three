"""本地联调入口：用 FakeLLM，不依赖 DeerFlow。

用法（在 agent/ 目录）:
  python start_tutor_dev.py
"""
from __future__ import annotations

import uvicorn

from agent_english.tutor import api as api_mod
from agent_english.tutor.session_store import InMemorySessionStore


class FakeLLM:
    def complete(self, system: str, messages: list[dict]) -> str:
        last = messages[-1].get("content", "") if messages else ""
        cannot = "can_reveal_answer=false" in system or "不可泄露答案" in system
        if cannot and any(k in last for k in ("答案", "选哪个", "正确答案")):
            return (
                "（联调假老师）这题还没提交，我只给思路："
                "先看题干关键词，再排除明显不符的选项。暂不能直接告诉你选哪一项。"
            )
        # extract word hint from discussion if present
        if '"en":' in system or '"en": ' in system:
            return (
                f"（联调假老师）收到：「{last[:60]}」。"
                "结合当前单词/题目，建议：拆词记忆 + 造一个简单例句加深印象。"
            )
        return f"（联调假老师）收到：「{last[:80]}」。继续加油，有问题再问我。"


api_mod._llm = FakeLLM()
api_mod._store = InMemorySessionStore()


if __name__ == "__main__":
    print("Tutor API (FakeLLM) http://127.0.0.1:8765")
    uvicorn.run(api_mod.app, host="127.0.0.1", port=8765, log_level="info")
