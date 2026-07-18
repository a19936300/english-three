from __future__ import annotations

import os
import traceback
from pathlib import Path

# Default: agent/config.yaml (local). Production entrypoint sets DEER_FLOW_CONFIG_PATH.
_DEFAULT_CONFIG = Path(__file__).resolve().parents[2] / "config.yaml"


def _resolve_config_path(config_path: str | Path | None = None) -> str:
    if config_path:
        return str(config_path)
    env = os.getenv("DEER_FLOW_CONFIG_PATH", "").strip()
    if env:
        return env
    return str(_DEFAULT_CONFIG)


class DeerFlowLLM:
    """Thin wrapper; DeerFlowClient created lazily with project config.yaml."""

    def __init__(self, config_path: str | Path | None = None) -> None:
        self._client = None
        self._config_path = _resolve_config_path(config_path)

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
            err = traceback.format_exc()
            # Prefer /tmp in containers; fall back next to package-local log.
            log_path = Path(os.getenv("TUTOR_LLM_ERROR_LOG", "/tmp/tutor_llm_error.log"))
            try:
                log_path.write_text(f"chat failed: {e2}\n{err}\n", encoding="utf-8")
            except OSError:
                pass
            raise RuntimeError(f"llm_failed: {e2}") from e2
        if isinstance(result, str):
            return result.strip()
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return str(text).strip()
