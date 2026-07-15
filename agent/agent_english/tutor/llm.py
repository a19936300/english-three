from __future__ import annotations


class DeerFlowLLM:
    """Thin wrapper; DeerFlowClient created lazily."""

    def __init__(self) -> None:
        self._client = None

    def _get(self):
        if self._client is None:
            from deerflow.client import DeerFlowClient

            self._client = DeerFlowClient()
        return self._client

    def complete(self, system: str, messages: list[dict]) -> str:
        parts = [f"[SYSTEM]\n{system}"]
        for m in messages:
            role = m.get("role", "user").upper()
            parts.append(f"[{role}]\n{m.get('content', '')}")
        parts.append("[ASSISTANT]\n")
        prompt = "\n\n".join(parts)
        result = self._get().chat(prompt)
        if isinstance(result, str):
            return result.strip()
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return str(text).strip()
