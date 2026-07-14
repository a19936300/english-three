"""关卡难度评估 — 基于历史答题数据计算每道题的实际难度."""

from collections import Counter


def compute_question_difficulty(answers: list[dict]) -> dict[str, float]:
    """根据所有用户的答题记录，计算每道题的错误率作为难度指标。

    返回 {question_id: difficulty}，difficulty ∈ [0, 1]，越高越难。
    """
    stats: dict[str, dict[str, int]] = {}  # question_id → {correct, total}
    for a in answers:
        qid = a.get("question_id", "")
        if not qid:
            continue
        if qid not in stats:
            stats[qid] = {"correct": 0, "total": 0}
        stats[qid]["total"] += 1
        if a.get("is_correct"):
            stats[qid]["correct"] += 1

    return {
        qid: 1 - (s["correct"] / s["total"]) if s["total"] > 0 else 0.5
        for qid, s in stats.items()
    }


def estimate_level_difficulty(question_difficulties: dict[str, float], level_question_ids: list[str]) -> float:
    """根据关卡的每道题难度计算整体关卡难度（取均值）。"""
    if not level_question_ids:
        return 0.5
    vals = [question_difficulties.get(qid, 0.5) for qid in level_question_ids]
    return sum(vals) / len(vals)
