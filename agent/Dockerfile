# PETS-3 Tutor API — Render / Docker production image
# Build context: agent/ directory (see render.yaml rootDir)

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    # Render injects PORT; default matches Render web service convention
    PORT=10000 \
    TUTOR_PORT=10000 \
    TUTOR_SESSION_BACKEND=supabase

WORKDIR /app

# System deps: git (install deerflow-harness), build tools for native wheels
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        build-essential \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Fast installer
COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /usr/local/bin/uv

# Project metadata first (better layer cache)
COPY pyproject.toml ./
COPY agent_english ./agent_english
COPY docker_gen_config.py docker-entrypoint.sh ./
COPY skills ./skills

# Production install: deerflow-harness from GitHub (not local path),
# then the rest of pyproject deps without the path source.
RUN set -eux; \
    # Strip local path source so uv does not look for ../../deer-flow
    python - <<'PY'
from pathlib import Path
p = Path("pyproject.toml")
text = p.read_text(encoding="utf-8")
# Remove [tool.uv.sources] block entirely for cloud builds
if "[tool.uv.sources]" in text:
    lines = text.splitlines(keepends=True)
    out, skip = [], False
    for line in lines:
        if line.startswith("[tool.uv.sources]"):
            skip = True
            continue
        if skip:
            if line.startswith("[") and not line.startswith("[tool.uv.sources]"):
                skip = False
                out.append(line)
            continue
        out.append(line)
    p.write_text("".join(out), encoding="utf-8")
PY
    # Install deerflow-harness from upstream monorepo subdirectory
    uv pip install --system \
      "deerflow-harness @ git+https://github.com/bytedance/deer-flow.git@main#subdirectory=backend/packages/harness"
    # Install remaining project dependencies (deerflow already present)
    uv pip install --system \
      "supabase" \
      "httpx" \
      "python-dotenv" \
      "fastapi" \
      "uvicorn[standard]" \
      "pydantic>=2" \
      "pyyaml>=6"
    # Install this package (no path deps left)
    uv pip install --system --no-deps .

RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /app/.deer-flow /app/skills \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-10000}/health" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "uvicorn agent_english.tutor.api:app --host 0.0.0.0 --port ${PORT:-10000}"]
