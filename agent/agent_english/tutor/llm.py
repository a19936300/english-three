from __future__ import annotations

import traceback
from pathlib import Path

# agent/config.yaml — always load this project's DeerFlow config
_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config.yaml"


class DeerFlowLLM:
    """Thin wrapper; DeerFlowClient created lazily with project config.yaml."""

    def __init__(self, config_path: str | Path | None = None) -> None:
        self._client = None
        self._config_path = str(config_path or _CONFIG_PATH)

    def _get(self):
        if self._client is None:
            from deerflow.client import DeerFlowClient

            self._client = DeerFlowClient(config_path=self._config_path)
        return self._client

    def complete(self, system: str, messages: list[dict]) -> str:
        client = self._get()
        parts = [f"[SYSTEM]\n{system}"]
        for m in messages:
            role = m.get("role", "user").upper()
            parts.append(f"[{role}]\n{m.get('content', '')}")
        parts.append("[ASSISTANT]\n")
        prompt = "\n\n".join(parts)
        try:
            result = client.chat(prompt)
        except Exception as e2:
            import traceback
            err = traceback.format_exc()
            with open(r'e:\workspace2\english-three\agent\llm_error.log', 'w', encoding='utf-8') as f:
                f.write(f"chat failed: {e2}\n{err}\n")
            raise RuntimeError(f"llm_failed: {e2}") from e2
        if isinstance(result, str):
            return result.strip()
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return str(text).strip()
