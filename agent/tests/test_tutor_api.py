from fastapi.testclient import TestClient

from agent_english.tutor import api as api_mod
from agent_english.tutor.session_store import InMemorySessionStore


class FakeLLM:
    def complete(self, system: str, messages: list[dict]) -> str:
        return "模拟老师回复"


def test_chat_endpoint():
    api_mod._store = InMemorySessionStore()
    api_mod._llm = FakeLLM()
    client = TestClient(api_mod.app)
    r = client.post(
        "/tutor/chat",
        json={
            "user_id": "u1",
            "message": "这个词什么意思？",
            "session_id": "s1",
            "discussion": {
                "bind": "set",
                "scene": {
                    "phase": "learn",
                    "can_reveal_answer": True,
                    "content": {"type": "word", "en": "achieve", "cn": "实现"},
                },
            },
            "presence": {"phase": "learn", "item_index": 0},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == "s1"
    assert data["reply"]

    r2 = client.post(
        "/tutor/chat",
        json={
            "user_id": "u1",
            "message": "再举个例子",
            "session_id": "s1",
            "discussion": {"bind": "keep"},
            "presence": {"item_index": 1},
        },
    )
    assert r2.status_code == 200
