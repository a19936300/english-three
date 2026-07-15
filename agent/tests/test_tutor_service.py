from agent_english.tutor.session_store import InMemorySessionStore
from agent_english.tutor.service import handle_chat, TutorError
from agent_english.tutor.models import TutorChatRequest, Discussion


class FakeLLM:
    def complete(self, system: str, messages: list[dict]) -> str:
        assert "PETS" in system or "discussion" in system.lower() or "锚点" in system
        return "这是提示：先抓关键词，不要猜选项字母。"


def test_first_message_bind_set():
    store = InMemorySessionStore()
    req = TutorChatRequest(
        user_id="u1",
        message="给我提示",
        session_id="s1",
        discussion=Discussion(
            bind="set",
            scene={
                "phase": "quiz",
                "can_reveal_answer": False,
                "content": {"question": "Q?"},
            },
        ),
        presence={"item_index": 0},
    )
    resp = handle_chat(req, store=store, llm=FakeLLM(), inject_profile=False)
    assert resp.session_id == "s1"
    assert "提示" in resp.reply
    sess = store.get("s1")
    assert len(sess["messages"]) == 2
    assert sess["messages"][0]["role"] == "user"


def test_keep_requires_existing():
    store = InMemorySessionStore()
    req = TutorChatRequest(
        user_id="u1",
        message="hi",
        session_id="nope",
        discussion=Discussion(bind="keep"),
    )
    try:
        handle_chat(req, store=store, llm=FakeLLM(), inject_profile=False)
        assert False, "should raise"
    except TutorError as e:
        assert e.code == "session_not_found"
