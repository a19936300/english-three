from __future__ import annotations

import logging
from copy import deepcopy
from typing import Any, Protocol

from agent_english.tutor.models import TutorChatRequest, TutorChatResponse
from agent_english.tutor.prompt import build_system_prompt, build_user_payload
from agent_english.tutor.session_store import InMemorySessionStore, apply_discussion

logger = logging.getLogger("tutor_service")


class LLM(Protocol):
    def complete(self, system: str, messages: list[dict]) -> str: ...


_ERROR_HTTP = {
    "missing_user": (400, "user_id required"),
    "missing_scene": (400, "discussion.scene required for bind=set"),
    "session_not_found": (400, "session not found; use bind=set or 讲当前"),
    "missing_anchor": (400, "session has no discussion anchor"),
    "forbidden": (403, "session does not belong to user"),
    "empty_message": (400, "message required"),
}


class TutorError(Exception):
    def __init__(self, code: str):
        self.code = code
        self.status, self.message = _ERROR_HTTP.get(code, (400, code))
        super().__init__(self.message)


def _profile_and_memory_suffix(user_id: str) -> str:
    """Phase 2: optional profile/memory injection; degrades silently."""
    try:
        from agent_english.adapters.supabase import SupabaseAdapter
        from agent_english.tutor.tools import (
            format_memories_for_prompt,
            format_profile_for_prompt,
        )

        db = SupabaseAdapter()
        profile = db.fetch_learning_profile(user_id)
        mems = db.fetch_memories(user_id, limit=10)
        return (
            "\n"
            + format_profile_for_prompt(profile)
            + "\n"
            + format_memories_for_prompt(mems)
        )
    except Exception as e:
        # 降级：user_answers / tutor_memory 表缺失或 Supabase 未配置时，
        # 不影响主对话流程，仅记录日志便于排查。
        logger.debug("profile/memory 降级（user_id=%s）: %s: %s", user_id, type(e).__name__, e)
        return "\n学习画像：暂无（未配置或冷启动）。\n教学记忆：无。"


def handle_chat(
    req: TutorChatRequest,
    *,
    store: InMemorySessionStore,
    llm: LLM,
    inject_profile: bool = True,
) -> TutorChatResponse:
    disc = req.discussion.model_dump()
    sess, err = apply_discussion(store, req.user_id, req.session_id, disc)
    if err:
        raise TutorError(err)

    assert sess is not None
    if req.presence is not None:
        sess["presence_last"] = deepcopy(req.presence)

    user_text = build_user_payload(req.message)
    if not user_text:
        raise TutorError("empty_message")

    history = list(sess.get("messages") or [])
    history_for_llm = history[-40:]
    system = build_system_prompt(sess["discussion_scene"], req.presence)
    if inject_profile:
        system = system + _profile_and_memory_suffix(req.user_id)
    llm_messages = history_for_llm + [{"role": "user", "content": user_text}]

    try:
        reply = llm.complete(system, llm_messages)
    except Exception as e:
        raise RuntimeError(f"llm_failed: {e}") from e

    if not reply:
        reply = "老师暂时没想好怎么说，请再试一次～"

    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply})
    sess["messages"] = history
    store.save(sess)

    return TutorChatResponse(
        reply=reply,
        session_id=sess["id"],
        memory_updated=False,
    )
