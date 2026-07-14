"""用户进度分析 — 基于答题历史计算正确率、薄弱知识点等指标."""

from dataclasses import dataclass, field
from collections import Counter


@dataclass
class UserProgress:
    """分析后的用户进度摘要。"""
    user_id: str
    level_id: str
    section: str
    total_answers: int = 0
    correct_count: int = 0
    correct_rate: float = 0.0
    avg_time_spent: float = 0.0           # 平均答题秒数
    weak_question_ids: list[str] = field(default_factory=list)
    strong_question_ids: list[str] = field(default_factory=list)
    raw_answers: list[dict] = field(default_factory=list)


def analyze_progress(answers: list[dict], user_id: str, level_id: str, section: str) -> UserProgress:
    """根据答题记录分析用户在某关卡的表现。"""
    if not answers:
        return UserProgress(user_id=user_id, level_id=level_id, section=section)

    total = len(answers)
    correct = sum(1 for a in answers if a.get("is_correct"))
    rate = correct / total if total > 0 else 0
    times = [a.get("time_spent", 0) or 0 for a in answers]
    avg_time = sum(times) / len(times) if times else 0

    weak: list[str] = []
    strong: list[str] = []
    for a in answers:
        qid = a.get("question_id", "")
        if not qid:
            continue
        if a.get("is_correct"):
            strong.append(qid)
        else:
            weak.append(qid)

    return UserProgress(
        user_id=user_id,
        level_id=level_id,
        section=section,
        total_answers=total,
        correct_count=correct,
        correct_rate=rate,
        avg_time_spent=avg_time,
        weak_question_ids=weak,
        strong_question_ids=strong,
        raw_answers=answers,
    )
