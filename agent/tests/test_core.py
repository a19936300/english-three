"""基础冒烟测试 — 验证各模块可 import 且核心逻辑正确."""

from agent_english.analyzers.progress import analyze_progress
from agent_english.analyzers.difficulty import compute_question_difficulty, estimate_level_difficulty
from agent_english.strategies.level_adjuster import decide_adjustment
from agent_english.strategies.content_selector import select_questions


def test_analyze_progress_empty():
    p = analyze_progress([], user_id="u1", level_id="vocab-1", section="vocabulary")
    assert p.total_answers == 0
    assert p.correct_rate == 0.0


def test_analyze_progress_with_data():
    answers = [
        {"question_id": "q1", "is_correct": True, "time_spent": 10},
        {"question_id": "q2", "is_correct": False, "time_spent": 20},
        {"question_id": "q3", "is_correct": True, "time_spent": 15},
    ]
    p = analyze_progress(answers, user_id="u1", level_id="vocab-1", section="vocabulary")
    assert p.total_answers == 3
    assert p.correct_count == 2
    assert abs(p.correct_rate - 2 / 3) < 0.01
    assert abs(p.avg_time_spent - 15) < 0.01
    assert p.weak_question_ids == ["q2"]
    assert set(p.strong_question_ids) == {"q1", "q3"}


def test_compute_question_difficulty():
    answers = [
        {"question_id": "q1", "is_correct": True},
        {"question_id": "q1", "is_correct": False},
        {"question_id": "q2", "is_correct": True},
        {"question_id": "q2", "is_correct": True},
    ]
    d = compute_question_difficulty(answers)
    assert abs(d["q1"] - 0.5) < 0.01   # 1/2 正确 → 难度 0.5
    assert abs(d["q2"] - 0.0) < 0.01   # 2/2 正确 → 难度 0


def test_estimate_level_difficulty():
    d = {"q1": 0.3, "q2": 0.7, "q3": 0.5}
    assert abs(estimate_level_difficulty(d, ["q1", "q2"]) - 0.5) < 0.01


def test_decide_adjustment_easier():
    adj = decide_adjustment(
        level_id="vocab-1", current_difficulty=0.5,
        user_correct_rate=0.3,  # 低于 0.6 → 降难度
        next_level_id="vocab-2",
    )
    assert adj.action == "easier"
    assert adj.new_difficulty < adj.old_difficulty


def test_decide_adjustment_harder():
    adj = decide_adjustment(
        level_id="vocab-1", current_difficulty=0.5,
        user_correct_rate=0.95,  # 高于 0.9 → 升难度
        next_level_id="vocab-2",
    )
    assert adj.action == "harder"
    assert adj.new_difficulty > adj.old_difficulty


def test_decide_adjustment_keep():
    adj = decide_adjustment(
        level_id="vocab-1", current_difficulty=0.5,
        user_correct_rate=0.75,  # 在 [0.6, 0.9] 区间 → 不变
        next_level_id="vocab-2",
    )
    assert adj.action == "keep"


def test_select_questions():
    all_ids = ["q1", "q2", "q3", "q4", "q5"]
    difficulties = {"q1": 0.2, "q2": 0.5, "q3": 0.8, "q4": 0.3, "q5": 0.6}
    selected = select_questions(
        all_question_ids=all_ids,
        question_difficulties=difficulties,
        prefer_difficulty=0.3,
        target_count=3,
    )
    assert len(selected) == 3
    # 最接近 0.3 的题优先
    assert selected[0] in ("q4", "q1")
