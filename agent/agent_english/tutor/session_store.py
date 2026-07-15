from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}

    def get(self, session_id: str) -> dict[str, Any] | None:
        s = self._sessions.get(session_id)
        return deepcopy(s) if s else None

    def save(self, session: dict[str, Any]) -> dict[str, Any]:
        session = deepcopy(session)
        session["updated_at"] = _now()
        self._sessions[session["id"]] = session
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


def apply_discussion(
    store: InMemorySessionStore,
    user_id: str,
    session_id: str | None,
    discussion: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, str | None]:
    if not user_id:
        return None, "missing_user"
    if not discussion or "bind" not in discussion:
        return None, "missing_scene"

    bind = discussion.get("bind")
    if bind == "set":
        scene = discussion.get("scene")
        if not scene:
            return None, "missing_scene"
        if session_id:
            existing = store.get(session_id)
            if existing and existing["user_id"] != user_id:
                return None, "forbidden"
            if existing:
                existing["discussion_scene"] = deepcopy(scene)
                return store.save(existing), None
        return store.create(
            session_id=session_id, user_id=user_id, discussion_scene=scene
        ), None

    if bind == "keep":
        if not session_id:
            return None, "session_not_found"
        existing = store.get(session_id)
        if not existing:
            return None, "session_not_found"
        if existing["user_id"] != user_id:
            return None, "forbidden"
        if not existing.get("discussion_scene"):
            return None, "missing_anchor"
        return existing, None

    return None, "missing_scene"
