"""english-adaptive-agent — PETS-3 英语闯关自适应引擎入口.

两种调用模式：
  1. CLI:  python -m agent_english.main adjust <user_id> <section>
  2. 嵌入: from agent_english.main import adjust_section

自适应流程：
  用户答题记录 → 分析正确率 → 计算下一关难度 → 筛选题目 → 写回 Supabase
"""

import argparse

from deerflow.client import DeerFlowClient

from agent_english.adapters.supabase import SupabaseAdapter
from agent_english.analyzers.progress import analyze_progress
from agent_english.analyzers.difficulty import compute_question_difficulty, estimate_level_difficulty
from agent_english.strategies.level_adjuster import decide_adjustment
from agent_english.strategies.content_selector import select_questions


def adjust_section(
    *,
    user_id: str,
    section: str,
    db: SupabaseAdapter | None = None,
) -> list[dict]:
    """对一个 section 的所有关卡执行自适应调整。

    Args:
        user_id:  用户 ID
        section:  vocabulary | grammar | reading | exam
        db:       Supabase 适配器（可选，默认新建）

    Returns:
        每个关卡的调整结果列表 [{level_id, action, old_difficulty, new_difficulty, ...}]
    """
    db = db or SupabaseAdapter()

    # 1. 获取该 section 下所有关卡
    levels = db.fetch_levels_by_section(section)
    if not levels:
        print(f"[{section}] 无关卡数据")
        return []

    # 2. 拉取全量用户答题记录（用于计算题目难度）
    user_answers = db.fetch_user_answers(user_id)  # 不限定 level_id，获取所有
    all_difficulty = compute_question_difficulty(user_answers)

    results: list[dict] = []

    for i, level in enumerate(levels):
        level_id = level["id"]

        # 3. 获取该关卡的用户答题
        level_answers = [a for a in user_answers if a.get("level_id") == level_id]

        # 4. 分析用户在该关卡的表现
        progress = analyze_progress(
            level_answers,
            user_id=user_id,
            level_id=level_id,
            section=section,
        )

        # 5. 计算当前难度
        question_ids = [q["id"] for q in db.fetch_questions(level_id)]
        cur_difficulty = estimate_level_difficulty(all_difficulty, question_ids)

        # 6. 确定下一关
        next_level_id = levels[i + 1]["id"] if i + 1 < len(levels) else None
        next_question_ids = (
            [q["id"] for q in db.fetch_questions(next_level_id)]
            if next_level_id else []
        )

        # 7. 决策调整
        adjustment = decide_adjustment(
            level_id=level_id,
            current_difficulty=cur_difficulty,
            user_correct_rate=progress.correct_rate,
            next_level_id=next_level_id,
            next_level_question_ids=next_question_ids,
        )

        # 8. 如果有关卡要调整，写回 Supabase
        if next_level_id and adjustment.action != "keep":
            # 筛选推荐题目
            recommended = select_questions(
                all_question_ids=next_question_ids,
                question_difficulties=all_difficulty,
                prefer_difficulty=adjustment.new_difficulty,
            )

            db.update_level_adjustment(
                next_level_id,
                difficulty_override=adjustment.new_difficulty,
                question_pool=recommended,
            )

        results.append({
            "level_id": level_id,
            "action": adjustment.action,
            "old_difficulty": adjustment.old_difficulty,
            "new_difficulty": adjustment.new_difficulty,
            "correct_rate": progress.correct_rate,
            "reason": adjustment.reason,
        })

    return results


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="PETS-3 自适应引擎 — 根据答题数据调整关卡难度与内容"
    )
    sub = p.add_subparsers(dest="command", required=True)

    # adjust 命令
    cmd_adj = sub.add_parser("adjust", help="根据用户答题数据调整后续关卡")
    cmd_adj.add_argument("user_id", help="用户 ID")
    cmd_adj.add_argument("section", help="模块 (vocabulary|grammar|reading|exam)")
    cmd_adj.add_argument("--dry-run", action="store_true", help="仅分析不写回")

    # query 命令（调试用）
    cmd_q = sub.add_parser("query", help="查询用户答题摘要")
    cmd_q.add_argument("user_id", help="用户 ID")
    cmd_q.add_argument("level_id", nargs="?", help="关卡 ID（可选）")

    return p


def main():
    parser = _build_parser()
    args = parser.parse_args()

    db = SupabaseAdapter()

    if args.command == "adjust":
        results = adjust_section(user_id=args.user_id, section=args.section, db=db)
        for r in results:
            print(
                f"[{r['level_id']}] {r['action']:7s}  "
                f"正确率={r['correct_rate']:.0%}  "
                f"难度 {r['old_difficulty']:.2f} → {r['new_difficulty']:.2f}  "
                f"({r['reason']})"
            )

    elif args.command == "query":
        answers = db.fetch_user_answers(args.user_id, args.level_id)
        if not answers:
            print("无答题记录")
            return
        progress = analyze_progress(
            answers, user_id=args.user_id,
            level_id=args.level_id or "all",
            section="unknown",
        )
        print(f"用户: {args.user_id}")
        print(f"答题数: {progress.total_answers}")
        print(f"正确率: {progress.correct_rate:.0%}")
        print(f"平均耗时: {progress.avg_time_spent:.1f}s")
        print(f"弱项题: {len(progress.weak_question_ids)}")
        print(f"强项题: {len(progress.strong_question_ids)}")


if __name__ == "__main__":
    main()
