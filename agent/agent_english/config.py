"""Agent 配置 — 从环境变量加载 Supabase / LLM 等连接信息."""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# 自适应引擎阈值
DEFAULT_MIN_CORRECT_RATE = 0.6     # 低于此正确率 → 降低难度
DEFAULT_MAX_CORRECT_RATE = 0.9     # 高于此正确率 → 提升难度
DEFAULT_ADJUST_STEP = 0.1          # 每次调整的难度步长
