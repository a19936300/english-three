"""Supabase 适配器 — 读写用户答题与关卡数据."""

from supabase import create_client

from agent_english.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


class SupabaseAdapter:
    """封装 Supabase 连接，提供面向业务的方法。"""

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("未设置 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（检查 .env）")
        self.client = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            options={"auth": {"persistSession": False}},
        )

    # ---------- 用户答题 ----------

    def fetch_user_answers(self, user_id: str, level_id: str | None = None) -> list[dict]:
        """拉取某个用户在某关卡（或全部）的答题记录。"""
        query = (
            self.client.table("user_answers")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
        )
        if level_id:
            query = query.eq("level_id", level_id)
        resp = query.execute()
        return resp.data or []

    def insert_answer(self, *,
                      user_id: str,
                      question_id: str,
                      level_id: str,
                      section: str,
                      is_correct: bool,
                      time_spent: int | None = None) -> dict | None:
        """前端上报单条答题记录。"""
        resp = (
            self.client.table("user_answers")
            .insert({
                "user_id": user_id,
                "question_id": question_id,
                "level_id": level_id,
                "section": section,
                "is_correct": is_correct,
                "time_spent": time_spent,
            })
            .execute()
        )
        return resp.data[0] if resp.data else None

    # ---------- 关卡 ----------

    def fetch_level(self, level_id: str) -> dict | None:
        resp = self.client.table("levels").select("*").eq("id", level_id).single().execute()
        return resp.data

    def fetch_levels_by_section(self, section: str) -> list[dict]:
        resp = (
            self.client.table("levels")
            .select("*")
            .eq("section", section)
            .order("level_no")
            .execute()
        )
        return resp.data or []

    def fetch_all_levels(self) -> list[dict]:
        resp = self.client.table("levels").select("*").order("sort_order").execute()
        return resp.data or []

    def fetch_questions(self, level_id: str) -> list[dict]:
        resp = (
            self.client.table("questions")
            .select("*")
            .eq("level_id", level_id)
            .order("sort_order")
            .execute()
        )
        return resp.data or []

    # ---------- 调整结果写回 ----------

    def update_level_adjustment(self, level_id: str, *,
                                 difficulty_override: float | None = None,
                                 question_pool: list[str] | None = None) -> dict | None:
        """将 agent 调整后的难度 / 题目子集写回 levels 表。"""
        payload = {}
        if difficulty_override is not None:
            payload["difficulty_override"] = difficulty_override
        if question_pool is not None:
            payload["question_pool"] = question_pool
        if not payload:
            return None
        resp = (
            self.client.table("levels")
            .update(payload)
            .eq("id", level_id)
            .execute()
        )
        return resp.data[0] if resp.data else None

    # ---------- Tutor: learning profile & memory ----------

    def fetch_learning_profile(self, user_id: str, section: str | None = None) -> dict:
        answers = self.fetch_user_answers(user_id)
        if section:
            answers = [a for a in answers if a.get("section") == section]
        total = len(answers)
        correct = sum(1 for a in answers if a.get("is_correct"))
        weak = [a.get("question_id") for a in answers if not a.get("is_correct")][-10:]
        by_section: dict[str, list] = {}
        for a in answers:
            by_section.setdefault(a.get("section") or "unknown", []).append(a)
        section_rates = {
            s: (sum(1 for x in rows if x.get("is_correct")) / len(rows) if rows else 0.0)
            for s, rows in by_section.items()
        }
        return {
            "user_id": user_id,
            "total_answers": total,
            "correct_rate": (correct / total) if total else 0.0,
            "section_rates": section_rates,
            "recent_weak_question_ids": weak,
        }

    def fetch_memories(self, user_id: str, limit: int = 10) -> list[dict]:
        resp = (
            self.client.table("tutor_memory")
            .select("*")
            .eq("user_id", user_id)
            .is_("expired_at", "null")
            .order("importance", desc=True)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []

    def upsert_memory(
        self,
        *,
        user_id: str,
        kind: str,
        content: str,
        importance: int = 1,
        meta: dict | None = None,
        source: str = "agent",
    ) -> dict | None:
        resp = (
            self.client.table("tutor_memory")
            .insert({
                "user_id": user_id,
                "kind": kind,
                "content": content,
                "importance": importance,
                "meta": meta,
                "source": source,
            })
            .execute()
        )
        return resp.data[0] if resp.data else None
