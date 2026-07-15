from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class Discussion(BaseModel):
    bind: Literal["set", "keep"]
    scene: dict[str, Any] | None = None


class TutorChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: str | None = None
    discussion: Discussion
    presence: dict[str, Any] | None = None


class TutorChatResponse(BaseModel):
    reply: str
    session_id: str
    memory_updated: bool = False
