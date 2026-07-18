#!/bin/sh
set -eu

# Generate DeerFlow config.yaml from env (MODEL_*, etc.)
python /app/docker_gen_config.py

# Align TUTOR_PORT with platform PORT when provided (Render sets PORT)
if [ -n "${PORT:-}" ]; then
  export TUTOR_PORT="$PORT"
fi

exec "$@"
