from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from agent_english.adapters.supabase import SupabaseAdapter


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseSessionStore:
    """Persist tutor sessions in Supabase tutor_sessions table."""

    def __init__(self, db: SupabaseAdapter | None = None) -> None:
        self.db = db or SupabaseAdapter()

    def get(self, session_id: str) -> dict[str, Any] | None:
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

    def save(self, session: dict[str, Any]) -> dict[str, Any]:
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
        self.db.client.table("tutor_sessions").upsert(payload).execute()
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
