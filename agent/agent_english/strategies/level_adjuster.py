"""关卡调整策略 — 根据分析结果决定如何调整后续关卡."""

from dataclasses import dataclass

from agent_english.config import DEFAULT_MIN_CORRECT_RATE, DEFAULT_MAX_CORRECT_RATE, DEFAULT_ADJUST_STEP


@dataclass
class LevelAdjustment:
    """单关调整结果。"""
    level_id: str
    old_difficulty: float
    new_difficulty: float
    action: str             # "keep" | "easier" | "harder"
    reason: str
    recommended_question_ids: list[str] | None = None


def decide_adjustment(
    *,
    level_id: str,
    current_difficulty: float,
    user_correct_rate: float,
    next_level_id: str | None = None,
    next_level_question_ids: list[str] | None = None,
) -> LevelAdjustment:
    """根据用户正确率决定下一关的难度调整。

    - 正确率 < min_rate → 降低难度（easier）
    - 正确率 > max_rate → 提升难度（harder）
    - 中间 → 保持不变（keep）
    """
    action = "keep"
    new_diff = current_difficulty

    if user_correct_rate < DEFAULT_MIN_CORRECT_RATE:
        action = "easier"
        new_diff = max(0.1, current_difficulty - DEFAULT_ADJUST_STEP)
    elif user_correct_rate > DEFAULT_MAX_CORRECT_RATE:
        action = "harder"
        new_diff = min(1.0, current_difficulty + DEFAULT_ADJUST_STEP)

    return LevelAdjustment(
        level_id=next_level_id or level_id,
        old_difficulty=current_difficulty,
        new_difficulty=new_diff,
        action=action,
        reason=(
            f"正确率 {user_correct_rate:.0%}，"
            f"阈值 [{DEFAULT_MIN_CORRECT_RATE:.0%}, {DEFAULT_MAX_CORRECT_RATE:.0%}]"
        ),
        recommended_question_ids=next_level_question_ids,
    )
