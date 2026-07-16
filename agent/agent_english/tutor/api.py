from __future__ import annotations

import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent_english.tutor.llm import DeerFlowLLM
from agent_english.tutor.models import TutorChatRequest, TutorChatResponse
from agent_english.tutor.service import TutorError, handle_chat
from agent_english.tutor.session_store import InMemorySessionStore

logger = logging.getLogger("tutor_api")


def build_store():
    if os.getenv("TUTOR_SESSION_BACKEND", "memory") == "supabase":
        try:
            from agent_english.tutor.supabase_session_store import SupabaseSessionStore

            return SupabaseSessionStore()
        except Exception as e:
            logger.warning(
                "SupabaseSessionStore 初始化失败，降级到 InMemorySessionStore: %s", e
            )
    return InMemorySessionStore()


app = FastAPI(title="PETS-3 Tutor API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_store = build_store()
_llm = DeerFlowLLM()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/tutor/chat", response_model=TutorChatResponse)
def tutor_chat(req: TutorChatRequest):
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(400, "user_id required")
    try:
        return handle_chat(req, store=_store, llm=_llm)
    except TutorError as e:
        raise HTTPException(e.status, e.message) from e
    except RuntimeError as e:
        if str(e).startswith("llm_failed"):
            logger.warning("LLM 调用失败: %s", e)
            raise HTTPException(502, "LLM unavailable") from e
        logger.exception("tutor_chat RuntimeError")
        raise HTTPException(500, f"server error: {e}") from e
    except Exception as e:
        # 捕获 supabase 表缺失、网络异常等，避免前端只看到无信息的 500
        logger.exception("tutor_chat 未知异常")
        raise HTTPException(
            500, f"server error: {type(e).__name__}: {e}"
        ) from e


def main():
    import uvicorn

    uvicorn.run(
        "agent_english.tutor.api:app",
        host="0.0.0.0",
        port=int(os.getenv("TUTOR_PORT", "8765")),
        reload=False,
    )


if __name__ == "__main__":
    main()
