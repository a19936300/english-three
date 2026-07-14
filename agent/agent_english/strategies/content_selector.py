"""题目筛选策略 — 根据用户的薄弱点从题库中精选题目."""

from collections import Counter


def select_questions(
    *,
    all_question_ids: list[str],
    question_difficulties: dict[str, float],
    weak_question_types: list[str] | None = None,
    target_count: int | None = None,
    prefer_difficulty: float | None = None,
) -> list[str]:
    """从题库中筛选推荐题目。

    策略优先级：
    1. 优先选择用户薄弱知识点（weak_question_types）对应的题目
    2. 优先选择难度接近 prefer_difficulty 的题目
    3. 不足时用剩余题目补齐
    """
    if not all_question_ids:
        return []

    remaining = list(all_question_ids)
    selected: list[str] = []

    # 按薄弱类型优先
    if weak_question_types:
        weak_set = set(weak_question_types)
        type_hits = [q for q in remaining if _match_type(q, weak_set)]
        selected.extend(type_hits)
        remaining = [q for q in remaining if q not in selected]

    # 按难度排序
    if prefer_difficulty is not None:
        remaining.sort(
            key=lambda q: abs(question_difficulties.get(q, 0.5) - prefer_difficulty)
        )

    # 补齐
    need = (target_count or len(all_question_ids)) - len(selected)
    if need > 0:
        selected.extend(remaining[:need])

    return selected if target_count else selected[:len(all_question_ids)]


def _match_type(question_id: str, types: set[str]) -> bool:
    """检查 question_id 是否匹配弱项类型（简单前缀匹配）。"""
    for t in types:
        if t.lower() in question_id.lower():
            return True
    return False
