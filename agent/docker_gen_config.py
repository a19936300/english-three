"""Generate agent/config.yaml from environment variables (production).

Local dev still uses a hand-written config.yaml; containers always generate
config at startup so secrets never need to be baked into the image.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml


def _require(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        raise SystemExit(f"missing required env: {name}")
    return val


def main() -> None:
    out = Path(os.getenv("DEER_FLOW_CONFIG_PATH", "/app/config.yaml"))

    model = {
        "name": os.getenv("MODEL_CONFIG_NAME", "default"),
        "display_name": os.getenv("MODEL_DISPLAY_NAME", "Tutor LLM"),
        "use": os.getenv("MODEL_USE", "langchain_openai:ChatOpenAI"),
        "model": os.getenv("MODEL_NAME", "gpt-4o-mini"),
        "api_key": _require("MODEL_API_KEY"),
        "max_tokens": int(os.getenv("MODEL_MAX_TOKENS", "8192")),
        "max_retries": int(os.getenv("MODEL_MAX_RETRIES", "2")),
    }
    base_url = os.getenv("MODEL_BASE_URL", "").strip()
    if base_url:
        model["base_url"] = base_url

    config = {
        "config_version": 5,
        "models": [model],
        "sandbox": {
            "use": "deerflow.sandbox.local:LocalSandboxProvider",
        },
        "tools": [],
        "tool_groups": [],
        "skills": {
            "path": "skills",
            "container_path": "/mnt/skills",
        },
        "memory": {
            "enabled": False,
            "injection_enabled": False,
            "storage_path": ".deer-flow/memory.json",
        },
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        yaml.safe_dump(config, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    print(f"wrote {out} (model={model['model']}, use={model['use']})", file=sys.stderr)


if __name__ == "__main__":
    main()
