from __future__ import annotations


def format_profile_for_prompt(profile: dict) -> str:
    if not profile or profile.get("total_answers", 0) == 0:
        return "学习画像：暂无答题记录（冷启动，不要编造历史）。"
    return (
        f"学习画像：答题{profile['total_answers']}次，"
        f"正确率{profile['correct_rate']:.0%}，"
        f"分模块{profile.get('section_rates')}，"
        f"近错题{profile.get('recent_weak_question_ids')}"
    )


def format_memories_for_prompt(rows: list[dict]) -> str:
    if not rows:
        return "教学记忆：无。"
    lines = [f"- ({r.get('kind')}) {r.get('content')}" for r in rows]
    return "教学记忆：\n" + "\n".join(lines)
