from __future__ import annotations

import logging
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from agent_english.adapters.supabase import SupabaseAdapter
from agent_english.tutor.session_store import InMemorySessionStore

logger = logging.getLogger("tutor_supabase_store")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseSessionStore:
    """Persist tutor sessions in Supabase tutor_sessions table.

    若 Supabase 表缺失或网络异常，自动降级到内存存储，保证对话主流程不中断。
    """

    def __init__(self, db: SupabaseAdapter | None = None) -> None:
        self.db = db or SupabaseAdapter()
        # 降级后端：仅当 Supabase 写入失败时启用
        self._fallback: InMemorySessionStore | None = None
        self._broken = False

    def _ensure_fallback(self) -> InMemorySessionStore:
        if self._fallback is None:
            logger.warning("Supabase tutor_sessions 不可用，降级到内存存储")
            self._fallback = InMemorySessionStore()
            self._broken = True
        return self._fallback

    def get(self, session_id: str) -> dict[str, Any] | None:
        if self._broken:
            return self._fallback.get(session_id)  # type: ignore[union-attr]
        try:
            resp = (
                self.db.client.table("tutor_sessions")
                .select("*")
                .eq("id", session_id)
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None
            row = rows[0]
            return {
                "id": row["id"],
                "user_id": row["user_id"],
                "discussion_scene": row["discussion_scene"],
                "messages": row.get("messages") or [],
                "presence_last": row.get("presence_last"),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
            }
        except Exception as e:
            logger.warning("tutor_sessions 读取失败，降级: %s: %s", type(e).__name__, e)
            self._ensure_fallback()
            return self._fallback.get(session_id)  # type: ignore[union-attr]

    def save(self, session: dict[str, Any]) -> dict[str, Any]:
        if self._broken:
            return self._fallback.save(session)  # type: ignore[union-attr]
        session = deepcopy(session)
        session["updated_at"] = _now()
        payload = {
            "id": session["id"],
            "user_id": session["user_id"],
            "discussion_scene": session["discussion_scene"],
            "messages": session.get("messages") or [],
            "presence_last": session.get("presence_last"),
            "updated_at": session["updated_at"],
        }
        if session.get("created_at"):
            payload["created_at"] = session["created_at"]
        try:
            self.db.client.table("tutor_sessions").upsert(payload).execute()
        except Exception as e:
            logger.warning("tutor_sessions 写入失败，降级: %s: %s", type(e).__name__, e)
            self._ensure_fallback()
            return self._fallback.save(session)  # type: ignore[union-attr]
        return deepcopy(session)

    def create(
        self,
        *,
        session_id: str | None,
        user_id: str,
        discussion_scene: dict[str, Any],
    ) -> dict[str, Any]:
        sid = session_id or str(uuid4())
        sess = {
            "id": sid,
            "user_id": user_id,
            "discussion_scene": deepcopy(discussion_scene),
            "messages": [],
            "presence_last": None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        return self.save(sess)
